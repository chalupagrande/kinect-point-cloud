# React Kinect Point Cloud with Websocket Server

## USE THIS REPO FOR DEVELOPMENT 9/29/23

https://rjw57.github.io/freenect2-python/

## Getting started

0. make sure the kinects are plugged into different ports
   0.5. `nvm use`
1. `yarn build`
2. Update the paths of the assets in the `build/index.html` to have `dist` infront (ie: `<link rel="icon" type="image/svg+xml" href="/dist/vite.svg" />`)
3. `conda activate kinect2`
4. `python server.py`
5. navigate to `localhost:8000`

## Recording (depth + color)

Run `python record_server.py` instead of `python server.py`. It serves the same live view, and adds a recorder that saves depth + color.

1. Dial in the live view with the controls. `Skip`, the `bb` sliders and `Origin` get baked into the recording, so trim out everything you don't need (walls etc).
2. `Start Color Recording` / `Stop Color Recording`. The settings are read when the recording starts. The file is saved to `recordings/<timestamp>.kpc`.
3. Pick it in the `Recordings` dropdown and hit `Play`. `Back to Live` returns to the kinect. `Point Size`, `Color`, `Rotate Speed` and `Use recorded color` still work during playback.

`Raw Recording (old)` is the original recorder that appends the raw depth frames to `kinect_data.zlib`.

### Using a recording in another ThreeJS project

Copy the `.kpc` file into the other project's public folder, and copy `src/playback/PointCloudClip.ts` (it only depends on `three`).

```
const clip = await loadPointCloudClip('/my-recording.kpc')
clip.points.scale.setScalar(1 / clip.unitsPerMeter) // recordings are in millimeters
scene.add(clip.points)
// every frame:
clip.update(secondsSinceStart)
```

For React Three Fiber also copy `r3f/PointCloudPlayback.tsx` into the same folder: `<PointCloudPlayback url="/my-recording.kpc" />`

### .kpc file format

The file is gzipped, little endian. Positions are int16 millimeters with y up (the flip that the live view does is already applied).

```
header (16 bytes): "KPC1" | u8 version | u8 flags (bit 0 = has color) | u16 fps | f32 units per meter | u32 reserved
frame:             u32 ms since start | u32 point count N | int16[N * 3] xyz | u8[N * 3] rgb | padding to 4 bytes
```

## TROUBLESHOOTING

1. If there is an error relating to "geometry" try running in a incognito browser or clearing cache

## MALLOC ERROR:

error is appearing int the libraries queue function. I changed the BLOCK call to PUT and it seems to work. See the last line in this code block.

```

    def put(self, item, block=True, timeout=None):
        '''Put an item into the queue.

        If optional args 'block' is true and 'timeout' is None (the default),
        block if necessary until a free slot is available. If 'timeout' is
        a non-negative number, it blocks at most 'timeout' seconds and raises
        the Full exception if no free slot was available within that time.
        Otherwise ('block' is false), put an item on the queue if a free slot
        is immediately available, else raise the Full exception ('timeout'
        is ignored in that case).
        '''
        with self.not_full:
            if self.maxsize > 0:
                if not block:
                    if self._qsize() >= self.maxsize:
                        raise Full
                elif timeout is None:
                    while self._qsize() >= self.maxsize:
                        self.not_full.wait()
                elif timeout < 0:
                    raise ValueError("'timeout' must be a non-negative number")
                else:
                    endtime = time() + timeout
                    while self._qsize() >= self.maxsize:
                        remaining = endtime - time()
                        if remaining <= 0.0:
                            raise Full
                        self.not_full.wait(remaining)
            self._put(item)
            self.unfinished_tasks += 1
            self.not_empty.notify()

    def get(self, block=True, timeout=None):
        '''Remove and return an item from the queue.

        If optional args 'block' is true and 'timeout' is None (the default),
        block if necessary until an item is available. If 'timeout' is
        a non-negative number, it blocks at most 'timeout' seconds and raises
        the Empty exception if no item was available within that time.
        Otherwise ('block' is false), return an item if one is immediately
        available, else raise the Empty exception ('timeout' is ignored
        in that case).
        '''
        with self.not_empty:
            if not block:
                if not self._qsize():
                    raise Empty
            elif timeout is None:
                while not self._qsize():
                    self.not_empty.wait()
            elif timeout < 0:
                raise ValueError("'timeout' must be a non-negative number")
            else:
                endtime = time() + timeout
                while not self._qsize():
                    remaining = endtime - time()
                    if remaining <= 0.0:
                        raise Empty
                    self.not_empty.wait(remaining)
            item = self._get()
            self.not_full.notify()
            return item

    def put_nowait(self, item):
        '''Put an item into the queue without blocking.

        Only enqueue the item if a free slot is immediately available.
        Otherwise raise the Full exception.

        JAMIE EDITING THIS HERE: Original code:""""
        # return self.put(item, block=False)
        '''
        return self.put(item, block=True, timeout=100) <<<<<<<<<<<<<<<<<<<<<<<<<<<

```
