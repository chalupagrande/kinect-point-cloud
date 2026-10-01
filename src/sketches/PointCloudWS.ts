import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
// import registered from '../assets/registered4.json'
import depth from '../assets/two_cameras.json'
import * as pako from 'pako';
import { pointCloudOptions } from '../components/Settings'
import { CameraParams } from '../assets/cameraParams';
import wsc from '../WebsocketConnection'
import { playbackState } from '../playback/playbackState'
import { PointCloudClip } from '../playback/PointCloudClip'

const opts = {
  canvasWidth: window.innerWidth,
  canvasHeight: window.innerHeight,
  scaleDivisor: 10,
  depthAdjustment: -200,
  compression: 2, // this number needs to match the SKIP number in the server.py `process_list` function
}
const lsDualCameraCalibrationString = localStorage.getItem("dualCameraCalibration")
const lsDualCameraCalibration = typeof lsDualCameraCalibrationString === 'string' ? JSON.parse(lsDualCameraCalibrationString) : undefined

const dualCameraCalibration = lsDualCameraCalibration || {
  position: {
    x:0,
    y:0,
    z:92,
  },
  rotation: {
    x: 0,
    y: 0,
    z: 0
  }
}

// const dualCameraCalibration = lsDualCameraCalibration || {
//   position: {
//     x:12,
//     y:-5,
//     z:92,
//   },
//   rotation: {
//     x: 0.08726646,
//     y: -3.05432619,
//     z: 0
//   }
// }

const currentBoundingBoxDimensions = {
  width: pointCloudOptions.bbWidth,
  height: pointCloudOptions.bbHeight,
  depth: pointCloudOptions.bbDepth
}

type PointsData = number[][]
const defaultPointsData = depth
const depthWidth = 512 / opts.compression
const depthHeight = 424 / opts.compression

let pointsData: PointsData = defaultPointsData as PointsData



//calculte the xyz camera position based on the depth data
export function depthToPointCloudPos(x: number, y: number, depthValue: number) {
  const point = new THREE.Vector3()
  point.z = depthValue // / (1.0f); // Convert from mm to meters
  point.x = ((x - CameraParams.cx) * point.z) / CameraParams.fx
  point.y = ((y - CameraParams.cy) * point.z) / CameraParams.fy
  return point
}

