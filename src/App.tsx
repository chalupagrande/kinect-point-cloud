import Sketch from './components/Sketch'
import PointCloudWS from './sketches/PointCloudWS'

function App() {
  return (
    <div>
      <Sketch sketch={PointCloudWS}/>
    </div>
  )
}

export default App
