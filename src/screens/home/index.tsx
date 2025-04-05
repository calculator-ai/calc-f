import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import axios from "axios";

import { DndContext, useDraggable } from "@dnd-kit/core";
import { SWATCHES } from "@/constants";

interface GeneratedResult {
  expression: string;
  answer: string;
}

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}
interface DraggableItemProps {
  index: number;
  latex: string;
  position: { x: number; y: number };
  setPositions: React.Dispatch<React.SetStateAction<{ [key: number]: { x: number; y: number } }>>;
}


export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("rgb(255, 255, 255)");
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState({});
  const [result, setResult] = useState<GeneratedResult>();
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [eraserMode, setEraserMode] = useState(false);
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [positions, setPositions] = useState<{ [key: number]: { x: number; y: number } }>({});
  const [eraserSize, setEraserSize] = useState(20); 
  const [eraserCursorPosition, setEraserCursorPosition] = useState({ x: -100, y: -100 });

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
        ctx.lineWidth = 3;
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
      });
    };

    return () => {
      document.head.removeChild(script);
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

  const sendData = async () => {
    const canvas = canvasRef.current;

    if (canvas) {
      const response = await axios({
        method: "post",
        url: `${import.meta.env.VITE_API_URL}/calculate`,
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
      resp.data.forEach((data: Response) => {
        setTimeout(() => {
          setResult({
            expression: data.expr,
            answer: data.result,
          });
        }, 1000);
      });
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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.background = "black";
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setIsDrawing(true);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        if (eraserMode) {
          // ✅ Use dynamic eraser size
          const size = eraserSize;
          ctx.clearRect(e.nativeEvent.offsetX - size / 2, e.nativeEvent.offsetY - size / 2, size, size);
        } else {
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
          ctx.stroke();
        }
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

   // ✅ Track mouse movement to position eraser cursor
   const updateCursorPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setEraserCursorPosition({ x: e.clientX, y: e.clientY });
  };
  

  return (
    <>
      <div className="flex gap-10 absolute top-1 justify-center w-full items-center">
        {/* ✅ Reset Button */}
        <Button
          onClick={resetCanvas}
          className="z-20 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          variant="default"
        >
          Reset
        </Button>

        {/* ✅ Eraser Toggle */}
        <Button
          onClick={() => setEraserMode(!eraserMode)}
          className={`z-20 ${eraserMode ? "bg-red-500" : "bg-green-500"} hover:bg-blue-700 text-white font-bold py-2 px-4 rounded`}
          variant="default"
        >
          {eraserMode ? "Eraser ON" : "Eraser OFF"}
        </Button>
        <Button
          onClick={sendData}
          className="z-20 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          variant="default"
        >
          Run
        </Button>

        {/* ✅ Eraser Size Slider */}
        {eraserMode && (
          <div className="z-20 flex items-center">
            <label className="text-white mr-2">Size: {eraserSize}px</label>
            <input
              type="range"
              min="5"
              max="50"
              value={eraserSize}
              onChange={(e) => setEraserSize(parseInt(e.target.value))}
              className="cursor-pointer"
            />
          </div>
        )}

        {/* ✅ Color Palette */}
        <Group className="z-20 w-50">
          {SWATCHES.map((swatch) => (
            <ColorSwatch
              key={swatch}
              color={swatch}
              onClick={() => {
                setColor(swatch);
                setEraserMode(false); // ✅ Disable eraser when selecting a color
              }}
            />
          ))}
        </Group>
      </div>

      <canvas
  ref={canvasRef}
  id="canvas"
  className="absolute top-0 left-0 w-full h-full bg-black"
  onMouseDown={startDrawing}
  onMouseMove={(e) => {
    updateCursorPosition(e);  // ✅ Ensure cursor updates correctly
    draw(e);
  }}
  onMouseUp={stopDrawing}
  onMouseOut={stopDrawing}
/>
     
      {/* ✅ Eraser Cursor (Visible Circle) */}
      {eraserMode && (
        <div
          style={{
            position: "fixed",
            left: eraserCursorPosition.x - eraserSize / 2,
            top: eraserCursorPosition.y - eraserSize / 2,
            width: eraserSize,
            height: eraserSize,
            borderRadius: "50%",
            border: "2px solid white",
            pointerEvents: "none", 
            backgroundColor: "rgba(255, 255, 255, 0.2)", 
            zIndex:1000,
          }}
        />
      )}
      

     <DndContext>
      {latexExpression.map((latex:string, index:number) => (
        <DraggableItem
          key={index}
          index={index}
          latex={latex}
          position={positions[index] || { x: 10, y: 200 }}
          setPositions={setPositions}
        />
      ))}
    </DndContext>
    </>
  );
}


function DraggableItem({ index, latex, position, setPositions }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: index });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: "absolute",
        left: position.x + (transform?.x || 0),
        top: position.y + (transform?.y || 0),
        padding: "10px",
        backgroundColor: "white",
        color: "black",
        borderRadius: "5px",
        boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
        cursor: "grab",
      }}
      onMouseUp={(e) => {
        setPositions((prev) => ({
          ...prev,
          [index]: { x: e.clientX, y: e.clientY },
        }));
      }}
    >
      {latex}
    </div>
  );
}
