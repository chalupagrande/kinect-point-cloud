import Sketch from './components/Sketch'
import PointCloudWS from './sketches/PointCloudWS'
import {Settings} from './components/Settings'

function App() {
  return (
    <div>
      <Settings/>
      <Sketch sketch={PointCloudWS}/>
    </div>
  )
}

export default App
