import { PointCloudClip } from './PointCloudClip'

// Set by the Settings component, read by the sketch every frame (same idea as pointCloudOptions).
// When there is a clip, the sketch plays it instead of the live feed.
export const playbackState: { clip: PointCloudClip | null, useColor: boolean } = {
  clip: null,
  useColor: true,
}
