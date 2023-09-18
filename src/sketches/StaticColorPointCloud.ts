import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import registered from '../assets/registered4.json'
import depth from '../assets/depth_rounded.json'

const opts = {
  canvasWidth: window.innerWidth,
  canvasHeight: window.innerHeight,
  skip: 1,
  maxDepth: 4000,
}

const width = 512
const height = 424

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
  let group: THREE.Group;

  function setup(canvas: HTMLCanvasElement) {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
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
    camera.position.x = 0
    camera.position.y = 0
    camera.position.z = 250
    createPointCloud(depth, registered)

    renderer.setSize(opts.canvasWidth, opts.canvasHeight)
  }

  function createPointCloud(pointsData: number[][], colorData: number[][][]) {
    if (pointsData) {
      const depthWidth = width
      const depthHeight = height
      const depthArray = pointsData
      const colorDataArray = colorData
      const points: number[] = []
      const colors: number[] = []
      const color = new THREE.Color()
      geometry = new THREE.BufferGeometry()
      let maxPP = 0
      for (let x = 0; x < depthWidth; x += opts.skip) {
        for (let y = 0; y < depthHeight; y += opts.skip) {
          const depthValue = depthArray[y][x]
          const colorValue = colorDataArray[y][x]
          if (depthValue > opts.maxDepth) {
            continue
          }

          color.setRGB(colorValue[0] / 255, colorValue[1] / 255, colorValue[2] / 255)

          colors.push(color.r, color.g, color.b)

          const pp = depthToPointCloudPos(x, y, depthValue / 10)
          maxPP = Math.max(maxPP, pp.z)
          points.push(pp.x, pp.y, pp.z)
        }
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3))
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      material = new THREE.PointsMaterial({ size: 2, vertexColors: true, sizeAttenuation: false });
      group = new THREE.Group()
      pointCloud = new THREE.Points(geometry, material)
      pointCloud.position.z = maxPP / 2 * -1
      group.add(pointCloud)
      group.rotateY(Math.PI)
      group.rotateZ(Math.PI)
      scene.add(group)
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
    // orbitControls.update()
    requestAnimationFrame(draw);
  }

  setup(canvas)
  window.addEventListener('resize', onWindowResize, false)
  draw()
}