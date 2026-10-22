import { useEffect, useRef } from 'react';
import type { AudioEngine } from '../audio/AudioEngine';
import type { Settings } from '../types';
import { palettes } from '../types';

export default function AudioMeter({ engine, settings }: { engine: AudioEngine; settings: Settings }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current, ctx = element?.getContext('2d');
    if (!element || !ctx) return;
    let id = 0;
    function draw() {
      if (!document.hidden) {
        ctx!.clearRect(0, 0, 168, 30);
        const f = engine.frame;
        for (let i = 0; i < 32; i++) {
          const bin = Math.floor(Math.pow(i / 31, 2) * 700);
          const height = Math.max(2, (engine.state.playing ? f.spectrum[bin] / 255 : 0) * 28);
          ctx!.fillStyle = palettes[settings.palette][i < 12 ? 0 : 1];
          ctx!.globalAlpha = .35 + height / 45;
          ctx!.fillRect(i * 5.25, 30 - height, 2.5, height);
        }
      }
      id = requestAnimationFrame(draw);
    }
    draw(); return () => cancelAnimationFrame(id);
  }, [engine, settings.palette]);
  return <div className="audio-meter"><canvas ref={canvas} width="168" height="30" aria-hidden="true" /><span>20 Hz <span>FFT · 2048</span> 16 kHz</span></div>;
}
