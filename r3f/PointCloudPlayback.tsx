// React Three Fiber component that plays a .kpc recording.
// This is not part of the build in this repo. To use it, copy this file and
// src/playback/PointCloudClip.ts into the same folder of the R3F project, and put
// the .kpc file in that project's public folder:
//
//   <PointCloudPlayback url="/20260930-201500.kpc" position={[0, 1, 0]} />
//
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import type { ColorRepresentation } from 'three'
import { PointCloudClip, loadPointCloudClip } from './PointCloudClip'

type PointCloudPlaybackProps = ThreeElements['group'] & {
  url: string
  loop?: boolean
  playing?: boolean
  useColor?: boolean
  // used when useColor is false
  color?: ColorRepresentation
  // in pixels
  pointSize?: number
}

export function PointCloudPlayback({
  url,
  loop = true,
  playing = true,
  useColor = true,
  color = 0xffffff,
  pointSize = 2,
  ...groupProps
}: PointCloudPlaybackProps) {
  const [clip, setClip] = useState<PointCloudClip | null>(null)
  const elapsed = useRef(0)

  useEffect(() => {
    let cancelled = false
    let loaded: PointCloudClip | null = null
    loadPointCloudClip(url).then((newClip) => {
      if (cancelled) {
        newClip.dispose()
        return
      }
      loaded = newClip
      elapsed.current = 0
      setClip(newClip)
    })
    return () => {
      cancelled = true
      loaded?.dispose()
      setClip(null)
    }
  }, [url])

  useFrame((_, delta) => {
    if (!clip) {
      return
    }
    clip.loop = loop
    clip.setUseColor(useColor)
    if (!useColor || !clip.hasColor) {
      clip.points.material.color.set(color)
    }
    clip.points.material.size = pointSize
    if (playing) {
      elapsed.current += delta
    }
    clip.update(elapsed.current)
  })

  if (!clip) {
    return null
  }
  // the recording is in millimeters, this makes 1 unit = 1 meter
  return (
    <group {...groupProps}>
      <primitive object={clip.points} scale={1 / clip.unitsPerMeter} />
    </group>
  )
}
