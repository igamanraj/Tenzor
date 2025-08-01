import { useEffect, useRef, useState } from "react";

export default function Home(){
    const canRef = useRef<HTMLCanvasElement>(null);
    const [isdrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if(ctx){
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;
                ctx.lineCap = "round";
                ctx.lineWidth = 3;
            }
        }
    }, []);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canRef.current;
        if(canvas){
            canvas.style.background = "black";
            const ctx = canvas.getContext("2d");
            if(ctx){
                ctx.beginPath();
                ctx.moveTo(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop);
                setIsDrawing(true);
            }
          }
        }

    const stopDrawing = () => {
        setIsDrawing(false);
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if(!isdrawing){
            return;
        }
        const canvas = canRef.current;
        if(canvas){
            const ctx = canvas.getContext("2d");
            if(ctx){
                ctx.strokeStyle = "white";
                ctx.lineTo(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop);
                ctx.stroke();

            }
        }
    }

    return (
        <canvas 
        ref={canRef} 
        id="canvas"
        className="absolute top-0 left-0 w-full h-full"
        onMouseDown={startDrawing}
        onMouseOut={stopDrawing}
        onMouseUp={stopDrawing}       
        />
    )
}