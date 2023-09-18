import Sketch from './components/Sketch'
// import BasicSketch from './sketches/BasicSketch'
// import StaticColorPointCloudWithTweening from './sketches/StaticColorPointCloudWithTweening'
// import MultiKinectPointCloud from './sketches/MultiKinectPointCloud'
// import PointCloudWS from './sketches/PointCloudWS'
// import PointCloudFromFile from './sketches/PointCloudFromFile'
import StaticColorPointCloud from './sketches/StaticColorPointCloud'

function App() {

  return (
    <div>
      <Sketch sketch={StaticColorPointCloud} />
    </div>
  )
}

export default App
