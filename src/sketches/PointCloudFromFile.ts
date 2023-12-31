import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import depth from '../assets/depth4.json'
import { flatten } from 'lodash'

const opts = {
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight,
    skip: 3,
    maxDepth: 4000,
    scaleDivisor: 10,
    depthAdjustment: -200
}

type PointsData = {
    depth: number[],
    width: number,
    height: number,
    // color: number[][][],
}

const defaultPointsData = {
    depth: flatten(depth),
    width: 512,
    height: 424,
    // color: registered
}

console.log(depth.length, depth[0].length, depth[0])
debugger
let pointsData: PointsData = defaultPointsData as PointsData

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
    let group: THREE.Group


    // const wsc = new WebSocket('ws://192.168.86.159:8080', ['client'])

    // wsc.addEventListener('message', (msg) => {
    //     const data = atob(msg.data)
    //     // console.log("MESSAGE", data)
    //     pointsData = JSON.parse(data)
    // })

    // wsc.addEventListener('close', () => {
    //     console.log("CLOSED")
    // })

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
        // orbitControls.enableDamping = true
        orbitControls.zoomSpeed = 0.5
        orbitControls.update()


        //camera
        camera.position.x = 0
        camera.position.y = 0
        camera.position.z = 250
        createPointCloud(pointsData)

        const axesHelper = new THREE.AxesHelper(55);
        scene.add(axesHelper);



        renderer.setSize(opts.canvasWidth, opts.canvasHeight)
    }

    function createPointCloud(pointsData?: PointsData) {
        if (pointsData) {
            const depthWidth = pointsData.width
            const depthHeight = pointsData.height
            const depthArray = pointsData.depth
            // const colorArray = pointsData.color
            // const color = new THREE.Color()
            // const colors: number[] = []
            const points: number[] = []
            geometry = new THREE.BufferGeometry()

            let maxPP = 0
            for (let x = 0; x < depthWidth; x += opts.skip) {
                for (let y = 0; y < depthHeight; y += opts.skip) {
                    const offset = x + y * depthWidth
                    const depthValue = depthArray[offset]
                    if (depthValue > opts.maxDepth) {
                        continue
                    }
                    // const colorValue = colorArray[y][x]
                    // color.setRGB(colorValue[0] / 255, colorValue[1] / 255, colorValue[2] / 255)
                    // colors.push(color.r, color.g, color.b)
                    const pp = depthToPointCloudPos(x, y, depthValue / opts.scaleDivisor)
                    maxPP = Math.max(maxPP, pp.z)
                    points.push(pp.x, pp.y, pp.z)
                }
            }
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3))
            // geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            material = new THREE.PointsMaterial({
                size: 2,
                // vertexColors: !!colorArray.length,
                color: 0x000000,
                sizeAttenuation: false,
            })
            pointCloud = new THREE.Points(geometry, material)
            pointCloud.position.z = maxPP / 2 * -1
            group = new THREE.Group()
            group.add(pointCloud)
            scene.add(group)
            group.rotateY(Math.PI)
            group.rotateZ(Math.PI)
            return pointCloud
            // not sure why this is throwing error
            //@ts-ignore
            geometry.verticesNeedUpdate = true
        }
    }

    function updatePoints() {
        if (geometry && !!pointCloud && pointsData) {
            const depthArray = pointsData.depth
            const depthWidth = pointsData.width
            const depthHeight = pointsData.height
            // const colorArray = pointsData.color
            // const colors: number[] = []
            // const color = new THREE.Color()
            const newPoints = []
            // let maxPP = 0
            for (let x = 0; x < depthWidth; x += opts.skip) {
                for (let y = 0; y < depthHeight; y += opts.skip) {
                    const offset = x + y * depthWidth

                    const depthValue = depthArray[offset]
                    if (depthValue > opts.maxDepth) {
                        continue
                    }
                    // const colorValue = colorArray[y][x]
                    // color.setRGB(colorValue[0] / 255, colorValue[1] / 255, colorValue[2] / 255)
                    // colors.push(color.r, color.g, color.b)
                    const pp = depthToPointCloudPos(x, y, depthValue / opts.scaleDivisor)
                    // maxPP = Math.max(maxPP, pp.z)
                    newPoints.push(pp.x, pp.y, pp.z)
                }
            }
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPoints), 3))
            // geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            // pointCloud.position.z = maxPP / 2 * -1

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
        updatePoints()
        // group.rotateY(0.005)
        // console.log(camera.position)
        // orbitControls.update()
        requestAnimationFrame(draw);
    }

    setup(canvas)
    window.addEventListener('resize', onWindowResize, false)
    draw()
}