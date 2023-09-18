import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import pointsData from '../assets/pointsData.json'

const opts = {
  canvasWidth: window.innerWidth,
  canvasHeight: window.innerHeight,
  skip: 3,
  maxDepth: 4000,
}

type PointsData = {
  depth: number[],
  color: number[],
  width: number,
  height: number,
}

//camera information based on the Kinect v2 hardware
const CameraParams = {
  cx: 254.878,
  cy: 205.395,
  fx: 365.456,
  fy: 365.456,
  k1: 0.0905474,
  k2: -0.26819,
  k3: 0.0950862,
  p1: 0.0,
  p2: 0.0,
}

//calculte the xyz camera position based on the depth data
export function depthToPointCloudPos(x: number, y: number, depthValue: number) {
  const point = new THREE.Vector3()
  point.z = depthValue // / (1.0f); // Convert from mm to meters
  point.x = ((x - CameraParams.cx) * point.z) / CameraParams.fx
  point.y = ((y - CameraParams.cy) * point.z) / CameraParams.fy
  return point
}



export default function PointCloud(canvas: HTMLCanvasElement) {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let orbitControls: OrbitControls;
  let geometry: THREE.BufferGeometry
  let material: THREE.PointsMaterial
  let pointCloud: THREE.Points


  function setup(canvas: HTMLCanvasElement) {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    // camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100)
    camera = new THREE.PerspectiveCamera(75, opts.canvasWidth / opts.canvasHeight, 0.1, 1000)
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      // alpha: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(opts.canvasWidth, opts.canvasHeight)

    // controls
    orbitControls = new OrbitControls(camera, renderer.domElement)
    orbitControls.update()

    //camera
    camera.position.x = -60
    camera.position.y = 20
    camera.position.z = -225
    const toLookAt = createPointCloud(pointsData)
    if (toLookAt) {
      camera.lookAt(toLookAt.position)
    }

    renderer.setSize(opts.canvasWidth, opts.canvasHeight)
  }

  function createPointCloud(pointsData?: PointsData) {
    if (pointsData) {
      const depthWidth = pointsData.width
      const depthHeight = pointsData.height
      const depthArray = pointsData.depth
      console.log(depthWidth)
      const points: number[] = []
      geometry = new THREE.BufferGeometry()
      material = new THREE.PointsMaterial({
        size: 2,
        color: new THREE.Color('black'),
        sizeAttenuation: false,
      })
      let maxPP = 0
      for (let x = 0; x < depthWidth; x += opts.skip) {
        for (let y = 0; y < depthHeight; y += opts.skip) {
          const offset = x + y * depthWidth
          const depthValue = depthArray[offset]
          if (depthValue > opts.maxDepth) {
            continue
          }
          const pp = depthToPointCloudPos(x, y, depthValue / 10)
          maxPP = Math.max(maxPP, pp.z)
          points.push(pp.x, pp.y, pp.z)
        }
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3))
      pointCloud = new THREE.Points(geometry, material)
      scene.add(pointCloud)
      pointCloud.position.z = maxPP / 2 * -1
      console.log("MAX Z", maxPP)
      return pointCloud
      // not sure why this is throwing error
      // geometry.verticesNeedUpdate = true
    }
  }

  function onWindowResize() {
    opts.canvasWidth = window.innerWidth
    opts.canvasHeight = window.innerHeight
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  function draw() {
    renderer.render(scene, camera);
    orbitControls.update()
    requestAnimationFrame(draw);
  }

  setup(canvas)
  window.addEventListener('resize', onWindowResize, false)
  draw()
}