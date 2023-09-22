import atexit
import json
import asyncio
import threading  # Import the threading module
import logging  # Import the logging module

import zlib
import os


from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from freenect2 import Device, FrameType

frames = {}
undistorted_depth = []
registered_color = []
payload = []

logging.basicConfig(filename="server.log", level=logging.INFO)

app = FastAPI()
app.mount("/dist", StaticFiles(directory="dist"), name="dist")
logging.info("SErver running")

device = Device()


def process_list(data):
    return [round(x) for idx, x in enumerate(data) if idx % 2 == 0]
    # return [round(x) for x in data]


def compress_data(data):
    json_str = json.dumps(data)
    compressed = zlib.compress(json_str.encode('utf-8'))
    return compressed


async def capture_frames():
    global registered_color
    global undistorted_depth
    global payload
    with device.running():
        for type_, frame in device:
            frames[type_] = frame
            # Capture undistorted_depth and registered_color frames
            if FrameType.Depth in frames and FrameType.Color in frames:
                # Process and store the frames as needed
                undistorted_depth = frames[FrameType.Depth]
        await asyncio.sleep(0.01)  # This sleep is to prevent the loop from being too busy



def capture_frames_thread():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(capture_frames())


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
            depth_array = undistorted_depth.to_array()
            depth_flattened = depth_array.flatten().tolist()
            depth_processed = process_list(depth_flattened)
            compressed = compress_data(depth_processed)
            payload = compressed

            await websocket.send_bytes(payload)
    except WebSocketDisconnect:
        logging.info("WebSocket disconnected.")
    except Exception as e:
        logging.error(f"Error occurred: {e}")


def close_application():
    print("Shutting Down....")
    device.stop()
    print("Closing server")


atexit.register(close_application)


if __name__ == "__main__":
    print("starting server")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)