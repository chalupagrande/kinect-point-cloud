console.log("importing websocket connection")
const wsc = new WebSocket('ws://localhost:8000/ws')
wsc.binaryType = "arraybuffer";
export default wsc