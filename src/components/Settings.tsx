import React, {useEffect, useState} from 'react'
// import * as pako from 'pako';
import { loadPointCloudClip } from '../playback/PointCloudClip'
import { playbackState } from '../playback/playbackState'

export const pointCloudOptions = {
  pointSize: 2,
  skip: 2,
  rotateSpeed: 0,
  bbWidth: 1000,
  bbHeight: 1000,
  bbDepth: 1000,
  depthAdjustment: -200,
  groupIndex: 1,
  color: 0,
  numCameras: 1
}
export type PointCloudOption = keyof typeof pointCloudOptions

export const Settings = () => {
  const [showSettings, setShowSettings] = useState(true)
  const [pointSize, setPointSize] = useState(pointCloudOptions.pointSize)
  const [skip, setSkip] = useState(pointCloudOptions.skip)
  const [rotateSpeed, setRotateSpeed] = useState(pointCloudOptions.rotateSpeed)
  const [bbWidth, setBBWidth] = useState(pointCloudOptions.bbWidth)
  const [bbHeight, setBBHeight] = useState(pointCloudOptions.bbHeight)
  const [bbDepth, setBBDepth] = useState(pointCloudOptions.bbDepth)
  const [depthAdjustment, setDepthAdjustment] = useState(pointCloudOptions.depthAdjustment)
  const [groupIndex, setGroupIndex] = useState(0)
  const [color, setColor] = useState(pointCloudOptions.color)
  const [isRecording, setIsRecording] = useState(false)
  const [numCameras, setNumCameras] = useState(pointCloudOptions.numCameras)
  // color recording + playback, these need record_server.py
  const [isColorRecording, setIsColorRecording] = useState(false)
  const [recordFps, setRecordFps] = useState(15)
  const [recorderMessage, setRecorderMessage] = useState("")
  const [recordings, setRecordings] = useState<{name: string, bytes: number}[]>([])
  const [selectedRecording, setSelectedRecording] = useState("")
  const [isPlayback, setIsPlayback] = useState(false)
  const [useColor, setUseColor] = useState(playbackState.useColor)

  function createHandleNumChange(optionsKey: PointCloudOption, updateFunc: React.Dispatch<React.SetStateAction<number>>){
    return (e: React.FormEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = parseFloat(e.currentTarget.value)
      pointCloudOptions[optionsKey] = value
      updateFunc(value)
    }
  }

  async function handleRecording(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    const response = await fetch("/api", {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({action: "start"})
    })
    const result = await response.json()
    if(result.msg === "Recording") {
      setIsRecording(true)
    } else {
      setIsRecording(false)
    }
    console.log(result)
    // return result
  }

  async function inflate(){
    console.log("inflating")

  }

  function describeRecording(status: {name: string, frames: number, seconds: number, bytes: number}) {
    return `${status.name}: ${status.frames} frames, ${status.seconds}s, ${(status.bytes / 1000000).toFixed(1)}MB`
  }

  async function refreshRecordings(select?: string) {
    try {
      const response = await fetch("/recorder/list")
      if (!response.ok) {
        throw new Error(`${response.status}`)
      }
      const result = await response.json()
      setRecordings(result.recordings)
      setSelectedRecording(current => select || current || result.recordings[0]?.name || "")
    } catch (e) {
      setRecorderMessage("Not available. Run record_server.py instead of server.py")
    }
  }

  async function handleColorRecording() {
    try {
      const response = await fetch(isColorRecording ? "/recorder/stop" : "/recorder/start", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // the server trims the recording with the same settings that are trimming the live view
        body: JSON.stringify({
          skip: pointCloudOptions.skip,
          bbWidth: pointCloudOptions.bbWidth,
          bbHeight: pointCloudOptions.bbHeight,
          bbDepth: pointCloudOptions.bbDepth,
          depthAdjustment: pointCloudOptions.depthAdjustment,
          fps: recordFps,
        })
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.detail || `${response.status}`)
      }
      setIsColorRecording(result.recording)
      setRecorderMessage(result.error ? `Error: ${result.error}` : describeRecording(result))
      if (!result.recording) {
        refreshRecordings(result.name)
      }
    } catch (e) {
      setRecorderMessage(`Could not ${isColorRecording ? "stop" : "start"} recording: ${e}`)
    }
  }

  async function handlePlay() {
    try {
      setRecorderMessage(`Loading ${selectedRecording}`)
      const clip = await loadPointCloudClip(`/recordings/${selectedRecording}`)
      playbackState.clip?.dispose()
      playbackState.clip = clip
      setIsPlayback(true)
      setRecorderMessage(`Playing ${selectedRecording}: ${clip.frameCount} frames, ${clip.duration.toFixed(1)}s`)
    } catch (e) {
      setRecorderMessage(`Could not play ${selectedRecording}: ${e}`)
    }
  }

  function handleBackToLive() {
    playbackState.clip?.dispose()
    playbackState.clip = null
    setIsPlayback(false)
    setRecorderMessage("")
  }

  useEffect(() => {
    refreshRecordings()
  }, [])

  // show the progress of the recording
  useEffect(() => {
    if (!isColorRecording) {
      return
    }
    const interval = setInterval(async () => {
      try {
        const result = await (await fetch("/recorder/status")).json()
        if (result.error) {
          setRecorderMessage(`Error: ${result.error}`)
          setIsColorRecording(false)
        } else if (result.recording) {
          setRecorderMessage(describeRecording(result))
        }
      } catch (e) {
        console.log(e)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isColorRecording])


  return (
      <div style={{position: 'absolute', color: "#7b7b7b", right: 0, width: 200}}>
        <button onClick={()=> setShowSettings(!showSettings)}>{showSettings ? "Hide" : "Show"} Controls</button>
        { showSettings &&
          <form onSubmit={handleRecording}>
            <div>
              <label htmlFor='pointSize'>Num Cameras: {numCameras}</label><br/>
              <input id="pointSize" type="range" min={0} max={2} step={1} onChange={createHandleNumChange("numCameras", setNumCameras)} value={numCameras}></input>
            </div>
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
              <label htmlFor='bbDepth'>bb Depth: {bbDepth}</label><br/>
              <input id="bbDepth" type="range" min="0" max="1000" onChange={createHandleNumChange("bbDepth", setBBDepth)} value={bbDepth}></input>
            </div>
            <div>
              <label htmlFor='depthAdjustment'>Origin:</label>{depthAdjustment}<br/>
              <input id="depthAdjustment" type="range" min="-1000" max="0" onChange={createHandleNumChange("depthAdjustment", setDepthAdjustment)} value={depthAdjustment}></input>
            </div>
            <div>
              <label htmlFor='depthAdjustment'>Color:</label>{color}<br/>
              <select onChange={createHandleNumChange("color", setColor)}>
                <option value={0}>Black on White</option>
                <option value={1}>White on Black</option>
              </select>
            </div>
            <div>
              <button type="submit">{isRecording ? "Stop" : "Start"} Raw Recording (old)</button>
            </div>
            <div>
              <label htmlFor='recordFps'>Record FPS:</label><br/>
              <select id="recordFps" value={recordFps} disabled={isColorRecording} onChange={(e)=> setRecordFps(parseInt(e.target.value))}>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
              </select>
            </div>
            <div>
              <button type="button" onClick={handleColorRecording}>{isColorRecording ? "Stop" : "Start"} Color Recording</button>
            </div>
            <div>
              <label htmlFor='recordings'>Recordings:</label><br/>
              <select id="recordings" style={{maxWidth: 200}} value={selectedRecording} onChange={(e)=> setSelectedRecording(e.target.value)}>
                {recordings.map(recording => (
                  <option key={recording.name} value={recording.name}>{recording.name} ({(recording.bytes / 1000000).toFixed(1)}MB)</option>
                ))}
              </select>
            </div>
            <div>
              <button type="button" disabled={!selectedRecording} onClick={handlePlay}>Play</button>
              <button type="button" disabled={!isPlayback} onClick={handleBackToLive}>Back to Live</button>
            </div>
            <div>
              <label htmlFor='useColor'>Use recorded color</label>
              <input id="useColor" type="checkbox" checked={useColor} onChange={(e)=> {
                playbackState.useColor = e.target.checked
                setUseColor(e.target.checked)
              }}></input>
            </div>
            <div>
              <p>{recorderMessage}</p>
            </div>
            <div>
              <p onClick={inflate}>inflate</p>
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
          </form>
        }
      </div>
  )
}