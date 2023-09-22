import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const opts = {
  w: window.innerWidth,
  h: window.innerHeight,
}

export default function BasicSketch(canvas: HTMLCanvasElement) {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let orbitControls: OrbitControls;
  let cube: THREE.Mesh;
  console.log("Attempting to establish WebSocket connection...");
  const socket = new WebSocket("ws://192.168.86.239:8000/ws");


  socket.addEventListener('open', () => {
    console.log("WebSocket connection established.");
  });

  socket.addEventListener('message', (event) => {
    const message = event.data
    console.log(message)
  })

  // Handle connection closure
  socket.addEventListener("close", function (event) {
    if (event.wasClean) {
      console.log(
        "WebSocket closed cleanly, code=" +
          event.code +
          ", reason=" +
          event.reason
      );
    } else {
      console.error("WebSocket connection broken");
    }
  });

  socket.addEventListener('error', (error) => {
    console.error("WebSocket Error:", error);
  });


  function setup(canvas: HTMLCanvasElement) {
    scene = new THREE.Scene()
    // camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100)
    camera = new THREE.PerspectiveCamera(75, opts.w / opts.h, 0.1, 1000)
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      // alpha: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(opts.w, opts.h)

    // controls
    orbitControls = new OrbitControls(camera, renderer.domElement)
    orbitControls.update()

    //camera
    camera.position.z = 10
    camera.position.y = 10

    const geometry = new THREE.BoxGeometry(3, 3, 3);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    camera.position.z = 5;

    camera.lookAt(cube.position)

    renderer.setSize(opts.w, opts.h)
  }

  function onWindowResize() {
    opts.w = window.innerWidth
    opts.h = window.innerHeight
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  function draw() {
    renderer.render(scene, camera);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    orbitControls.update()
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', onWindowResize, false)
  setup(canvas)
  draw()
}