"""
Recording server. Run this INSTEAD of server.py when you want to record:

    python record_server.py

It serves the same live depth stream as server.py (same /ws format, same port),
and adds a recorder that writes trimmed depth + color frames to
recordings/<timestamp>.kpc. See the README for the file format.
"""
import atexit
import gzip
import json
import asyncio
import os
import struct
import threading
import time
import logging
import numpy as np
import zlib
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from freenect2 import Device, FrameFormat, FrameType


KINECT_SERIAL = b'088079340147'
RECORDINGS_DIR = "recordings"

# These need to match the client (src/sketches/PointCloudWS.ts and src/assets/cameraParams.ts)
# so that the bounding box trims the same points that it trims on screen.
SERVER_SKIP = 2  # `opts.compression` in PointCloudWS.ts
DEPTH_SCALE = 15  # PointCloudWS.ts divides the depth by 15 before unprojecting
CX = 254.878
CY = 205.395
FX = 365.456
FY = 365.456

# .kpc file format
KPC_MAGIC = b"KPC1"
KPC_VERSION = 1
KPC_FLAG_COLOR = 1
KPC_UNITS_PER_METER = 1000.0  # positions are stored in millimeters
GZIP_LEVEL = 4  # higher is smaller but slower, and this runs while the camera is capturing

logging.basicConfig(filename="server.log", level=logging.INFO)

os.makedirs(RECORDINGS_DIR, exist_ok=True)

app = FastAPI()
app.mount("/dist", StaticFiles(directory="dist"), name="dist")
app.mount("/recordings", StaticFiles(directory=RECORDINGS_DIR), name="recordings")
logging.info("Record server running")

device = None
# (color frame, depth frame). Replaced as a whole so readers always get a matching pair.
latest_frames = None

# the old raw recorder from server.py (the /api endpoint)
is_recording = False
output_file = None


class RecordSettings(BaseModel):
    skip: int = 2
    bbWidth: float = 1000
    bbHeight: float = 1000
    bbDepth: float = 1000
    depthAdjustment: float = -200
    fps: int = 15


def process_depth(data2d, skip=SERVER_SKIP):
    return np.round(data2d[::skip, ::skip]).astype(int).flatten().tolist()


def compress_data(data):
    json_str = json.dumps(data)
    compressed = zlib.compress(json_str.encode('utf-8'))
    return compressed


def filter_frame(depth_mm, color, color_is_bgr, settings):
    """
    Turns one depth + registered color frame into the points that the client would draw
    with these settings.

    depth_mm: (424, 512) float array of millimeters
    color: (424, 512, 4) uint8 array, registered onto the depth frame
    returns (positions, colors): int16 (N, 3) millimeters and uint8 (N, 3) RGB
    """
    stride = SERVER_SKIP * max(1, int(settings.skip))
    depth = np.round(depth_mm[::stride, ::stride])
    rows, cols = np.mgrid[0:depth_mm.shape[0]:stride, 0:depth_mm.shape[1]:stride]

    # same math as depthToPointCloudPos + isInBoundingBox in PointCloudWS.ts
    z = depth / DEPTH_SCALE
    x = (cols - CX) * z / FX
    y = (rows - CY) * z / FY
    keep = (
        np.isfinite(depth)
        & (depth > 0)  # 0 means the camera has no reading for this pixel
        & (np.abs(x) <= settings.bbWidth / 2)
        & (np.abs(y) <= settings.bbHeight / 2)
        & (np.abs(z) <= settings.bbDepth / 2)
    )

    # Back to millimeters, with the "Origin" slider and the flip that the client applies
    # to the group (rotateY(PI) + rotateZ(PI)) baked in, so the recording is upright.
    positions = np.stack([
        x[keep] * DEPTH_SCALE,
        -y[keep] * DEPTH_SCALE,
        -(z[keep] + settings.depthAdjustment) * DEPTH_SCALE,
    ], axis=1)
    positions = np.clip(np.round(positions), -32768, 32767).astype("<i2")

    channels = [2, 1, 0] if color_is_bgr else [0, 1, 2]
    colors = color[::stride, ::stride][keep][:, channels].astype(np.uint8)
    return positions, colors


def write_header(f, fps):
    f.write(struct.pack("<4sBBHfI", KPC_MAGIC, KPC_VERSION, KPC_FLAG_COLOR, fps, KPC_UNITS_PER_METER, 0))


def write_frame(f, time_ms, positions, colors):
    count = len(positions)
    f.write(struct.pack("<II", time_ms, count))
    f.write(positions.tobytes())
    f.write(colors.tobytes())
    # pad to 4 bytes so the player can read the frames in place
    f.write(b"\0" * (-(count * 9) % 4))


