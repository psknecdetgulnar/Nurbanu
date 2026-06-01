'use client';

import { useEffect, useRef, useState } from 'react';

// Katakana + hex + semboller — klasik Matrix paleti
const CHARS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
  '0123456789ABCDEF!@#$%<>{}[]';

interface Props {
  children: React.ReactNode;
  className?: string;
  /** Yeşil yağmurun sürdüğü ms */
  rainMs?: number;
  /** Fade-out süresi ms */
  fadeMs?: number;
}

export function MatrixRevealHero({
  children,
  className = '',
  rainMs = 2400,
  fadeMs = 700,
}: Props) {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const wrap   = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    // Capture as non-null for use inside nested frame function
    const cv = canvas;

    // Reduced-motion: animasyonu atla
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDone(true);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = ctx;

    // Canvas boyutunu wrapper'a eşitle
    const { width, height } = wrap.getBoundingClientRect();
    canvas.width  = Math.ceil(width)  || 500;
    canvas.height = Math.ceil(height) || 140;

    // İlk kare: metin arkasını tamamen kapat
    ctx.fillStyle = '#08090A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const FONT = 14;
    const cols  = Math.ceil(canvas.width / FONT);
    // Sütunlar rastgele negatif Y'den başlasın (stagger)
    const drops = Array.from({ length: cols }, (_, i) => -(Math.random() * 18 + (i % 7)));

    let raf: number;
    const t0 = performance.now();

    function frame(now: number) {
      const ms = now - t0;

      // ── Bitti ───────────────────────────────────────────────────
      if (ms >= rainMs + fadeMs) {
        cv.style.opacity = '0';
        setDone(true);
        return;
      }

      // ── Fade-out fazı ───────────────────────────────────────────
      if (ms >= rainMs) {
        const t = (ms - rainMs) / fadeMs;
        cv.style.opacity = (1 - t).toFixed(3);
        raf = requestAnimationFrame(frame);
        return;
      }

      // ── Matrix rain ─────────────────────────────────────────────
      // Yarı-saydam overlay: kuyruk efekti için
      cx.fillStyle = 'rgba(8,9,10,0.06)';
      cx.fillRect(0, 0, cv.width, cv.height);

      cx.font = `${FONT}px "JetBrains Mono", ui-monospace, monospace`;

      for (let i = 0; i < cols; i++) {
        const y = drops[i] * FONT;
        if (y < 0) { drops[i] += 0.35; continue; }

        const rand = () => CHARS[Math.floor(Math.random() * CHARS.length)];

        // Parlak baş karakteri (beyaz-yeşil)
        cx.fillStyle = '#CCFFCC';
        cx.fillText(rand(), i * FONT, y);

        // Orta parlaklık — bir önceki satır
        if (drops[i] > 1) {
          cx.fillStyle = '#00DD44';
          cx.fillText(rand(), i * FONT, y - FONT);
        }
        // Koyu kuyruk — iki önceki satır
        if (drops[i] > 3) {
          cx.fillStyle = '#007722';
          cx.fillText(rand(), i * FONT, y - FONT * 2);
        }
        // Çok soluk iz
        if (drops[i] > 6) {
          cx.fillStyle = '#003311';
          cx.fillText(rand(), i * FONT, y - FONT * 3);
        }

        // Ekran sonuna ulaşınca rastgele sıfırla
        if (y > cv.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.42;
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [rainMs, fadeMs]);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Başlık metni — yağmur bitmeden görünmez, sonra fade-in */}
      <div
        style={{
          opacity: done ? 1 : 0,
          transition: done ? 'opacity 0.55s ease' : 'none',
        }}
      >
        {children}
      </div>

      {/* Matrix rain canvas — metin üzerinde yüzer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
