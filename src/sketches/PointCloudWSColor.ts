// import * as THREE from 'three'
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
// import defaultPointsData from '../assets/registered4.json'

// const opts = {
//     canvasWidth: window.innerWidth,
//     canvasHeight: window.innerHeight,
//     skip: 3,
//     maxDepth: 4000,
//     scaleDivisor: 10,
// }

// type PointsData = {
//     depth: number[],
//     color: number[],
//     width: number,
//     height: number,
// }

// // const width = 512
// // const height = 424


// let pointsData: PointsData = { defaultPointsData } as PointsData

// //camera information based on the Kinect v2 hardware
// const CameraParams = {
//     cx: 254.878,
//     cy: 205.395,
//     fx: 365.456,
//     fy: 365.456,
//     k1: 0.0905474,
//     k2: -0.26819,
//     k3: 0.0950862,
//     p1: 0.0,
//     p2: 0.0,
// }

// //calculte the xyz camera position based on the depth data
// export function depthToPointCloudPos(x: number, y: number, depthValue: number) {
//     const point = new THREE.Vector3()
//     point.z = depthValue // / (1.0f); // Convert from mm to meters
//     point.x = ((x - CameraParams.cx) * point.z) / CameraParams.fx
//     point.y = ((y - CameraParams.cy) * point.z) / CameraParams.fy
//     return point
// }


// export default function PointCloud(canvas: HTMLCanvasElement) {
//     let scene: THREE.Scene;
//     let camera: THREE.PerspectiveCamera;
//     let renderer: THREE.WebGLRenderer;
//     let orbitControls: OrbitControls;
//     let geometry: THREE.BufferGeometry
//     let material: THREE.PointsMaterial
//     let pointCloud: THREE.Points
//     let group: THREE.Group


//     const wsc = new WebSocket('ws://192.168.86.159:8080', ['client'])

//     wsc.addEventListener('message', (msg) => {
//         const data = atob(msg.data)
//         pointsData = JSON.parse(data)
//     })

//     wsc.addEventListener('close', () => {
//         console.log("CLOSED")
//     })

//     function setup(canvas: HTMLCanvasElement) {
//         scene = new THREE.Scene()
//         scene.background = new THREE.Color(0xffffff)
//         // camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100)
//         camera = new THREE.PerspectiveCamera(75, opts.canvasWidth / opts.canvasHeight, 0.1, 1000)
//         renderer = new THREE.WebGLRenderer({
//             canvas: canvas,
//             // alpha: true,
//         })
//         renderer.setPixelRatio(window.devicePixelRatio)
//         renderer.setSize(opts.canvasWidth, opts.canvasHeight)

//         // controls
//         orbitControls = new OrbitControls(camera, renderer.domElement)
//         // orbitControls.enableDamping = true
//         orbitControls.zoomSpeed = 0.5
//         orbitControls.update()


//         //camera
//         camera.position.x = 0
//         camera.position.y = 0
//         camera.position.z = 250
//         createPointCloud(pointsData)
//         // if (toLookAt) {
//         //   camera.lookAt(toLookAt.position)
//         // }
//         // orbitControls.target = pointCloud.position

//         const axesHelper = new THREE.AxesHelper(55);
//         scene.add(axesHelper);



//         renderer.setSize(opts.canvasWidth, opts.canvasHeight)
//     }

//     function createPointCloud(pointsData?: PointsData) {
//         if (pointsData) {
//             const depthWidth = pointsData.width
//             const depthHeight = pointsData.height
//             const depthArray = pointsData.depth
//             const colorArray = pointsData.color
//             const points: number[] = []
//             geometry = new THREE.BufferGeometry()

//             let maxPP = 0
//             for (let x = 0; x < depthWidth; x += opts.skip) {
//                 for (let y = 0; y < depthHeight; y += opts.skip) {
//                     const depthOffset = x + y * depthWidth // depthOffset
//                     const depthValue = depthArray[depthOffset]
//                     const co = x * depthWidth + y // colorOffset
//                     const colorValue = new THREE.Color(`rgb(${colorArray[co]}, ${colorArray[co + 1]}, ${colorArray[co + 2]})`)
//                     material = new THREE.PointsMaterial({
//                         size: 2,
//                         color: new THREE.Color(colorValue),
//                         sizeAttenuation: false,
//                     })
//                     if (depthValue > opts.maxDepth) {
//                         continue
//                     }
//                     const pp = depthToPointCloudPos(x, y, depthValue / opts.scaleDivisor)
//                     maxPP = Math.max(maxPP, pp.z)
//                     points.push(pp.x, pp.y, pp.z)
//                 }
//             }
//             geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3))
//             pointCloud = new THREE.Points(geometry, material)
//             pointCloud.position.z = maxPP / 2 * -1
//             group = new THREE.Group()
//             group.add(pointCloud)
//             scene.add(group)
//             group.rotateY(Math.PI)
//             group.rotateZ(Math.PI)
//             return pointCloud
//             // not sure why this is throwing error
//             //@ts-ignore
//             geometry.verticesNeedUpdate = true
//         }
//     }

//     // function updatePoints() {
//     //     if (geometry && !!pointCloud && pointsData) {
//     //         const depthArray = pointsData.depth
//     //         const depthWidth = pointsData.width
//     //         const depthHeight = pointsData.height
//     //         const newPoints = []
//     //         let maxPP = 0
//     //         for (let x = 0; x < depthWidth; x += opts.skip) {
//     //             for (let y = 0; y < depthHeight; y += opts.skip) {
//     //                 const offset = x + y * depthWidth
//     //                 const depthValue = depthArray[offset]
//     //                 if (depthValue > opts.maxDepth) {
//     //                     continue
//     //                 }
//     //                 const pp = depthToPointCloudPos(x, y, depthValue / opts.scaleDivisor)
//     //                 maxPP = Math.max(maxPP, pp.z)
//     //                 newPoints.push(pp.x, pp.y, pp.z)
//     //             }
//     //         }
//     //         geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPoints), 3))
//     //         pointCloud.position.z = maxPP / 2 * -1
//     //     }
//     // }

//     function onWindowResize() {
//         opts.canvasWidth = window.innerWidth
//         opts.canvasHeight = window.innerHeight
//         camera.aspect = window.innerWidth / window.innerHeight
//         camera.updateProjectionMatrix()

//         renderer.setSize(window.innerWidth, window.innerHeight)
//     }

//     function draw() {
//         renderer.render(scene, camera);
//         // updatePoints()
//         // console.log(camera.position)
//         // orbitControls.update()
//         requestAnimationFrame(draw);
//     }

//     setup(canvas)
//     window.addEventListener('resize', onWindowResize, false)
//     draw()
//     console.log(pointsData.color.length)
//     console.log(pointsData.depth.length)
// }