class Recorder:
    def __init__(self):
        self.thread = None
        self.stop_event = threading.Event()
        self.name = None
        self.frames = 0
        self.seconds = 0.0
        self.error = None

    @property
    def is_recording(self):
        return self.thread is not None and self.thread.is_alive()

    def path(self):
        return os.path.join(RECORDINGS_DIR, self.name)

    def start(self, settings):
        self.name = time.strftime("%Y%m%d-%H%M%S") + ".kpc"
        self.frames = 0
        self.seconds = 0.0
        self.error = None
        self.stop_event.clear()
        self.thread = threading.Thread(target=self.run, args=(settings,))
        self.thread.daemon = True
        self.thread.start()
        logging.info(f"~~~~~~START COLOR RECORDING {self.name} {settings}")

    def stop(self):
        self.stop_event.set()
        if self.thread:
            self.thread.join()
            self.thread = None
        logging.info(f"~~~~~~STOP COLOR RECORDING {self.name} frames: {self.frames}")
        return self.status()

    def status(self):
        size = 0
        if self.name and os.path.exists(self.path()):
            size = os.path.getsize(self.path())
        return {
            "recording": self.is_recording,
            "name": self.name,
            "frames": self.frames,
            "seconds": round(self.seconds, 2),
            "bytes": size,
            "error": self.error,
        }

    def run(self, settings):
        fps = min(max(int(settings.fps), 1), 30)
        interval = 1 / fps
        last_sequence = None
        start = None
        try:
            with gzip.open(self.path(), "wb", compresslevel=GZIP_LEVEL) as f:
                write_header(f, fps)
                next_tick = time.monotonic()
                while not self.stop_event.is_set():
                    pair = latest_frames
                    if pair is not None and pair[1].sequence != last_sequence:
                        color, depth = pair
                        last_sequence = depth.sequence
                        now = time.monotonic()
                        if start is None:
                            start = now
                        undistorted, registered = device.registration.apply(color, depth)
                        positions, colors = filter_frame(
                            undistorted.to_array(),
                            registered.to_array(),
                            registered.format is FrameFormat.BGRX,
                            settings,
                        )
                        write_frame(f, int((now - start) * 1000), positions, colors)
                        self.frames += 1
                        self.seconds = now - start
                    next_tick = max(next_tick + interval, time.monotonic())
                    self.stop_event.wait(next_tick - time.monotonic())
        except Exception as e:
            self.error = str(e)
            logging.exception("Color recording failed")


recorder = Recorder()


def capture_frames():
    global latest_frames
    color = None
    with device.running():
        for type_, frame in device:
            # Keep this loop as light as possible. The freenect2 queue only holds 16 frames.
            if type_ is FrameType.Color:
                color = frame
            elif type_ is FrameType.Depth and color is not None:
                latest_frames = (color, frame)


@app.get("/")
async def read_root():
    # Return the HTML file
    return FileResponse("dist/index.html")


@app.post("/api")
async def handle():
    # The old raw recorder, same as server.py
    global is_recording, output_file
    if is_recording:
        is_recording = False
        logging.info("~~~~~~STOP RECORDING")
        if output_file:
            output_file.close()
            output_file = None
        return {"msg": "stopped"}
    else:
        logging.info("~~~~~~START RECORDING")
        is_recording = True
        output_file = open("kinect_data.zlib", "ab")  # Open a file in append binary mode
        return {"msg": "Recording"}


@app.post("/recorder/start")
def recorder_start(settings: RecordSettings):
    if recorder.is_recording:
        raise HTTPException(status_code=409, detail="Already recording")
    if latest_frames is None:
        raise HTTPException(status_code=503, detail="No frames from the camera yet")
    recorder.start(settings)
    return recorder.status()


@app.post("/recorder/stop")
def recorder_stop():
    return recorder.stop()


@app.get("/recorder/status")
def recorder_status():
    return recorder.status()


@app.get("/recorder/list")
def recorder_list():
    names = sorted((n for n in os.listdir(RECORDINGS_DIR) if n.endswith(".kpc")), reverse=True)
    if recorder.is_recording:
        names = [n for n in names if n != recorder.name]
    return {"recordings": [{"name": n, "bytes": os.path.getsize(os.path.join(RECORDINGS_DIR, n))} for n in names]}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global is_recording, output_file
    logging.info("Attempting to accept WebSocket connection...")
    await websocket.accept()
    logging.info("WebSocket connection accepted.")

    try:
        while True:
            await asyncio.sleep(0.1)
            pair = latest_frames
            if pair is None:
                continue
            result = [process_depth(pair[1].to_array())]

            compressed = compress_data(result)
            await websocket.send_bytes(compressed)

            # If recording, append the compressed data to the file
            if is_recording and output_file:
                output_file.write(compressed)
                output_file.flush()  # Ensure data is written to disk

    except WebSocketDisconnect:
        logging.info("WebSocket disconnected.")
    except Exception as e:
        logging.error(f"Error occurred: {e}")


def close_application():
    print("Shutting Down....")
    if recorder.is_recording:
        recorder.stop()
    device.stop()
    print("Closing server")


if __name__ == "__main__":
    print("starting record server")
    device = Device(serial=KINECT_SERIAL)
    atexit.register(close_application)

    capture_thread = threading.Thread(target=capture_frames)
    # Allow the thread to be terminated when the main program exits
    capture_thread.daemon = True
    capture_thread.start()

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
