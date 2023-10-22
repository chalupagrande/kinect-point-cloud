import { useRef, useState, useEffect, useCallback } from 'react'
import { Settings } from './Settings'

type SketchProps = {
    sketch: (canvas: HTMLCanvasElement) => void
}


function Sketch({ sketch }: SketchProps) {

    const canvasRef = useRef(null)
    const memoSketch = useCallback((c: HTMLCanvasElement) => sketch(c), [sketch])
    const [renderCount, setRenderCount] = useState(0)

    useEffect(() => {
        if(canvasRef && canvasRef.current) {
            setRenderCount(1)
        }
        if (canvasRef && canvasRef.current && memoSketch && renderCount === 1) {
            memoSketch(canvasRef.current)
        }
    }, [memoSketch, renderCount])

    return (
        <div>
            <Settings canvas={canvasRef.current}/>
            <canvas ref={canvasRef} />
        </div>
    )
}

export default Sketch
