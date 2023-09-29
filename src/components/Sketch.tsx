import { useRef, useEffect, useCallback } from 'react'


type SketchProps = {
    sketch: (canvas: HTMLCanvasElement) => void
}


function Sketch({ sketch }: SketchProps) {

    const canvasRef = useRef(null)
    const memoSketch = useCallback((c: HTMLCanvasElement) => sketch(c), [sketch])

    useEffect(() => {
        if (canvasRef && canvasRef.current && memoSketch) {
            console.log(canvasRef.current)
            memoSketch(canvasRef.current)
        }
    }, [memoSketch])

    return (
        <div>
            <canvas ref={canvasRef} />
        </div>
    )
}

export default Sketch
