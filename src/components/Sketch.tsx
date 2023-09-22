import { useRef, useEffect, useCallback } from 'react'


type SketchProps = {
    sketch: (canvas: HTMLCanvasElement) => void
}


function Sketch({ sketch }: SketchProps) {

    let canvasRef = useRef(null)
    const memoSketch = useCallback((c: HTMLCanvasElement) => sketch(c), [false])

    useEffect(() => {
        if (canvasRef && canvasRef.current && memoSketch) {
            console.log(canvasRef.current)
            memoSketch(canvasRef.current)
        }
    }, [canvasRef.current])

    return (
        <div>
            <canvas ref={canvasRef} />
        </div>
    )
}

export default Sketch
