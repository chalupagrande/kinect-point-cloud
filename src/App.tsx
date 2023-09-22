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
  skip: 2,
  rotateSpeed: 1,
  clipBack: 4500,
  clipFront: 0,
  clipRight: 512,
  clipLeft: 0,
  compression: 2,
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


  function createHandleNumChange(optionsKey: PointCloudOption, updateFunc: React.Dispatch<React.SetStateAction<number>>){
    return (e: React.FormEvent<HTMLInputElement>) => {
      const value = parseFloat(e.currentTarget.value)
      pointCloudOptions[optionsKey] = value
      updateFunc(value)
    }
}
  return (
    <div>
      <form style={{position: 'absolute', color: 'black', right: 0}}>
        <div>
          <label htmlFor='pointSize'>Point Size:</label>
          <input id="pointSize" type="range" min="1" max="5" step="0.1" onChange={createHandleNumChange("pointSize", setPointSize)} value={pointSize}></input> {pointSize}
        </div>
        <div>
          <label htmlFor='compression'>Compression:</label>
          <input id="compression" type="range" min="1" max="5" step="1" onChange={createHandleNumChange("compression", setCompression)} value={compression}></input> {compression}
        </div>
        <div>
          <label htmlFor='skip'>Skip:</label>
          <input id="skip" type="range" min="1" max="5" onChange={createHandleNumChange("skip", setSkip)} value={skip}></input>{skip}
        </div>
        <div>
          <label htmlFor='rotateSpeed'>Rotate Speed:</label>
          <input id="rotateSpeed" type="range" min="0" max="100" onChange={createHandleNumChange("rotateSpeed", setRotateSpeed)} value={rotateSpeed}></input> {rotateSpeed}
        </div>
        <div>
          <label htmlFor='clipBack'>Clip Back:</label>
          <input id="clipBack" type="range" min="0" max="4500" onChange={createHandleNumChange("clipBack", setClipBack)} value={clipBack}></input> {clipBack}
        </div>
        <div>
          <label htmlFor='clipFront'>Clip Front:</label>
          <input id="clipFront" type="range" min="0" max="4500" onChange={createHandleNumChange("clipFront", setClipFront)} value={clipFront}></input> {clipFront}
        </div>
        <div>
          <label htmlFor='clipRight'>Clip Right:</label>
          <input id="clipRight" type="range" min="0" max="512" onChange={createHandleNumChange("clipRight", setClipRight)} value={clipRight}></input> {clipRight}
        </div>
        <div>
          <label htmlFor='clipLeft'>Clip Left:</label>
          <input id="clipLeft" type="range" min="0" max="512" onChange={createHandleNumChange("clipLeft", setClipLeft)} value={clipLeft}></input> {clipLeft}
        </div>
      </form>

      <Sketch sketch={PointCloudWS}/>
    </div>
  )
}

export default App
