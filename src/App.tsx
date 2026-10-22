import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, ArrowDownToLine, ArrowUpRight, AudioLines, Check, ChevronRight, CircleHelp, Disc3, Expand, Github, Globe2, Layers3, LoaderCircle, Maximize2, Minimize2, Orbit, Play, ShieldCheck, SlidersHorizontal, Sparkles, Upload, Waves, X } from 'lucide-react';
import { useAudioEngine } from './hooks/useAudioEngine';
import AudioPlayer from './components/AudioPlayer';
import AudioMeter from './components/AudioMeter';
import ControlPanel from './components/ControlPanel';
import VisualizerCanvas from './components/VisualizerCanvas';
import { readSettings } from './types';
import type { Mode, Settings } from './types';

const modes = [
  { id: 'galaxy' as const, name: 'Particle Galaxy', icon: Orbit, caption: 'A universe in every frequency.', number: '01', detail: 'Bass expands the arms. Mids bend the stars. Highs bring the sparkle.' },
  { id: 'terrain' as const, name: 'Neon Terrain', icon: Waves, caption: 'Let the rhythm shape the horizon.', number: '02', detail: 'Bass lifts the landscape. Mids shape the waves. Highs reveal the details.' },
  { id: 'sphere' as const, name: 'Audio Sphere', icon: Globe2, caption: 'Sound, taking shape.', number: '03', detail: 'Bass sets the scale. Mids sculpt the surface. Highs brighten the geometry.' },
];

