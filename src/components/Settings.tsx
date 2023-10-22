import React, {useState, useRef, FormEvent} from 'react'

export const pointCloudOptions = {
  pointSize: 2,
  skip: 2,
  rotateSpeed: 0,
  bbWidth: 1000,
  bbHeight: 1000,
  bbDepth: 1000,
  depthAdjustment: -200,
  groupIndex: 1
}
export type PointCloudOption = keyof typeof pointCloudOptions


type SettingsProps = {
  canvas: HTMLCanvasElement | null;
}


export const Settings = ({canvas}: SettingsProps) => {
  const [showSettings, setShowSettings] = useState(true)
  const [pointSize, setPointSize] = useState(pointCloudOptions.pointSize)
  const [skip, setSkip] = useState(pointCloudOptions.skip)
  const [rotateSpeed, setRotateSpeed] = useState(pointCloudOptions.rotateSpeed)
  const [bbWidth, setBBWidth] = useState(pointCloudOptions.bbWidth)
  const [bbHeight, setBBHeight] = useState(pointCloudOptions.bbHeight)
  const [bbDepth, setBBDepth] = useState(pointCloudOptions.bbDepth)
  const [depthAdjustment, setDepthAdjustment] = useState(pointCloudOptions.depthAdjustment)
  const [groupIndex, setGroupIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  // const [videoData, setVideoData] = useState()

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);



  function createHandleNumChange(optionsKey: PointCloudOption, updateFunc: React.Dispatch<React.SetStateAction<number>>){
    return (e: React.FormEvent<HTMLInputElement>) => {
      const value = parseFloat(e.currentTarget.value)
      pointCloudOptions[optionsKey] = value
      updateFunc(value)
    }
  }

  const startRecording = () => {
    if(!canvas) return
    const stream = canvas.captureStream(30); // 30 fps
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      console.log((recordedChunksRef.current.length))
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style.display = 'none';
      a.href = url;
      a.download = 'canvas-recording.webm';
      a.click();
      window.URL.revokeObjectURL(url);
      recordedChunksRef.current = [];
    };

    mediaRecorder.start(50);
    setIsRecording(true);
    mediaRecorderRef.current = mediaRecorder;
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleButtonClick = (e:FormEvent) => {
    e.preventDefault()
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
      <div style={{position: 'absolute', color: 'black', right: 0, width: 200}}>
        <button onClick={()=> setShowSettings(!showSettings)}>{showSettings ? "Hide" : "Show"} Controls</button>
        { showSettings &&
          <form>
            <div>
              <label htmlFor='pointSize'>Point Size: {pointSize}</label><br/>
              <input id="pointSize" type="range" min="1" max="5" step="0.1" onChange={createHandleNumChange("pointSize", setPointSize)} value={pointSize}></input>
            </div>
            <div>
              <label htmlFor='skip'>Skip: {skip}</label><br/>
              <input id="skip" type="range" min="1" max="5" onChange={createHandleNumChange("skip", setSkip)} value={skip}></input>
            </div>
            <div>
              <label htmlFor='rotateSpeed'>Rotate Speed: {rotateSpeed}</label><br/>
              <input id="rotateSpeed" type="range" min="0" max="100" onChange={createHandleNumChange("rotateSpeed", setRotateSpeed)} value={rotateSpeed}></input>
            </div>
            <div>
              <label htmlFor='bbWidth'>bb Width: {bbWidth}</label><br/>
              <input id="bbWidth" type="range" min="0" max="1000" onChange={createHandleNumChange("bbWidth", setBBWidth)} value={bbWidth}></input>
            </div>
            <div>
              <label htmlFor='bbHeight'>bb Height: {bbHeight}</label><br/>
              <input id="bbHeight" type="range" min="0" max="1000" onChange={createHandleNumChange("bbHeight", setBBHeight)} value={bbHeight}></input>
            </div>
            <div>
              <label htmlFor='clipLeft'>bb Depth: {bbDepth}</label><br/>
              <input id="clipLeft" type="range" min="0" max="1000" onChange={createHandleNumChange("bbDepth", setBBDepth)} value={bbDepth}></input>
            </div>
            <div>
              <label htmlFor='depthAdjustment'>Origin:</label>{depthAdjustment}<br/>
              <input id="depthAdjustment" type="range" min="-1000" max="0" onChange={createHandleNumChange("depthAdjustment", setDepthAdjustment)} value={depthAdjustment}></input>
            </div>
            <div>
              <label htmlFor='groupIndex'>Group to Adjust:</label>{groupIndex}<br/>
              <select onChange={(e)=> {
                const value = parseInt(e.target.value)
                setGroupIndex(value)
                pointCloudOptions.groupIndex = value
              }}>
                <option value={0}>0</option>
                <option value={1}>1</option>
              </select>
            </div>
            <div>
              <button onClick={handleButtonClick}>{isRecording ? "stop":"record"}</button>
            </div>
          </form>
        }
      </div>
  )
}