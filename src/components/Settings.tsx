import React, {useState} from 'react'

export const pointCloudOptions = {
  pointSize: 2,
  skip: 1,
  rotateSpeed: 0,
  bbWidth: 1000,
  bbHeight: 1000,
  bbDepth: 1000,
  depthAdjustment: -200
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

  function createHandleNumChange(optionsKey: PointCloudOption, updateFunc: React.Dispatch<React.SetStateAction<number>>){
    return (e: React.FormEvent<HTMLInputElement>) => {
      const value = parseFloat(e.currentTarget.value)
      pointCloudOptions[optionsKey] = value
      updateFunc(value)
    }
  }

  return (
      <div style={{position: 'absolute', color: 'black', right: 0, width: 200}}>
        <button onClick={()=> setShowSettings(!showSettings)}>{showSettings ? "Hide" : "Show"} Controls</button>
        { showSettings &&
          <form >
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
          </form>
        }
      </div>
  )
}