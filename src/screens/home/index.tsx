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

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("rgb(255, 255, 255)");
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState<Record<string, string>>({});
  const [result, setResult] = useState<GeneratedResult>();
  const [eraserMode, setEraserMode] = useState(false);
  const [latexExpression, setLatexExpression] = useState<string[]>([]);
  const [positions, setPositions] = useState<Record<number, { x: number; y: number }>>({});
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
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.MathJax.Hub.Config({
        tex2jax: {
          inlineMath: [["$", "$"], ["\\(", "\\)"]],
        },
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const renderLatexToCanvas = (expression: string, answer: string) => {
    const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
    setLatexExpression((prev) => [...prev, latex]);

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
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/calculate`, {
        image: canvas.toDataURL("image/png"),
        dict_of_vars: dictOfVars,
      });

      const resp = response.data;
      console.log("Response", resp);

      resp.data.forEach((data: Response) => {
        if (data.assign) {
          setDictOfVars((prev) => ({ ...prev, [data.expr]: data.result }));
        }
      });

      resp.data.forEach((data: Response) => {
        setTimeout(() => {
          setResult({ expression: data.expr, answer: data.result });
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

  return (
    <>
      <div className="flex gap-10 absolute top-1 justify-center w-full items-center">
        <Button onClick={resetCanvas} className="z-20 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Reset
        </Button>

        <Button onClick={() => setEraserMode(!eraserMode)} className={`z-20 ${eraserMode ? "bg-red-500" : "bg-green-500"} text-white font-bold py-2 px-4 rounded`}>
          {eraserMode ? "Eraser ON" : "Eraser OFF"}
        </Button>

        <Button onClick={sendData} className="z-20 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Run
        </Button>

        {eraserMode && (
          <div className="z-20 flex items-center">
            <label className="text-white mr-2">Size: {eraserSize}px</label>
            <input type="range" min="5" max="50" value={eraserSize} onChange={(e) => setEraserSize(Number(e.target.value))} />
          </div>
        )}

        <Group className="z-20 w-50">
          {SWATCHES.map((swatch) => (
            <ColorSwatch key={swatch} color={swatch} onClick={() => { setColor(swatch); setEraserMode(false); }} />
          ))}
        </Group>
      </div>

      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full bg-black" />

      <DndContext>
        {latexExpression.map((latex, index) => (
          <DraggableItem key={index} index={index} latex={latex} position={positions[index] || { x: 10, y: 200 }} setPositions={setPositions} />
        ))}
      </DndContext>
    </>
  );
}

interface DraggableItemProps {
  index: number;
  latex: string;
  position: { x: number; y: number };
  setPositions: React.Dispatch<React.SetStateAction<Record<number, { x: number; y: number }>>>;
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
        setPositions((prev) => ({ ...prev, [index]: { x: e.clientX, y: e.clientY } }));
      }}
    >
      {latex}
    </div>
  );
}
