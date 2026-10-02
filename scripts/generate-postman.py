from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
def item(name, method, path, body=None, ai=False, tests=None):
    headers = [{'key': 'Content-Type', 'value': 'application/json'}]
    headers += [{'key': 'X-AI-SERVICE-KEY', 'value': '{{aiServiceKey}}'}] if ai else ([{'key': 'Authorization', 'value': 'Bearer {{accessToken}}'}] if path not in ['/api/auth/login', '/api/auth/refresh'] else [])
    request = {'method': method, 'header': headers, 'url': '{{baseUrl}}'+path}
    if body is not None: request['body'] = {'mode': 'raw', 'raw': json.dumps(body, indent=2)}
    result = {'name': name, 'request': request}
    if tests: result['event'] = [{'listen':'test','script':{'type':'text/javascript','exec':tests}}]
    return result

collection = {'info': {'name':'Pool Safety Monitoring','schema':'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},
 'variable': [{'key':k,'value':v} for k,v in {'baseUrl':'http://localhost:8080','username':'admin','password':'','aiServiceKey':'','accessToken':'','refreshToken':'','cameraId':'','incidentId':''}.items()], 'item':[
 item('Login','POST','/api/auth/login',{'username':'{{username}}','password':'{{password}}'},tests=['pm.test("Login succeeds", () => pm.response.to.have.status(200));','const s=pm.response.json(); pm.collectionVariables.set("accessToken",s.accessToken); pm.collectionVariables.set("refreshToken",s.refreshToken);']),
 item('Refresh','POST','/api/auth/refresh',{'refreshToken':'{{refreshToken}}'},tests=['const s=pm.response.json(); if(s.accessToken){pm.collectionVariables.set("accessToken",s.accessToken); pm.collectionVariables.set("refreshToken",s.refreshToken);}']),
 item('Me','GET','/api/auth/me'),
 item('List cameras','GET','/api/cameras?page=0&size=20'),
 item('Create camera','POST','/api/cameras',{'code':'CAM-POSTMAN','name':'Deep water','locationDescription':'North side','status':'ONLINE','monitoringEnabled':True},tests=['pm.test("Camera created", () => pm.response.to.have.status(201)); pm.collectionVariables.set("cameraId",pm.response.json().id);']),
 item('Update camera','PATCH','/api/cameras/{{cameraId}}',{'name':'Deep water - North'}),
 item('Create detection event','POST','/api/detection-events',{'cameraId':'{{cameraId}}','eventType':'DROWNING','confidence':0.94,'detectedAt':'{{$isoTimestamp}}','metadata':{'source':'postman'}},ai=True,tests=['pm.test("Detection created", () => pm.response.to.have.status(201)); pm.collectionVariables.set("incidentId",pm.response.json().incidentId);']),
 item('List incidents','GET','/api/incidents?page=0&size=20'),
 item('Acknowledge','PATCH','/api/incidents/{{incidentId}}/acknowledge'),
 item('Start handling','PATCH','/api/incidents/{{incidentId}}/start'),
 item('Resolve','PATCH','/api/incidents/{{incidentId}}/resolve',{'note':'Swimmer rescued safely'}),
 item('False alarm (use a NEW or ACKNOWLEDGED incident)','PATCH','/api/incidents/{{incidentId}}/false-alarm',{'note':'Confirmed normal swimming activity'}),
 item('Incident history','GET','/api/incidents/{{incidentId}}/history?page=0&size=20'),
 item('Notifications','GET','/api/notifications?page=0&size=20'),
 item('Unread count','GET','/api/notifications/unread-count'),
 item('Read all','PATCH','/api/notifications/read-all'),
 item('Dashboard','GET','/api/dashboard/summary'),
 item('Reports','GET','/api/dashboard/report?days=30'),
 item('Staff list','GET','/api/users/staff'),
 item('Logout','POST','/api/auth/logout',{'refreshToken':'{{refreshToken}}'})]}
target=root/'docs/PoolSafety.postman_collection.json';target.parent.mkdir(exist_ok=True);target.write_text(json.dumps(collection,indent=2)+'\n')
