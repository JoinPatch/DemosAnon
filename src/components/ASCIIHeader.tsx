/** @jsxImportSource preact */
import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import figlet from 'figlet';

interface Props {
  text?: string;                    // what you want to display
  font?: figlet.Fonts;              // any figlet font, default = 'Standard'
  baseColor?: string;               // canvas background
  logoColor?: string;               // colour of the ASCII logo itself
  confettiColors?: string[];        // colours of the flying pieces
  fontSize?: number;                // px
  maxPieces?: number;               // how many "confetti" chars at most
  ejectEveryMs?: number;            // interval between ejections
  pauseKey?: string;                // key to pause/resume
}

type CharPiece = {
  char: string;
  x: number;        // canvas coords (centre)
  y: number;
  vx: number;
  vy: number;
  color: string;
};

const defaultConfetti = ['#E1308D', '#0FD3D3', '#F0C642', '#472394'];

export default function AsciiHeader({
  text = 'YOUR LOGO',
  font = 'Standard',
  baseColor = '#1D0245',
  logoColor = '#fffbeb',
  confettiColors = defaultConfetti,
  fontSize = 16,
  maxPieces = 30,
  ejectEveryMs = 650,
  pauseKey = 'p',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Logical (terminal) cell sizes
  const charW = useRef(0);
  const charH = useRef(0);

  // Parsed logo grid (immutable once built)
  const logoGrid = useRef<{ char: string; col: number; row: number }[]>([]);

  // Flying pieces
  const pieces = useRef<CharPiece[]>([]);
  const timeSinceLastEject = useRef(0);

  // Animation bookkeeping
  const lastTs = useRef(0);
  const rafId = useRef<number | undefined>(undefined);

  // Pause / out-of-viewport flags
  const [paused, setPaused] = useState(false);
  const [offscreen, setOffscreen] = useState(false);

  //----------------------------------------------------------------
  // 1. Build the ASCII logo once (or when text / font changes)
  //----------------------------------------------------------------
  useEffect(() => {
    figlet.text(text, { font }, (err, data) => {
      if (err || !data) return console.error(err);
      const lines = data.split('\n');
      // save logo chars
      logoGrid.current = [];
      lines.forEach((line, r) =>
        [...line].forEach((ch, c) => {
          if (ch !== ' ') logoGrid.current.push({ char: ch, col: c, row: r });
        }),
      );
      // trigger a resize to recompute cell size + redraw
      resizeCanvas();
    });
  }, [text, font]);

  //----------------------------------------------------------------
  // 2. Resize handling
  //----------------------------------------------------------------
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || logoGrid.current.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const { width: cssW, height: cssH } = container.getBoundingClientRect();
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = (ctxRef.current =
      ctxRef.current ?? canvas.getContext('2d')!);
    ctx.scale(dpr, dpr);

    // Measure a monospaced M to get logical cell width/height
    ctx.font = `bold ${fontSize}px "SF Mono", monospace`;
    charW.current = ctx.measureText('M').width;
    charH.current = fontSize * 1.2;

    draw(); // immediate paint after resize
  }, [fontSize]);

  // observer to know when the canvas leaves the viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => setOffscreen(!e.isIntersecting),
      { threshold: 0 },
    );
    if (canvasRef.current) observer.observe(canvasRef.current);
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas]);

  //----------------------------------------------------------------
  // 3. Draw frame (build character map, paint, overlay pieces)
  //----------------------------------------------------------------
  const draw = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const { width: w, height: h } = canvas;

    // background
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);

    if (charW.current === 0) return;

    // centre the logo
    const rows = Math.max(...logoGrid.current.map((c) => c.row)) + 1;
    const cols = Math.max(...logoGrid.current.map((c) => c.col)) + 1;
    const offsetX = (w / window.devicePixelRatio - cols * charW.current) / 2;
    const offsetY = (h / window.devicePixelRatio - rows * charH.current) / 2;

    ctx.font = `bold ${fontSize}px "SF Mono", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = logoColor;

    // logo characters
    for (const cell of logoGrid.current) {
      ctx.fillText(
        cell.char,
        offsetX + cell.col * charW.current,
        offsetY + cell.row * charH.current,
      );
    }

    // confetti pieces
    for (const p of pieces.current) {
      ctx.fillStyle = p.color;
      ctx.fillText(
        p.char,
        p.x - charW.current / 2,
        p.y - charH.current / 2,
      );
    }

    // paused overlay
    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${fontSize * 2}px "SF Mono", monospace`;
      ctx.fillText('PAUSED', w / 2, h / 2);
    }
  }, [baseColor, fontSize, logoColor]);

  //----------------------------------------------------------------
  // 4. Animation loop
  //----------------------------------------------------------------
  const loop = useCallback(
    (ts: number) => {
      rafId.current = requestAnimationFrame(loop);
      if (paused || offscreen) {
        lastTs.current = ts;
        draw();
        return;
      }

      const dt = ts - lastTs.current || 0;
      lastTs.current = ts;
      timeSinceLastEject.current += dt;

      // eject new piece
      if (
        timeSinceLastEject.current >= ejectEveryMs &&
        pieces.current.length < maxPieces &&
        logoGrid.current.length
      ) {
        timeSinceLastEject.current = 0;
        const origin =
          logoGrid.current[
            Math.floor(Math.random() * logoGrid.current.length)
          ];
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 1.5;

        // convert logo grid position to canvas coords
        const rows =
          Math.max(...logoGrid.current.map((c) => c.row)) + 1;
        const cols =
          Math.max(...logoGrid.current.map((c) => c.col)) + 1;
        const offsetX =
          (canvasRef.current!.width / window.devicePixelRatio -
            cols * charW.current) /
          2;
        const offsetY =
          (canvasRef.current!.height / window.devicePixelRatio -
            rows * charH.current) /
          2;

        pieces.current.push({
          char: origin.char,
          x: offsetX + (origin.col + 0.5) * charW.current,
          y: offsetY + (origin.row + 0.5) * charH.current,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color:
            confettiColors[
              Math.floor(Math.random() * confettiColors.length)
            ],
        });
      }

      // update existing pieces
      const damping = 0.98;
      pieces.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= damping;
        p.vy *= damping;
      });
      // remove pieces that are off the canvas
      const { width: w, height: h } = canvasRef.current!;
      pieces.current = pieces.current.filter(
        (p) => p.x >= -50 && p.x <= w + 50 && p.y >= -50 && p.y <= h + 50,
      );

      draw();
    },
    [
      draw,
      ejectEveryMs,
      maxPieces,
      paused,
      offscreen,
      confettiColors,
    ],
  );

  // start / stop rAF
  useEffect(() => {
    rafId.current = requestAnimationFrame(loop);
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [loop]);

  // pause / resume on key press
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === pauseKey.toLowerCase()) {
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pauseKey]);

  //----------------------------------------------------------------
  // Render
  //----------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
      className="relative"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}