// Loads and plays a .kpc recording made by record_server.py.
// This file only depends on three, so it can be copied into another project as is.
//
// File format (little endian, the whole file is usually gzipped):
//   header (16 bytes): "KPC1" | u8 version | u8 flags (bit 0 = has color) | u16 fps | f32 units per meter | u32 reserved
//   frame:             u32 ms since start | u32 point count N | int16[N * 3] xyz | u8[N * 3] rgb (if has color) | padding to 4 bytes
import * as THREE from 'three'

const MAGIC = 0x3143504b // "KPC1"
const HEADER_BYTES = 16
const FRAME_HEADER_BYTES = 8
const FLAG_COLOR = 1

type Frame = {
  time: number // seconds since the start of the recording
  count: number
  offset: number // byte offset of the positions
}

// vertex colors need to be linear, the camera gives sRGB
const SRGB_TO_LINEAR = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  const c = i / 255
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export class PointCloudClip {
  // Positions are in the recording's units (millimeters). Scale this to fit your scene,
  // ie: `clip.points.scale.setScalar(1 / clip.unitsPerMeter)` for meters.
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  readonly hasColor: boolean
  readonly fps: number
  readonly unitsPerMeter: number
  readonly frameCount: number
  readonly duration: number // seconds
  loop = true

  private buffer: ArrayBuffer
  private frames: Frame[] = []
  private currentFrame = -1
  private positions: THREE.BufferAttribute
  private colors?: THREE.BufferAttribute

  constructor(buffer: ArrayBuffer) {
    const view = new DataView(buffer)
    if (buffer.byteLength < HEADER_BYTES || view.getUint32(0, true) !== MAGIC) {
      throw new Error("Not a .kpc point cloud recording")
    }
    this.buffer = buffer
    this.hasColor = (view.getUint8(5) & FLAG_COLOR) !== 0
    this.fps = view.getUint16(6, true)
    this.unitsPerMeter = view.getFloat32(8, true)

    const bytesPerPoint = this.hasColor ? 9 : 6
    let maxCount = 0
    let offset = HEADER_BYTES
    while (offset + FRAME_HEADER_BYTES <= buffer.byteLength) {
      const count = view.getUint32(offset + 4, true)
      const size = FRAME_HEADER_BYTES + count * bytesPerPoint
      if (offset + size > buffer.byteLength) {
        break // the last frame was cut off
      }
      this.frames.push({ time: view.getUint32(offset, true) / 1000, count, offset: offset + FRAME_HEADER_BYTES })
      maxCount = Math.max(maxCount, count)
      offset += Math.ceil(size / 4) * 4
    }
    this.frameCount = this.frames.length

    // the last frame stays up for as long as the average frame did
    const lastTime = this.frameCount ? this.frames[this.frameCount - 1].time : 0
    this.duration = lastTime + (this.frameCount > 1 ? lastTime / (this.frameCount - 1) : 1 / (this.fps || 15))

    // The buffers are as big as the biggest frame. Every frame gets copied into them.
    const geometry = new THREE.BufferGeometry()
    this.positions = new THREE.BufferAttribute(new Int16Array(maxCount * 3), 3)
    this.positions.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('position', this.positions)
    if (this.hasColor) {
      this.colors = new THREE.BufferAttribute(new Float32Array(maxCount * 3), 3)
      this.colors.setUsage(THREE.DynamicDrawUsage)
      geometry.setAttribute('color', this.colors)
    }
    geometry.setDrawRange(0, 0)

    const material = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: false,
      vertexColors: this.hasColor,
    })
    this.points = new THREE.Points(geometry, material)
    // the bounds change every frame
    this.points.frustumCulled = false

    this.update(0)
  }

  // Shows the frame for this time (in seconds since the start of the recording)
  update(seconds: number) {
    if (!this.frameCount) {
      return
    }
    const time = this.loop ? seconds % this.duration : Math.min(seconds, this.duration)
    let index = this.currentFrame
    if (index < 0 || this.frames[index].time > time) {
      index = 0
    }
    while (index + 1 < this.frameCount && this.frames[index + 1].time <= time) {
      index++
    }
    this.showFrame(index)
  }

  showFrame(index: number) {
    if (index === this.currentFrame || index < 0 || index >= this.frameCount) {
      return
    }
    this.currentFrame = index
    const frame = this.frames[index]
    const length = frame.count * 3

    this.positions.array.set(new Int16Array(this.buffer, frame.offset, length))
    this.positions.needsUpdate = true

    if (this.colors) {
      const rgb = new Uint8Array(this.buffer, frame.offset + length * 2, length)
      const colors = this.colors.array
      for (let i = 0; i < length; i++) {
        colors[i] = SRGB_TO_LINEAR[rgb[i]]
      }
      this.colors.needsUpdate = true
    }
    this.points.geometry.setDrawRange(0, frame.count)
  }

  // With color off, the points are drawn in `points.material.color`
  setUseColor(useColor: boolean) {
    const material = this.points.material
    const vertexColors = useColor && this.hasColor
    if (material.vertexColors !== vertexColors) {
      material.vertexColors = vertexColors
      material.needsUpdate = true
    }
    if (vertexColors) {
      // the material color tints the vertex colors
      material.color.set(0xffffff)
    }
  }

  dispose() {
    this.points.geometry.dispose()
    this.points.material.dispose()
  }
}

async function gunzip(data: ArrayBuffer) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).arrayBuffer()
}

export async function parsePointCloudClip(data: ArrayBuffer) {
  const bytes = new Uint8Array(data)
  // the server might have already unzipped it for us
  const isGzipped = bytes[0] === 0x1f && bytes[1] === 0x8b
  return new PointCloudClip(isGzipped ? await gunzip(data) : data)
}

export async function loadPointCloudClip(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not load ${url}: ${response.status}`)
  }
  return parsePointCloudClip(await response.arrayBuffer())
}
