import atexit
import json
import asyncio
import threading  # Import the threading module
import logging  # Import the logging module
import numpy as np
import zlib


from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from freenect2 import Device, FrameType

undistorted_depth1 = []
undistorted_depth2 = []
frames = {}
frames2 = {}
payload = []

logging.basicConfig(filename="server.log", level=logging.INFO)

app = FastAPI()
app.mount("/dist", StaticFiles(directory="dist"), name="dist")
logging.info("SErver running")

device = Device(serial=b'088079340147')
device2 = Device(serial=b'032351734147')


def process_depth(data2d, skip=2):
    return np.round(data2d[::skip, ::skip]).astype(int).flatten().tolist()


def compress_data(data):
    json_str = json.dumps(data)
    compressed = zlib.compress(json_str.encode('utf-8'))
    return compressed

def capture_frames():
    global undistorted_depth1
    global undistorted_depth2
    device.start()
    for i, (type_, frame) in enumerate(device):
        frames[type_] = frame
        logging.info("CAM1" + str(i))
        # Capture undistorted_depth and registered_color frames
        if FrameType.Depth in frames:
            # Process and store the frames as needed
            undistorted_depth1 = frames[FrameType.Depth]
        if i == 1:
            device.stop()
            break


    device2.start()
    for type_, frame in device2:
        frames2[type_] = frame
        logging.info("CAM2!!!!!!!!!!!!!")
        # Capture undistorted_depth and registered_color frames
        if FrameType.Depth in frames2:
            # Process and store the frames as needed
            undistorted_depth2 = frames2[FrameType.Depth]
        if i == 1:
            device2.stop()
            break
    # await asyncio.sleep(2)  # This sleep is to prevent the loop from being too busy
    print("stopping")


async def loop_capture_frames():
    while True:
        capture_frames()

def capture_frames_thread():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(loop_capture_frames())



# Start the frame capture loop in a separate thread
capture_thread = threading.Thread(target=capture_frames_thread)
# Allow the thread to be terminated when the main program exits
capture_thread.daemon = True
capture_thread.start()


@app.get("/")
async def read_root():
    # Return the HTML file
    return FileResponse("dist/index.html")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    logging.info("Attempting to accept WebSocket connection...")
    await websocket.accept()
    logging.info("WebSocket connection accepted.")

    try:
        while True:
            result = []
            for camera in [undistorted_depth2, undistorted_depth1]:
                try:
                    depth_array = camera.to_array()
                    depth_processed = process_depth(depth_array)
                    result.append(depth_processed)
                except Exception as e:
                    pass

            compressed = compress_data(result)
            await websocket.send_bytes(compressed)

    except WebSocketDisconnect:
        logging.info("WebSocket disconnected.")
    except Exception as e:
        logging.error(f"Error occurred: {e}")


def close_application():
    print("Shutting Down....")
    device.stop()
    device2.stop()
    print("Closing server")


atexit.register(close_application)


if __name__ == "__main__":
    print("starting server")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)