export default function PointCloudWS(canvas: HTMLCanvasElement) {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let orbitControls: OrbitControls;
  const group: THREE.Group = new THREE.Group
  const pointClouds:THREE.Points[] = []
  let boundingBoxMesh: THREE.Mesh
  let boundingBox: THREE.Box3
  // recordings are played in their own group, the live group is hidden while one is playing
  const playbackGroup: THREE.Group = new THREE.Group
  let playingClip: PointCloudClip | null = null
  let playbackStart = 0

  let first = true
  // let messageCount = 0
  wsc.addEventListener('message', (event) => {
    const message = event.data
    const compressedData = new Uint8Array(message);
    const decompressedData = pako.inflate(compressedData, {to: 'string'})
    pointsData = JSON.parse(decompressedData)
    if(first) {
      console.log(pointsData.length)
      first = false
    }
    // messageCount +=1
  })

  // uncomment for FPS (messages from server per second)
  // setInterval(()=> {
  //   console.log(messageCount + "fps")
  //   messageCount = 0
  // }, 1000)

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

    // const axesHelper = new THREE.AxesHelper(55);
    // scene.add(axesHelper);

    const boundingBoxGeo = new THREE.BoxGeometry(currentBoundingBoxDimensions.width,currentBoundingBoxDimensions.height,currentBoundingBoxDimensions.depth);
    const boundingBoxMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    boundingBoxMesh = new THREE.Mesh(boundingBoxGeo, boundingBoxMat);
    boundingBox = new THREE.Box3().setFromObject(boundingBoxMesh)



    createPointCloud(pointsData)
    scene.add(playbackGroup)
    renderer.setSize(opts.canvasWidth, opts.canvasHeight)
  }

  function createPointCloud(pointsData?: PointsData) {
    if (pointsData) {


      // const colorArray = pointsData.color
      // const color = new THREE.Color()
      // const colors: number[] = []


      const skip = pointCloudOptions.skip
      for(let cameraIndex = 0; cameraIndex < pointCloudOptions.numCameras; cameraIndex++) {
        const points: number[] = []
        const geometry = new THREE.BufferGeometry()
        const material = new THREE.PointsMaterial({
          size: pointCloudOptions.pointSize,
          // vertexColors: !!colorArray.length,
          color: 0x000000,
          sizeAttenuation: false,
        })
        const depthArray = pointsData[cameraIndex]

        for (let x = 0; x < depthWidth; x+= skip) {
          for (let y = 0; y < depthHeight; y+= skip) {
            const offset = x + y * depthWidth
            const depthValue = depthArray[offset]

            // const colorValue = colorArray[y][x]
            // color.setRGB(colorValue[0] / 255, colorValue[1] / 255, colorValue[2] / 255)
            // colors.push(color.r, color.g, color.b)
            const pointVector = depthToPointCloudPos(
              x * opts.compression,
              y * opts.compression,
              depthValue / 15
            )
            // if (!isInBoundingBox(pointVector)) {
            //   continue
            // }
            points.push(pointVector.x, pointVector.y, pointVector.z)

          }
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3))
        // geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));


        // not sure why this is throwing error
        //@ts-ignore
        geometry.verticesNeedUpdate = true

        const pointCloud = new THREE.Points(geometry, material)

        pointCloud.position.z = pointCloudOptions.depthAdjustment
        group.add(pointCloud)
        pointClouds.push(pointCloud)
        if(cameraIndex === 0) {
          pointCloud.position.x = dualCameraCalibration.position.x
          pointCloud.position.y = dualCameraCalibration.position.y
          pointCloud.position.z = dualCameraCalibration.position.z

          pointCloud.rotateX(dualCameraCalibration.rotation.x)
          pointCloud.rotateY(dualCameraCalibration.rotation.y)
          pointCloud.rotateZ(dualCameraCalibration.rotation.z)
        }
      }
      console.log(group)
      group.rotateY(Math.PI)
      group.rotateZ(Math.PI)
      scene.add(group)

      return group
    }
  }

  function updatePoints() {
    if (group.children.length) {
      resizeBoundingBox()


      // const colorArray = pointsData.color
      // const colors: number[] = []
      // const color = new THREE.Color()
      // let maxPP = 0

      scene.background = pointCloudOptions.color === 0 ? new THREE.Color(0xffffff) : new THREE.Color(0x000000)

      const skip = pointCloudOptions.skip
      for(let cameraIndex = 0; cameraIndex < pointCloudOptions.numCameras; cameraIndex++) {
        const newPoints = []
        const pointCloud = pointClouds[cameraIndex]
        const depthArray = pointsData[cameraIndex]
        for (let x = 0; x < depthWidth; x+= skip) {
          for (let y = 0; y < depthHeight; y+= skip) {
            const offset = x + y * depthWidth

            const depthValue = depthArray[offset]
            const pointVector = depthToPointCloudPos(
              x * opts.compression,
              y * opts.compression,
              depthValue / 15
            )
            if (!isInBoundingBox(pointVector)) {
              continue
            }
            // const colorValue = colorArray[y][x]
            // color.setRGB(colorValue[0] / 255, colorValue[1] / 255, colorValue[2] / 255)
            // colors.push(color.r, color.g, color.b)

            // maxPP = Math.max(maxPP, pp.z)
            newPoints.push(pointVector.x, pointVector.y, pointVector.z)
          }
        }
        const geometry = pointCloud.geometry
        const material = pointCloud.material
        //@ts-ignore
        material.color = pointCloudOptions.color !== 0 ? new THREE.Color(0xffffff) : new THREE.Color(0x000000)

        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPoints), 3))
        //@ts-ignore
        material.size = pointCloudOptions.pointSize
        pointCloud.position.z = pointCloudOptions.depthAdjustment
      }

      // geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));


    }
  }



  function isInBoundingBox(point: THREE.Vector3){
    return boundingBox.containsPoint(point);
  }

  function resizeBoundingBox() {
    if(pointCloudOptions.bbWidth !== currentBoundingBoxDimensions.width ||
      pointCloudOptions.bbHeight !== currentBoundingBoxDimensions.height ||
      pointCloudOptions.bbDepth !== currentBoundingBoxDimensions.depth) {
        const newGeometry = new THREE.BoxGeometry(pointCloudOptions.bbWidth, pointCloudOptions.bbHeight, pointCloudOptions.bbDepth);
        // Dispose the old geometry to free up memory
        boundingBoxMesh.geometry.dispose();

        // Assign the new geometry to the mesh
        boundingBoxMesh.geometry = newGeometry;
        boundingBox = new THREE.Box3().setFromObject(boundingBoxMesh)

        currentBoundingBoxDimensions.depth = pointCloudOptions.bbDepth
        currentBoundingBoxDimensions.width = pointCloudOptions.bbWidth
        currentBoundingBoxDimensions.height = pointCloudOptions.bbHeight
        console.log("RESIZING:", {...currentBoundingBoxDimensions})
      }
  }

  function onWindowResize() {
    opts.canvasWidth = window.innerWidth
    opts.canvasHeight = window.innerHeight
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  function updatePlayback(clip: PointCloudClip | null) {
    if (clip !== playingClip) {
      if (playingClip) {
        playbackGroup.remove(playingClip.points)
      }
      if (clip) {
        // recordings are in mm, the live points are depth / 15
        clip.points.scale.setScalar(1 / 15)
        playbackGroup.add(clip.points)
        playbackStart = performance.now()
      }
      playingClip = clip
      group.visible = !clip
    }
    if (clip) {
      scene.background = pointCloudOptions.color === 0 ? new THREE.Color(0xffffff) : new THREE.Color(0x000000)
      clip.setUseColor(playbackState.useColor)
      if (!playbackState.useColor || !clip.hasColor) {
        clip.points.material.color = pointCloudOptions.color !== 0 ? new THREE.Color(0xffffff) : new THREE.Color(0x000000)
      }
      clip.points.material.size = pointCloudOptions.pointSize
      clip.update((performance.now() - playbackStart) / 1000)
    }
  }

  function draw() {
    renderer.render(scene, camera);
    updatePlayback(playbackState.clip)
    if (!playbackState.clip) {
      updatePoints()
    }
    group.rotateY(pointCloudOptions.rotateSpeed / 1000)
    // recordings already have the group's flip baked in, which reverses the direction of the spin
    playbackGroup.rotateY(-pointCloudOptions.rotateSpeed / 1000)
    // console.log(camera.position)
    // orbitControls.update()
    requestAnimationFrame(draw);
  }

  function addKeyboardControls(moveStep: number = 1, rotateStep: number = THREE.MathUtils.degToRad(3)) {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      const pointCloudToUpdate = group.children[pointCloudOptions.groupIndex]
        switch (event.key) {
            // Position adjustments
            case 'ArrowUp':
                pointCloudToUpdate.position.z -= moveStep;
                break;
            case 'ArrowDown':
                pointCloudToUpdate.position.z += moveStep;
                break;
            case 'ArrowLeft':
                pointCloudToUpdate.position.x -= moveStep;
                break;
            case 'ArrowRight':
                pointCloudToUpdate.position.x += moveStep;
                break;

            case '[':
                pointCloudToUpdate.position.y -= moveStep;
                break;
            case ']':
                pointCloudToUpdate.position.y += moveStep;
                break;

            // Rotation adjustments
            case 'w':  // Rotate around X-axis (pitch)
                pointCloudToUpdate.rotation.x += rotateStep;
                break;
            case 's':
                pointCloudToUpdate.rotation.x -= rotateStep;
                break;
            case 'a':  // Rotate around Y-axis (yaw)
                pointCloudToUpdate.rotation.y -= rotateStep;
                break;
            case 'd':
                pointCloudToUpdate.rotation.y += rotateStep;
                break;

            case '0':
              localStorage.setItem("dualCameraCalibration", JSON.stringify({
                position: {
                  x: pointCloudToUpdate.position.x,
                  y: pointCloudToUpdate.position.y,
                  z: pointCloudToUpdate.position.z,
                },
                rotation: {
                  //@ts-ignore
                  x: pointCloudToUpdate.rotation._x,
                  //@ts-ignore
                  y: pointCloudToUpdate.rotation._y,
                  //@ts-ignore
                  z: pointCloudToUpdate.rotation._z,
                }
              }))


            // Add more controls as needed
        }
        console.log(pointCloudToUpdate.position, pointCloudToUpdate.rotation)
    });
  }

  setup(canvas)
  addKeyboardControls()
  window.addEventListener('resize', onWindowResize, false)
  draw()
}