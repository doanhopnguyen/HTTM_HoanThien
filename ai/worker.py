"""One isolated inference process per camera; backend owns source/model configuration."""
from __future__ import annotations

import argparse
from collections import deque
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
import subprocess
import sys
import threading
import time
from urllib.request import Request, urlopen

LOG = logging.getLogger("pool-ai")


def api(path, body=None):
    origin = os.environ.get("AI_BACKEND_URL", "http://localhost:8080").rstrip("/")
    headers = {"X-AI-SERVICE-KEY": os.environ["AI_SERVICE_KEY"]}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    with urlopen(Request(origin + path, data=data, headers=headers), timeout=15) as response:
        raw = response.read()
        return json.loads(raw) if raw else None


def report(camera_id, state, message, frames=0, detections=0):
    try:
        api("/api/ai/worker/status", dict(cameraId=camera_id, state=state,
            message=str(message)[:500], frames=frames, detections=detections))
    except Exception:
        LOG.warning("%s: cannot report worker status", camera_id)


def canonical_label(label):
    """Use class names, never assume that class 0/1 means drowning."""
    key = " ".join(str(label).lower().replace("_", " ").replace("-", " ").split())
    return "drown" if key in {"drown", "drowning"} else key


class AlertGate:
    def __init__(self, threshold, votes=8, window=15, cooldown=30):
        self.threshold, self.required, self.cooldown = threshold, votes, cooldown
        self.history = deque(maxlen=window)
        self.last_sent = float("-inf")

    def observe(self, scores, now):
        score = max(scores, default=0.0)
        self.history.append(score >= self.threshold)
        return score if score >= self.threshold and sum(self.history) >= self.required and now - self.last_sent >= self.cooldown else None

    def sent(self, now):
        self.last_sent = now


class UltralyticsDetector:
    def __init__(self, config):
        from ultralytics import YOLO
        checkpoint = config.get("modelPath") or str(Path(os.environ.get("AI_MODEL_DIRECTORY", ".runtime/ai-models")) / "yolo26n.pt")
        Path(checkpoint).parent.mkdir(parents=True, exist_ok=True)
        self.model = YOLO(checkpoint, task="detect")
        self.threshold = config["confidence"]
        self.device = os.environ.get("AI_DEVICE", "cpu")
        # Warm up before reporting RUNNING; catches incompatible custom architectures.
        import numpy as np
        self.model.predict(np.zeros((640, 640, 3), dtype=np.uint8), device=self.device, verbose=False)
        self.has_drown = any(canonical_label(label) == "drown" for label in self.model.names.values())

    def infer(self, frame, index):
        result = self.model.predict(frame, conf=self.threshold, device=self.device, verbose=False)[0]
        scores = []
        count = 0
        for box in result.boxes:
            count += 1
            if canonical_label(self.model.names[int(box.cls.item())]) == "drown":
                scores.append(float(box.conf.item()))
        return scores, count


class ReferenceDetector:
    """Reuse the trained architecture and recurrent state policy of the user's project."""
    def __init__(self, config):
        project = Path(os.environ.get("REFERENCE_PROJECT", "")).resolve()
        if not (project / "app/ai/detector.py").is_file():
            raise RuntimeError("Set REFERENCE_PROJECT to Desktop_Drowning_Detection")
        sys.path.insert(0, str(project))
        from app.ai.detector import RealtimeDetector
        self.detector = RealtimeDetector(config["modelPath"], device=os.environ.get("AI_DEVICE", "cpu"))
        self.detector.set_detection_score_threshold(config["confidence"])
        self.threshold = config["confidence"]
        self.ready = False

    def infer(self, frame, index):
        detections, _, warmed, alert = self.detector.infer(frame, index)
        self.ready = warmed
        # The reference detector already handles temporal sampling and warm-up.
        scores = [d.score for d in detections if canonical_label(d.label) == "drown"]
        if warmed and alert.alert:
            scores.append(max(alert.max_score, self.threshold))
        return scores if warmed else [], len(detections)


