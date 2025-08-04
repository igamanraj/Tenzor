import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { SWATCHES } from "@/constant";
// import {LazyBrush} from 'lazy-brush';

interface GeneratedResult {
  expression: string;
  answer: string;
}

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

// Custom Draggable Component for React 19 compatibility with touch support
interface DraggableProps {
  children: React.ReactNode;
  position: { x: number; y: number };
  onDrag: (position: { x: number; y: number }) => void;
}

function CustomDraggable({ children, position, onDrag }: DraggableProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState(position);

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({
      x: clientX - currentPosition.x,
      y: clientY - currentPosition.y,
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    const newPosition = {
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    };
    setCurrentPosition(newPosition);
    onDrag(newPosition);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleMove(e.clientX, e.clientY);
      };

      const handleGlobalTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      };

      const handleGlobalEnd = () => {
        setIsDragging(false);
      };

      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalEnd);
      document.addEventListener("touchmove", handleGlobalTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleGlobalEnd);

      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove);
        document.removeEventListener("mouseup", handleGlobalEnd);
        document.removeEventListener("touchmove", handleGlobalTouchMove);
        document.removeEventListener("touchend", handleGlobalEnd);
      };
    }
  }, [isDragging, dragStart, onDrag]);

  return (
    <div
      style={{
        position: "absolute",
        left: currentPosition.x,
        top: currentPosition.y,
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleEnd}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("rgb(255, 255, 255)");
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState({});
  const [result, setResult] = useState<GeneratedResult>();
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // const lazyBrush = new LazyBrush({
  //     radius: 10,
  //     enabled: true,
  //     initialPoint: { x: 0, y: 0 },
  // });

  useEffect(() => {
    if (latexExpression.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
      }, 0);
    }
  }, [latexExpression]);

  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.answer);
    }
  }, [result]);

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpression([]);
      setResult(undefined);
      setDictOfVars({});
      setIsLoading(false);
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - canvas.offsetTop;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 4;
        ctx.globalCompositeOperation = "source-over";
      }
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.MathJax.Hub.Config({
        tex2jax: {
          inlineMath: [
            ["$", "$"],
            ["\\(", "\\)"],
          ],
        },
        "HTML-CSS": {
          scale: 90,
          linebreaks: { automatic: true }
        },
        CommonHTML: {
          scale: 90,
          linebreaks: { automatic: true }
        },
        SVG: {
          scale: 90,
          linebreaks: { automatic: true }
        }
      });
    };

    // Handle window resize
    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - canvas.offsetTop;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = 4;
        }
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      document.head.removeChild(script);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const renderLatexToCanvas = (expression: string, answer: string) => {
    const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
    setLatexExpression([...latexExpression, latex]);

    // Clear the main canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.background = "transparent";
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        let x, y;
        if ("touches" in e.nativeEvent) {
          // Touch event
          const touch = e.nativeEvent.touches[0];
          const rect = canvas.getBoundingClientRect();
          x = touch.clientX - rect.left;
          y = touch.clientY - rect.top;
        } else {
          // Mouse event
          x = e.nativeEvent.offsetX;
          y = e.nativeEvent.offsetY;
        }
        ctx.moveTo(x, y);
        setIsDrawing(true);
      }
    }
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) {
      return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = color;
        let x, y;
        if ("touches" in e.nativeEvent) {
          // Touch event
          const touch = e.nativeEvent.touches[0];
          const rect = canvas.getBoundingClientRect();
          x = touch.clientX - rect.left;
          y = touch.clientY - rect.top;
        } else {
          // Mouse event
          x = e.nativeEvent.offsetX;
          y = e.nativeEvent.offsetY;
        }
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const runRoute = async () => {
    const canvas = canvasRef.current;

    if (canvas) {
      setIsLoading(true);
      setResult(undefined);
      setLatexExpression([]);

      try {
        const response = await axios({
          method: "post",
          url: `${import.meta.env.VITE_API_URL}/calculate/analyze`,
          data: {
            image: canvas.toDataURL("image/png"),
            dict_of_vars: dictOfVars,
          },
        });

        const resp = await response.data;
        console.log("Response", resp);
        resp.data.forEach((data: Response) => {
          if (data.assign === true) {
            // dict_of_vars[resp.result] = resp.answer;
            setDictOfVars({
              ...dictOfVars,
              [data.expr]: data.result,
            });
          }
        });
        const ctx = canvas.getContext("2d");
        const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
        let minX = canvas.width,
          minY = canvas.height,
          maxX = 0,
          maxY = 0;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if (imageData.data[i + 3] > 0) {
              // If pixel is not transparent
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        setLatexPosition({ x: centerX, y: centerY });
        
        // Add delay before showing results for better UX
        setTimeout(() => {
          resp.data.forEach((data: Response) => {
            setResult({
              expression: data.expr,
              answer: data.result,
            });
          });
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error calculating:", error);
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden font-sans">
      {/* Header with controls */}
      <header className="absolute top-0 left-0 right-0 z-30 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Mobile layout */}
          <div className="md:hidden space-y-4">
            {/* Top row: Reset and Run buttons */}
            <div className="flex justify-between gap-3">
              <Button
                onClick={() => setReset(true)}
                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-2xl py-3 px-6 font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg backdrop-blur-sm border border-white/10"
                variant="default"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reset
              </Button>
              <Button
                onClick={runRoute}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-emerald-300 disabled:to-teal-400 text-white rounded-2xl py-3 px-6 font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg backdrop-blur-sm border border-white/10 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg"
                variant="default"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="w-4 h-4 mr-2 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth={4}
                        className="opacity-25"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    Calculate
                  </>
                )}
              </Button>
            </div>

            {/* Color palette */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <h3 className="text-white text-sm font-medium mb-3 text-center">
                Colors
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                {SWATCHES.map((swatch) => (
                  <div
                    key={swatch}
                    className={`w-8 h-8 rounded-full cursor-pointer transition-all duration-200 transform hover:scale-110 shadow-lg border-2 ${
                      color === swatch
                        ? "border-white scale-110"
                        : "border-white/30"
                    }`}
                    style={{ backgroundColor: swatch }}
                    onClick={() => setColor(swatch)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Desktop layout */}
          <div className="hidden md:flex items-center justify-between">
            {/* Left: Brand */}
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-3">
                <svg
                  width="30px"
                  height="30px"
                  viewBox="0 0 50.8 50.8"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g
                    fill="none"
                    stroke="white"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="5"
                  >
                    <path d="M44.979 25.929V5.821H5.821v39.158h20.108" />

                    <circle cx="38.232" cy="38.232" r="6.747" />

                    <path d="M33.073 33.073 21.431 21.431" />

                    <circle cx="20.637" cy="20.637" r="1.587" />
                  </g>
                </svg>
              </div>
              <div>
                <h1 className="text-white text-xl font-bold">Tenzor</h1>
                <p className="text-white/70 text-sm">AI-Powered Calculator</p>
              </div>
            </div>

            {/* Center: Color palette */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20">
              <div className="flex items-center space-x-3">
                <span className="text-white text-sm font-medium">Colors:</span>
                <div className="flex space-x-2">
                  {SWATCHES.map((swatch) => (
                    <div
                      key={swatch}
                      className={`w-8 h-8 rounded-full cursor-pointer transition-all duration-200 transform hover:scale-110 shadow-lg border-2 ${
                        color === swatch
                          ? "border-white scale-110"
                          : "border-white/30"
                      }`}
                      style={{ backgroundColor: swatch }}
                      onClick={() => setColor(swatch)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Action buttons */}
            <div className="flex space-x-3">
              <Button
                onClick={() => setReset(true)}
                className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-2xl py-3 px-6 font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg backdrop-blur-sm border border-white/10"
                variant="default"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reset
              </Button>
              <Button
                onClick={runRoute}
                disabled={isLoading}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-emerald-300 disabled:to-teal-400 text-white rounded-2xl py-3 px-6 font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg backdrop-blur-sm border border-white/10 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg"
                variant="default"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="w-5 h-5 mr-2 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth={4}
                        className="opacity-25"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Calculate
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Canvas area */}
      <div className="absolute inset-0 pt-32 md:pt-24">
        <canvas
          ref={canvasRef}
          id="canvas"
          className="w-full h-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={(e) => {
            e.preventDefault();
            startDrawing(e);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            draw(e);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopDrawing();
          }}
        />
      </div>

      {/* Results */}
      {isLoading && (
        <CustomDraggable
          position={latexPosition}
          onDrag={(newPosition) => setLatexPosition(newPosition)}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/30 min-w-[300px] max-w-[400px]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-700 text-sm font-medium">
                Calculating...
              </span>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            </div>
            <div className="text-center">
              <span className="inline-flex animate-text-gradient bg-gradient-to-r from-[#ACACAC] via-[#363636] to-[#ACACAC] bg-[200%_auto] text-2xl text-center text-transparent font-medium bg-clip-text">
                Processing...
              </span>
            </div>
          </div>
        </CustomDraggable>
      )}
      
      {!isLoading &&
        latexExpression &&
        latexExpression.map((latex, index) => (
          <CustomDraggable
            key={index}
            position={latexPosition}
            onDrag={(newPosition) => setLatexPosition(newPosition)}
          >
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white/30 min-w-[300px] max-w-[500px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-700 text-sm font-medium">
                  Result
                </span>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
              <div className="latex-content text-gray-800 text-base bg-gray-50 rounded-lg p-4 break-words overflow-hidden">
                <div className="math-expression" style={{ fontSize: '16px', lineHeight: '1.5' }}>
                  {latex}
                </div>
              </div>
            </div>
          </CustomDraggable>
        ))}
    </div>
  );
}
