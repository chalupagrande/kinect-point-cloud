import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import defaultPointsData from '../assets/multi-kinect-points-data.json'

const opts = {
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight,
    skip: 3,
    maxDepth: 4000,
    scaleDivisor: 10,
    frameRate: 24,
    pointSize: 2,
    pointColor: 'black',
}

type PointsData = {
    depth1: number[],
    depth2: number[],
    width: number,
    height: number,
}

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

const xSpeed = 1;
const ySpeed = 1;
const zSpeed = 1;
const pointCloudCalibrationAdjustment = new THREE.Vector3(-2, 34, 347)


export default function MultiKinectPointCloud(canvas: HTMLCanvasElement) {
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let orbitControls: OrbitControls;
    let geometry1: THREE.BufferGeometry
    let geometry2: THREE.BufferGeometry
    let material: THREE.PointsMaterial
    let pointCloud1: THREE.Points
    let pointCloud2: THREE.Points
    let group: THREE.Group


    const wsc = new WebSocket('ws://192.168.86.159:8080', ['client'])

    wsc.addEventListener('message', (msg) => {
        const data = atob(msg.data)
        pointsData = JSON.parse(data)
    })

    wsc.addEventListener('close', () => {
        console.log("CLOSED")
    })

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
        // if (toLookAt) {
        //   camera.lookAt(toLookAt.position)
        // }
        // orbitControls.target = pointCloud.position

        document.addEventListener("keydown", onDocumentKeyDown, false);
        function onDocumentKeyDown(event: KeyboardEvent) {
            const keyCode = event.key;
            switch (keyCode) {
                case "ArrowUp":
                    pointCloud2.position.z -= zSpeed;
                    break;
                case "ArrowDown":
                    pointCloud2.position.z += zSpeed;
                    break;
                case "ArrowLeft":
                    pointCloud2.position.x -= xSpeed;
                    break;
                case "ArrowRight":
                    pointCloud2.position.x += xSpeed;
                    break;
                case "w":
                    pointCloud2.position.y += ySpeed;
                    break;
                case "s":
                    pointCloud2.position.y -= ySpeed;
                    break;
            }
            console.log(pointCloud2.position)
        };

        const axesHelper = new THREE.AxesHelper(55);
        scene.add(axesHelper);



        renderer.setSize(opts.canvasWidth, opts.canvasHeight)
    }

    function createPointCloud(pointsData?: PointsData) {
        if (pointsData) {
            const depthWidth = pointsData.width
            const depthHeight = pointsData.height
            const depthArray1 = pointsData.depth1
            const depthArray2 = pointsData.depth2
            const points1: number[] = []
            const points2: number[] = []
            geometry1 = new THREE.BufferGeometry()
            geometry2 = new THREE.BufferGeometry()
            material = new THREE.PointsMaterial({
                size: opts.pointSize,
                color: new THREE.Color(opts.pointColor),
                sizeAttenuation: false,
            })
            let maxPP1 = 0
            let maxPP2 = 0
            for (let x = 0; x < depthWidth; x += opts.skip) {
                for (let y = 0; y < depthHeight; y += opts.skip) {
                    const offset = x + y * depthWidth
                    const depthValue1 = depthArray1[offset]
                    if (depthValue1 > opts.maxDepth) {
                        continue
                    }
                    const depthValue2 = depthArray2[offset]
                    if (depthValue2 > opts.maxDepth) {
                        continue
                    }
                    const pp1 = depthToPointCloudPos(x, y, depthValue1 / opts.scaleDivisor)
                    const pp2 = depthToPointCloudPos(x, y, depthValue2 / opts.scaleDivisor)
                    maxPP1 = Math.max(maxPP1, pp1.z)
                    maxPP1 = Math.max(maxPP2, pp2.z)
                    points1.push(pp1.x, pp1.y, pp1.z)
                    points2.push(pp2.x, pp2.y, pp2.z)
                }
            }
            geometry1.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points1), 3))
            geometry2.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points2), 3))
            pointCloud1 = new THREE.Points(geometry1, material)
            pointCloud1.position.z = maxPP1 / 2 * -1
            pointCloud2 = new THREE.Points(geometry2, material)
            pointCloud2.rotateY(Math.PI)
            pointCloud2.position.x = pointCloudCalibrationAdjustment.x
            pointCloud2.position.y = pointCloudCalibrationAdjustment.y
            pointCloud2.position.z = pointCloudCalibrationAdjustment.z
            group = new THREE.Group()
            group.add(pointCloud1)
            group.add(pointCloud2)
            scene.add(group)
            group.rotateY(Math.PI)
            group.rotateZ(Math.PI)
            // not sure why this is throwing error
            //@ts-ignore
            geometry1.verticesNeedUpdate = true
            //@ts-ignore
            geometry2.verticesNeedUpdate = true
        }
    }

    function updatePoints() {
        if (geometry1 && geometry2 && !!pointCloud1 && !!pointCloud2 && pointsData) {
            const depthArray1 = pointsData.depth1
            const depthArray2 = pointsData.depth2
            const depthWidth = pointsData.width
            const depthHeight = pointsData.height
            const points1 = []
            const points2 = []
            for (let x = 0; x < depthWidth; x += opts.skip) {
                for (let y = 0; y < depthHeight; y += opts.skip) {
                    const offset = x + y * depthWidth
                    const depthValue1 = depthArray1[offset]
                    if (depthValue1 > opts.maxDepth) {
                        continue
                    }
                    const depthValue2 = depthArray2[offset]
                    if (depthValue2 > opts.maxDepth) {
                        continue
                    }
                    const pp1 = depthToPointCloudPos(x, y, depthValue1 / opts.scaleDivisor)
                    const pp2 = depthToPointCloudPos(x, y, depthValue2 / opts.scaleDivisor)
                    points1.push(pp1.x, pp1.y, pp1.z)
                    points2.push(pp2.x, pp2.y, pp2.z)
                }
            }
            geometry1.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points1), 3))
            geometry2.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points2), 3))
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
        // console.log(camera.position)
        // orbitControls.update()
        setTimeout(function () {
            requestAnimationFrame(draw);
        }, 1000 / opts.frameRate);
    }

    setup(canvas)
    window.addEventListener('resize', onWindowResize, false)
    draw()
}