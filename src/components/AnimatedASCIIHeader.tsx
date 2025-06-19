// components/AnimatedAsciiHeader.jsx
import React, { useRef, useEffect, useState } from "react";

interface AnimatedAsciiHeaderProps {
  text?: string;
  font?: string;
  pixelSize?: number;
  background?: string;
  textColor?: string;
  particleColors?: string[];
  maxParticles?: number;
  speed?: number;
}

/**
 * A drop‑in replacement for the Jules header.
 *
 * Props
 * -----
 * @param {string} text               Plain text that will be rendered as FIGlet ASCII (default: "DEMO")
 * @param {string} font               FIGlet font name – any font shipped with figlet.js (default: "Standard")
 * @param {number} pixelSize          Base pixel size in CSS pixels (default: 6)
 * @param {string} background         Canvas background colour (default: "#1D0245")
 * @param {string} textColor          Colour for the big FIGlet text (default: "#ffffff")
 * @param {string[]} particleColors   Array of colours for wandering ASCII particles
 * @param {number} maxParticles       Upper‑bound on the number of particles on screen (default: 40)
 * @param {number} speed              Multiplier that controls particle velocity (default: 1.8)
 */
export default function AnimatedAsciiHeader({
  text = "DEMO",
  font = "Standard",
  pixelSize = 6,
  background = "#1D0245",
  textColor = "#ffffff",
  particleColors = ["#E1308D", "#0FD3D3", "#F0C642", "#472394"],
  maxParticles = 40,
  speed = 1.8,
}: AnimatedAsciiHeaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logoLines, setLogoLines] = useState<string[]>([]);
  const particlesRef = useRef<any[]>([]);

  // Create ASCII art manually instead of using figlet
  useEffect(() => {
    const createAsciiArt = (text: string) => {
      // Simple ASCII art representation
      const lines = [
        `  ___  ___  ___  ___  ___  ___  ___  ___ `,
        ` |   ||   ||   ||   ||   ||   ||   ||   |`,
        ` | D || E || M || O || S ||   || A || N |`,
        ` |___||___||___||___||___||___||___||___|`,
        `  ___  ___  ___  ___ `,
        ` |   ||   ||   ||   |`,
        ` | O || N ||   ||   |`,
        ` |___||___||___||___|`
      ];
      setLogoLines(lines);
    };

    createAsciiArt(text);
  }, [text]);

  // Resize canvas whenever its container changes size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const { width, height } = canvas.parentElement!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    return () => ro.disconnect();
  }, []);

  // Animation loop
  useEffect(() => {
    if (logoLines.length === 0) return; // wait until ASCII art ready

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const spawn = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      return {
        char: ["+", "*", "o", "x", "-", ":", ";", "~"][Math.floor(Math.random() * 8)],
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
      };
    };

    const step = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      // Update particles
      if (particlesRef.current.length < maxParticles) {
        particlesRef.current.push(spawn());
      }
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        // wrap around edges
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
      });

      // Draw
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);

      // big ASCII logo
      ctx.fillStyle = textColor;
      ctx.font = `bold ${pixelSize * 2}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const lineHeight = pixelSize * 1.6;
      const totalHeight = logoLines.length * lineHeight;
      const top = (h - totalHeight) / 2;
      logoLines.forEach((line, idx) => {
        ctx.fillText(line, w / 2, top + idx * lineHeight);
      });

      // wandering ASCII particles
      ctx.font = `${pixelSize * 1.2}px monospace`;
      ctx.textBaseline = "top";
      particlesRef.current.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.fillText(p.char, p.x, p.y);
      });

      requestAnimationFrame(step);
    };

    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [logoLines, pixelSize, background, textColor, particleColors, speed, maxParticles]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
        aria-hidden="true"
      />
      {/* Fallback for debugging */}
      <div style={{ 
        position: 'absolute', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        color: textColor,
        fontSize: '2rem',
        fontFamily: 'monospace',
        zIndex: 1,
        pointerEvents: 'none'
      }}>
        {text}
      </div>
    </>
  );
}