def run_camera(config):
    camera_id = config["id"]
    frames = total_detections = 0
    cap = None
    report(camera_id, "LOADING", "Loading checkpoint")
    loaded = threading.Event()
    def loading_heartbeat():
        while not loaded.wait(3):
            report(camera_id, "LOADING", "Loading checkpoint")
    heartbeat = threading.Thread(target=loading_heartbeat, daemon=True)
    heartbeat.start()
    try:
        import cv2
        detector = ReferenceDetector(config) if config["aiModel"] == "REFERENCE" else UltralyticsDetector(config)
        cap = cv2.VideoCapture(config["source"])
        if not cap.isOpened():
            raise RuntimeError("Cannot open camera/video source")
        loaded.set()
        heartbeat.join(timeout=16)
        fps = cap.get(cv2.CAP_PROP_FPS)
        if not 1 <= fps <= 240:
            fps = 25
        # Local videos follow their source timing, without discarding temporal samples.
        gate = AlertGate(config["confidence"])
        last_report = 0
        message = "Inference active"
        if isinstance(detector, UltralyticsDetector) and not detector.has_drown:
            message = "Object detection only; checkpoint has no drown/drowning label"
        while True:
            start = time.monotonic()
            ok, frame = cap.read()
            if not ok:
                if config["localVideo"]:
                    report(camera_id, "FINISHED", "Video ended; toggle monitoring to replay", frames, total_detections)
                    return
                raise RuntimeError("Camera stream disconnected")
            frames += 1
            scores, count = detector.infer(frame, frames - 1)
            total_detections += count
            now = time.monotonic()
            confidence = gate.observe(scores, now)
            if confidence is not None:
                try:
                    api("/api/detection-events", dict(cameraId=camera_id, eventType="DROWNING",
                        confidence=confidence, detectedAt=datetime.now(timezone.utc).isoformat(),
                        metadata=dict(aiModel=config["aiModel"], frame=frames, videoSeconds=cap.get(cv2.CAP_PROP_POS_MSEC) / 1000)))
                    gate.sent(now)
                except Exception:
                    # Back off after a failed delivery too; do not flood a stopped backend.
                    gate.sent(now)
                    LOG.exception("%s: could not deliver drowning alert", camera_id)
            if now - last_report >= 3:
                current_message = "Initializing temporal sequence" if isinstance(detector, ReferenceDetector) and not detector.ready else message
                report(camera_id, "RUNNING", current_message, frames, total_detections)
                last_report = now
            if config["localVideo"]:
                time.sleep(max(0, 1 / fps - (time.monotonic() - start)))
    except Exception as exc:
        LOG.exception("%s: inference failed", camera_id)
        report(camera_id, "ERROR", str(exc), frames, total_detections)
    finally:
        loaded.set()
        heartbeat.join(timeout=16)
        if cap is not None:
            cap.release()


def stop_child(camera_id, process):
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
    report(camera_id, "STOPPED", "Monitoring stopped or configuration changed")


def supervise():
    children = {}
    try:
        while True:
            try:
                configs = {c["id"]: c for c in api("/api/ai/worker/cameras")}
                for camera_id in list(children):
                    config, child = children[camera_id]
                    if camera_id not in configs or configs[camera_id] != config:
                        stop_child(camera_id, child)
                        del children[camera_id]
                for camera_id, config in configs.items():
                    if camera_id not in children:
                        child = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), "--child"],
                            stdin=subprocess.PIPE, text=True, encoding="utf-8")
                        child.stdin.write(json.dumps(config))
                        child.stdin.close()
                        children[camera_id] = (config, child)
                        LOG.info("Started %s (%s)", config["name"], config["aiModel"])
            except Exception:
                # Stop inference if the backend cannot confirm monitoring is still enabled.
                LOG.exception("Cannot synchronize camera configuration")
                for camera_id, (_, child) in children.items():
                    stop_child(camera_id, child)
                children.clear()
            time.sleep(3)
    except KeyboardInterrupt:
        pass
    finally:
        for camera_id, (_, child) in children.items():
            stop_child(camera_id, child)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser()
    parser.add_argument("--child", action="store_true")
    arguments = parser.parse_args()
    if arguments.child:
        run_camera(json.load(sys.stdin))
    else:
        supervise()