export default function App() {
  const { engine, state } = useAudioEngine();
  const [settings, setSettings] = useState(readSettings);
  const [mode, setMode] = useState<Mode>('galaxy');
  const [panel, setPanel] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [uiError, setUiError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLDialogElement>(null);
  const dragDepth = useRef(0);
  const currentMode = modes.find(item => item.id === mode)!;
  const update = useCallback((patch: Partial<Settings>) => setSettings(previous => ({ ...previous, ...patch })), []);
  useEffect(() => { try { localStorage.setItem('audiovisualizer.settings', JSON.stringify(settings)); } catch { /* Preferences are optional. */ } engine.setVolume(settings.volume, settings.muted); }, [settings, engine]);
  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current?.requestFullscreen) await root.current.requestFullscreen();
      else setUiError('Fullscreen is unavailable in this browser. You can use your browser’s fullscreen option.');
    } catch { setUiError('Fullscreen could not open. Try your browser’s fullscreen option.'); }
  }, []);
  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input, select, textarea, button, a, dialog') || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code === 'Space') { event.preventDefault(); state.playing ? engine.pause() : void engine.play(); }
      if (event.key.toLowerCase() === 'f') void toggleFullscreen();
      if (event.key === 'Escape') setPanel(false);
      if (['1', '2', '3'].includes(event.key)) setMode(modes[+event.key - 1].id);
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [engine, state.playing, toggleFullscreen]);
  const upload = () => input.current?.click();
  return <div ref={root} className={`app ${settings.reducedMotion ? 'reduced-motion' : ''}`}>
    <div className="page-shell">
      <header className="topbar">
        <a className="brand" href="#main" aria-label="AudioVisualizer home"><span className="brand-mark"><AudioLines size={23} strokeWidth={1.8} /></span><span>Audio<span className="brand-light">Visualizer</span><i>BETA</i></span></a>
        <div className="header-actions"><span className="privacy-badge"><span className="status-dot" /> Local sound. Infinite space.</span><span className="header-divider" /><button className="icon-button" aria-label="About AudioVisualizer" title="About & keyboard shortcuts" onClick={() => info.current?.showModal()}><CircleHelp size={18} /></button><a className="icon-button" href="https://github.com/tridentH/AudioVisualizer" target="_blank" rel="noreferrer" aria-label="View source on GitHub" title="View source on GitHub"><Github size={18} /></a></div>
      </header>
      <main id="main">
        <section className="intro"><div><div className="eyebrow"><span /> AN EXPERIMENT IN SOUND & SPACE</div><h1>See sound. <span>Feel everything.</span></h1></div><p>Turn your music into a world of its own.<br />Real-time audio. Three dimensions. Endless possibilities.</p></section>
        <div className="workspace-toolbar"><div className="mode-selector" role="group" aria-label="Visualization mode">{modes.map(item => <button key={item.id} onClick={() => setMode(item.id)} className={mode === item.id ? 'active' : ''} aria-pressed={mode === item.id} title={`${item.name} (${item.number[1]})`}><item.icon size={16} /><span>{item.name}</span>{mode === item.id && <span className="tab-dot" />}</button>)}</div><button className={`settings-button ${panel ? 'active' : ''}`} onClick={() => setPanel(!panel)} aria-expanded={panel} aria-controls="settings"><SlidersHorizontal size={15} /><span>Customize</span></button></div>
        <section className={`visual-stage ${state.name ? 'has-track' : ''} ${dragging ? 'dragging' : ''}`} aria-label={`${currentMode.name} visualization. Drag to orbit, or drop an audio file.`}
          onDragEnter={e => { e.preventDefault(); dragDepth.current++; if (e.dataTransfer.types.includes('Files')) setDragging(true); }}
          onDragOver={e => e.preventDefault()} onDragLeave={e => { e.preventDefault(); if (--dragDepth.current <= 0) setDragging(false); }}
          onDrop={e => { e.preventDefault(); dragDepth.current = 0; setDragging(false); const file = e.dataTransfer.files[0]; if (file) void engine.load(file); }}>
          <div className="stage-stars" aria-hidden="true" /><div className="stage-glow" aria-hidden="true" />
          <div className="canvas-wrap"><VisualizerCanvas engine={engine} settings={settings} preview={!state.name} mode={mode} /></div>
          <div className="stage-top"><span className="scene-tag"><span className={`status-dot ${state.playing ? 'live' : ''}`} />{state.playing ? 'AUDIO REACTIVE' : state.name ? 'PAUSED' : 'EXPLORATION MODE'}</span><div className="stage-top-right"><span className="quality-tag"><Layers3 size={12} />{settings.quality} quality</span><button className="icon-button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title="Fullscreen (F)">{fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button></div></div>
          {!state.name && <div className="welcome"><div className="welcome-symbol"><Disc3 size={26} strokeWidth={1.4} /><span><Sparkles size={11} /></span></div><div className="eyebrow welcome-eyebrow">PRESS PLAY ON A NEW PERSPECTIVE</div><h2>Your music.<br />Another dimension.</h2><p>Drop a track and watch your sound<br className="desktop-break" /> become something you can see.</p><button className="primary-button" onClick={upload} disabled={state.loading}>{state.loading ? <LoaderCircle size={16} className="spin" /> : <Upload size={16} />}{state.loading ? 'Opening audio…' : 'Choose audio file'}<ArrowUpRight size={16} /></button><button className="demo-button" onClick={() => void engine.demo()} disabled={state.loading}><Play size={12} fill="currentColor" /> Or explore the demo <ChevronRight size={13} /></button><span className="file-hint">MP3, WAV, OGG & more · up to 150 MB</span></div>}
          {state.name && <button className="replace-track" onClick={upload}><Upload size={14} /> Drop or choose another track</button>}
          <div className="stage-bottom"><div className="scene-caption"><span className="scene-number">{currentMode.number}</span><div><h3>{currentMode.name}</h3><p>{currentMode.caption}</p></div></div><div className="stage-bottom-right"><span className="orbit-hint"><Expand size={12} /> Drag to orbit</span><AudioMeter engine={engine} settings={settings} /></div></div>
          {panel && <div id="settings"><ControlPanel settings={settings} update={update} close={() => setPanel(false)} /></div>}
          {dragging && <div className="drop-overlay"><ArrowDownToLine size={36} /><h2>Let your sound in.</h2><p>Drop your audio file to begin.</p></div>}
        </section>
        <div className="error-slot" role="status" aria-live="polite">{(state.error || uiError) && <div className="error-message"><span>{state.error || uiError}</span>{uiError && <button className="icon-button" onClick={() => setUiError('')} aria-label="Dismiss message"><X size={14} /></button>}</div>}</div>
        <AudioPlayer engine={engine} state={state} settings={settings} update={update} upload={upload} />
        <div className="below-player"><span><ShieldCheck size={13} /> Your audio stays on your device. Always.</span><span><Activity size={13} /> Powered by your frequencies.</span></div>
      </main>
      <footer><span>BUILT FOR THE WAY MUSIC FEELS.</span><span>Headphones on. World off. <HeadphoneMark /></span></footer>
    </div>
    <input ref={input} className="sr-only" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.webm" aria-label="Choose an audio file" onChange={e => { const file = e.target.files?.[0]; if (file) void engine.load(file); e.target.value = ''; }} />
    <dialog ref={info} className="about-dialog" onClick={e => { if (e.target === e.currentTarget) info.current?.close(); }}><div className="panel-heading"><span><AudioLines size={20} /> Behind the sound</span><button className="icon-button" onClick={() => info.current?.close()} aria-label="Close about"><X size={19} /></button></div><h2>A little signal.<br />A whole new world.</h2><p>AudioVisualizer uses the browser’s Web Audio analyser for FFT-based frequency analysis. Each frame splits the spectrum into bass (20–250 Hz), mids (250 Hz–4 kHz), and highs (4–16 kHz).</p><p>{currentMode.detail} A change in energy triggers estimated onsets. These are visual cues, rather than precise musical beat tracking.</p><p>Audio files are decoded and played entirely on your device. The demo is an original synthesized loop. Nothing is uploaded.</p><div className="shortcuts"><span><kbd>Space</kbd> Play / pause</span><span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> Switch scene</span><span><kbd>F</kbd> Fullscreen</span><span><kbd>Esc</kbd> Close panel</span></div><a href="https://github.com/tridentH/AudioVisualizer" target="_blank" rel="noreferrer" className="demo-button">Explore the source <ArrowUpRight size={14} /></a></dialog>
  </div>;
}
function HeadphoneMark() { return <Check size={12} />; }
