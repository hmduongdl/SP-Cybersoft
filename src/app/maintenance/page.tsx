'use client';
import { useEffect, useState, useRef } from 'react';
import { Home } from 'lucide-react';
import Link from 'next/link';

export default function MaintenancePage() {
  const [progress, setProgress] = useState(23);
  const [pDir, setPDir] = useState(1);
  const floatRef = useRef<HTMLDivElement>(null);

  // Animate progress bar
  useEffect(() => {
    const iv = setInterval(() => {
      setProgress(p => {
        const next = p + pDir * (0.3 + Math.random() * 0.4);
        if (next >= 71) setPDir(-1);
        if (next <= 23) setPDir(1);
        return Math.min(Math.max(next, 23), 71);
      });
    }, 200);
    return () => clearInterval(iv);
  }, [pDir]);

  // Spawn floating sad emojis
  useEffect(() => {
    const emojis = ['😢', '😭', '😔', '🥺', '😞', '💔', '🫠', '😿', '🙁', '😪'];
    const spawn = () => {
      if (!floatRef.current) return;
      const el = document.createElement('div');
      el.style.cssText = `
        position:absolute;
        left:${Math.random() * 90}%;
        bottom:-40px;
        font-size:${14 + Math.random() * 16}px;
        animation: floatUp ${6 + Math.random() * 8}s linear forwards;
        opacity:0;
        pointer-events:none;
      `;
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      floatRef.current.appendChild(el);
      setTimeout(() => el.remove(), 14000);
    };
    const iv = setInterval(spawn, 1200);
    for (let i = 0; i < 5; i++) setTimeout(spawn, i * 400);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

        @keyframes floatUp {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.5; }
          90%  { opacity: 0.3; }
          100% { transform: translateY(-110vh) rotate(20deg); opacity: 0; }
        }
        @keyframes robot-float {
          0%,100% { transform: translateY(0) rotate(-2deg); }
          50%     { transform: translateY(-8px) rotate(2deg); }
        }
        @keyframes tears {
          from { opacity: .6; transform: translateY(0); }
          to   { opacity: 1; transform: translateY(3px); }
        }
        @keyframes pulse-dot {
          0%,100% { opacity: 1; transform: scale(1); }
          50%     { opacity: .4; transform: scale(.7); }
        }
        @keyframes cursor-blink {
          0%,100% { opacity: 1; } 50% { opacity: 0; }
        }
        @keyframes bg-grid {
          0%   { transform: translateY(0); }
          100% { transform: translateY(40px); }
        }
        @keyframes glitch-main {
          0%,90%,100% { transform: translate(0); }
          92% { transform: translate(-2px, 1px); }
          94% { transform: translate(2px, -1px); }
          96% { transform: translate(-1px, 2px); }
          98% { transform: translate(1px, -2px); }
        }
        @keyframes glitch-before {
          0%,89%,100% { transform: translate(0); opacity: 0; }
          90% { transform: translate(-3px); opacity: 1; }
          91% { transform: translate(3px); opacity: 1; }
          92% { transform: translate(0); opacity: 0; }
        }
        @keyframes glitch-after {
          0%,93%,100% { transform: translate(0); opacity: 0; }
          94% { transform: translate(3px); opacity: 1; }
          95% { transform: translate(-3px); opacity: 1; }
          96% { transform: translate(0); opacity: 0; }
        }
        .glitch {
          position: relative;
          font-family: 'Space Mono', monospace;
          font-size: 24px;
          font-weight: 700;
          color: white;
          letter-spacing: .08em;
          text-transform: uppercase;
          animation: glitch-main 4s infinite;
        }
        .glitch::before, .glitch::after {
          content: attr(data-text);
          position: absolute; top: 0; left: 0; right: 0;
          overflow: hidden;
        }
        .glitch::before {
          color: #f87171;
          clip-path: polygon(0 0, 100% 0, 100% 35%, 0 35%);
          animation: glitch-before 4s infinite;
        }
        .glitch::after {
          color: #34d399;
          clip-path: polygon(0 65%, 100% 65%, 100% 100%, 0 100%);
          animation: glitch-after 4s infinite;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#050711',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        padding: '40px 20px',
      }}>
        {/* Animated grid bg */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(80,80,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(80,80,255,.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          animation: 'bg-grid 8s linear infinite',
        }} />

        {/* Scanlines overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.12) 2px, rgba(0,0,0,.12) 4px)',
        }} />

        {/* Floating emojis container */}
        <div ref={floatRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} />

        {/* Corner decorations */}
        <div style={{ position: 'absolute', top: 20, left: 20, fontSize: 48, opacity: .06, animation: 'robot-float 5s ease-in-out infinite' }}>😢</div>
        <div style={{ position: 'absolute', bottom: 20, right: 20, fontSize: 48, opacity: .06, animation: 'robot-float 5s ease-in-out infinite 2s' }}>🔧</div>

        {/* Main card */}
        <div style={{
          position: 'relative', zIndex: 2,
          background: '#0e1228',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 24, padding: '48px 40px',
          maxWidth: 460, width: '100%',
          textAlign: 'center',
          backdropFilter: 'blur(12px)',
        }}>
          {/* Robot */}
          <div style={{ fontSize: 72, animation: 'robot-float 3s ease-in-out infinite', filter: 'drop-shadow(0 0 20px rgba(100,100,255,.4))' }}>
            🤖
          </div>
          {/* Tears */}
          <div style={{ fontSize: 22, letterSpacing: 6, marginBottom: 24, animation: 'tears .8s ease-in-out infinite alternate' }}>
            💧 💧 💧
          </div>

          {/* Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#f87171', boxShadow: '0 0 8px #f87171',
              animation: 'pulse-dot 1.2s ease-in-out infinite',
            }} />
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#f87171', letterSpacing: '.1em' }}>
              SYSTEM OFFLINE
            </span>
          </div>

          {/* Glitch title */}
          <h1 className="glitch" data-text="HỆ THỐNG BẢO TRÌ" style={{ marginBottom: 16 }}>
            HỆ THỐNG BẢO TRÌ
          </h1>

          <p style={{ color: '#9496b0', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            Chúng tôi đang nâng cấp để mang lại trải nghiệm tốt hơn.
            Quá trình có thể kéo dài đến vài giờ.
          </p>

          {/* Terminal box */}
          <div style={{
            background: '#090c1a',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: 12, padding: 16, marginBottom: 24,
            textAlign: 'left',
            fontFamily: "'Space Mono',monospace", fontSize: 11,
          }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              {['#ff5f57', '#febc2e', '#28c840'].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
              ))}
              <span style={{ color: 'rgba(255,255,255,.2)', fontSize: 10, marginLeft: 4 }}>sp-cybersoft-system — bash</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,.35)', marginBottom: 5 }}>$ <span style={{ color: '#34d399' }}>sudo systemctl status sp-cybersoft-ai</span></div>
            <div style={{ color: 'rgba(255,255,255,.35)', marginBottom: 5 }}>● <span style={{ color: '#f87171' }}>sp-cybersoft-ai.service — FAILED (crashed)</span></div>
            <div style={{ color: 'rgba(255,255,255,.35)', marginBottom: 5 }}>⚠ <span style={{ color: '#fbbf24' }}>Rebuilding modules... please wait</span></div>
            <div style={{ color: 'rgba(255,255,255,.35)' }}>$ <span style={{ color: '#34d399' }}>npm run build</span>
              <span style={{ display: 'inline-block', width: 8, height: 13, background: '#34d399', marginLeft: 2, verticalAlign: 'middle', animation: 'cursor-blink .8s step-end infinite' }} />
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: "'Space Mono',monospace", marginBottom: 8 }}>
              <span>Tiến trình cập nhật</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255, 255, 255, 0.06)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #4f7de8, #34d399)',
                borderRadius: 999,
                transition: 'width .2s ease',
              }} />
            </div>
          </div>

          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #4f7de8, #152052)',
            color: 'white', borderRadius: 12,
            padding: '12px 28px', fontSize: 14, fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 4px 24px rgba(79, 125, 232, 0.35)',
          }}>
            <Home size={16} /> Quay lại trang chủ
          </Link>
        </div>
      </div>
    </>
  );
}
