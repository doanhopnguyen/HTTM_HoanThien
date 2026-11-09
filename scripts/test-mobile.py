"""Native Android acceptance flow against a local development backend (adb required)."""
import argparse
import json
import re
import shlex
import subprocess
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--serial', default='emulator-5556')
parser.add_argument('--backend', default='http://localhost:8080')
parser.add_argument('--apk')
args = parser.parse_args()
settings = dict(line.split('=', 1) for line in (ROOT / '.env').read_text().splitlines() if re.match(r'^[A-Z_]+=', line))
artifact_dir = ROOT / '.runtime'
artifact_dir.mkdir(exist_ok=True)

def adb(*parts, check=True):
    result = subprocess.run(['adb', '-s', args.serial, *parts], capture_output=True, check=check)
    return result.stdout

def request(method, path, body=None, token=None, ai=False):
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    if ai: headers['X-AI-SERVICE-KEY'] = settings['AI_SERVICE_KEY']
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(args.backend + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=15) as response:
        value = response.read()
        return json.loads(value) if value else None

def hierarchy():
    adb('shell', 'uiautomator', 'dump', '/sdcard/pool-safety-ui.xml')
    return ET.fromstring(adb('exec-out', 'cat', '/sdcard/pool-safety-ui.xml').decode())

def node(label, timeout=35):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            nodes = hierarchy().iter('node')
            found = next((n for n in nodes if n.get('text') == label or n.get('content-desc') == label or n.get('content-desc', '').startswith(label + ', tab')), None)
            if found is not None: return found
        except (subprocess.CalledProcessError, ET.ParseError): pass
        time.sleep(1)
    raise AssertionError('Native UI element not found: ' + label)

def tap(label):
    found = node(label)
    coords = [int(value) for value in re.findall(r'\d+', found.get('bounds', ''))]
    adb('shell', 'input', 'tap', str((coords[0] + coords[2]) // 2), str((coords[1] + coords[3]) // 2))

def type_text(label, value):
    tap(label)
    adb('shell', 'input', 'text', shlex.quote(value.replace(' ', '%s')))

def screenshot(name):
    (artifact_dir / name).write_bytes(adb('exec-out', 'screencap', '-p'))

if args.apk: adb('install', '-r', str(Path(args.apk).resolve()))
adb('shell', 'pm', 'clear', 'com.poolsafety.mobile')
adb('shell', 'monkey', '-p', 'com.poolsafety.mobile', '-c', 'android.intent.category.LAUNCHER', '1')
print('Testing native staff login', flush=True)
type_text('Username', 'staff1')
type_text('Password', settings['DEV_PASSWORD'])
adb('shell', 'input', 'keyevent', '4')
tap('Login')
node('ACTIVE ALERTS')
screenshot('mobile-home.png')

admin = request('POST', '/api/auth/login', {'username': 'admin', 'password': settings['DEV_PASSWORD']})
camera = request('POST', '/api/cameras', {'code': 'MOBILE-' + str(int(time.time())), 'name': 'Android E2E Camera', 'locationDescription': 'Native acceptance test', 'status': 'ONLINE', 'monitoringEnabled': True}, admin['accessToken'])
created = request('POST', '/api/detection-events', {'cameraId': camera['id'], 'eventType': 'DROWNING', 'confidence': .94, 'detectedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() - 1))}, ai=True)
print('Testing realtime alert and incident handling', flush=True)
node('DROWNING alert · Android E2E Camera')
tap('DROWNING alert · Android E2E Camera')
tap('Acknowledge')
tap('Confirm')
node('ACKNOWLEDGED')
tap('Start handling')
tap('Confirm')
node('IN PROGRESS')
tap('Resolve')
type_text('Resolution note', 'Native Android swimmer rescued')
adb('shell', 'input', 'keyevent', '4')
tap('Confirm')
node('RESOLVED')
screenshot('mobile-incident.png')
incident = request('GET', '/api/incidents/' + created['incidentId'], token=admin['accessToken'])
assert incident['status'] == 'RESOLVED'
assert incident['handledBy']['username'] == 'staff1'
timeline = request('GET', '/api/incidents/' + created['incidentId'] + '/history', token=admin['accessToken'])
assert timeline['totalElements'] == 4
adb('shell', 'input', 'keyevent', '4')
tap('Profile')
tap('Sign out')
node('Username')
print('Native Android acceptance passed: login, realtime, acknowledge, start, resolve, timeline, logout', flush=True)
