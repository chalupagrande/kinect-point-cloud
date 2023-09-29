import { useState } from 'react'
import Sketch from './components/Sketch'
// import BasicSketch from './sketches/BasicSketch'
// import StaticColorPointCloudWithTweening from './sketches/StaticColorPointCloudWithTweening'
// import MultiKinectPointCloud from './sketches/MultiKinectPointCloud'
import PointCloudWS from './sketches/PointCloudWS'
// import MultiKinectPointCloud from './sketches/MultiKinectPointCloud'
// import PointCloudFromFile from './sketches/PointCloudFromFile'
// import StaticColorPointCloud from './sketches/StaticColorPointCloud'


export const pointCloudOptions = {
  pointSize: 2,
  skip: 1,
  rotateSpeed: 0,
  clipBack: 4500,
  clipFront: 0,
  clipRight: 512,
  clipLeft: 0,
  compression: 2,
  depthAdjustment: -200
}

type PointCloudOption = keyof typeof pointCloudOptions


function App() {
  const [pointSize, setPointSize] = useState(pointCloudOptions.pointSize)
  const [skip, setSkip] = useState(pointCloudOptions.skip)
  const [rotateSpeed, setRotateSpeed] = useState(pointCloudOptions.rotateSpeed)
  const [clipBack, setClipBack] = useState(pointCloudOptions.clipBack)
  const [clipFront, setClipFront] = useState(pointCloudOptions.clipFront)
  const [clipRight, setClipRight] = useState(pointCloudOptions.clipRight)
  const [clipLeft, setClipLeft] = useState(pointCloudOptions.clipLeft)
  const [compression, setCompression] = useState(pointCloudOptions.compression)
  const [depthAdjustment, setDepthAdjustment] = useState(pointCloudOptions.depthAdjustment)


  function createHandleNumChange(optionsKey: PointCloudOption, updateFunc: React.Dispatch<React.SetStateAction<number>>){
    return (e: React.FormEvent<HTMLInputElement>) => {
      const value = parseFloat(e.currentTarget.value)
      pointCloudOptions[optionsKey] = value
      updateFunc(value)
    }
}
  return (
    <div>
      <form style={{position: 'absolute', color: 'black', right: 0, width: 200}}>
        <div>
          <label htmlFor='pointSize'>Point Size: {pointSize}</label><br/>
          <input id="pointSize" type="range" min="1" max="5" step="0.1" onChange={createHandleNumChange("pointSize", setPointSize)} value={pointSize}></input>
        </div>
        <div>
          <label htmlFor='compression'>Compression: {compression}</label><br/>
          <input id="compression" type="range" min="1" max="5" step="1" onChange={createHandleNumChange("compression", setCompression)} value={compression}></input>
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
          <label htmlFor='clipBack'>Clip Back: {clipBack}</label><br/>
          <input id="clipBack" type="range" min="0" max="4500" onChange={createHandleNumChange("clipBack", setClipBack)} value={clipBack}></input>
        </div>
        <div>
          <label htmlFor='clipFront'>Clip Front: {clipFront}</label><br/>
          <input id="clipFront" type="range" min="0" max="4500" onChange={createHandleNumChange("clipFront", setClipFront)} value={clipFront}></input>
        </div>
        <div>
          <label htmlFor='clipRight'>Clip Right: {clipRight}</label><br/>
          <input id="clipRight" type="range" min="0" max="512" onChange={createHandleNumChange("clipRight", setClipRight)} value={clipRight}></input>
        </div>
        <div>
          <label htmlFor='clipLeft'>Clip Left: {clipLeft}</label><br/>
          <input id="clipLeft" type="range" min="0" max="512" onChange={createHandleNumChange("clipLeft", setClipLeft)} value={clipLeft}></input>
        </div>
        <div>
          <label htmlFor='depthAdjustment'>Origin:</label>{depthAdjustment}<br/>
          <input id="depthAdjustment" type="range" min="-1000" max="0" onChange={createHandleNumChange("depthAdjustment", setDepthAdjustment)} value={depthAdjustment}></input>
        </div>
      </form>

      <Sketch sketch={PointCloudWS}/>
    </div>
  )
}

export default App
