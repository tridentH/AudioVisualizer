import { Headphones, LoaderCircle, Pause, Play, RotateCcw, Upload, Volume2, VolumeX } from 'lucide-react';
import type { AudioEngine, PlaybackState } from '../audio/AudioEngine';
import type { Settings } from '../types';

export function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; }
interface Props { engine: AudioEngine; state: PlaybackState; settings: Settings; update: (patch: Partial<Settings>) => void; upload: () => void }
export default function AudioPlayer({ engine, state, settings, update, upload }: Props) {
  const loaded = state.duration > 0;
  return <section className="player" aria-label="Audio playback">
    <div className={`track-art ${state.playing ? 'playing' : ''}`}><Headphones size={21} /></div>
    <button className="track-detail" onClick={upload} title="Choose another audio file">
      <strong>{state.loading ? 'Opening your audio…' : state.name || 'Your next favorite view'}</strong>
      <span>{state.loading ? 'Decoding locally in your browser' : loaded ? 'LOCAL AUDIO · PRIVATE SESSION' : 'Choose a track to get started'}</span>
    </button>
    <div className="transport">
      <button className="icon-button restart" disabled={!loaded || state.loading} onClick={() => engine.seek(0)} aria-label="Restart track" title="Restart"><RotateCcw size={17} /></button>
      <button className="play-button" disabled={!loaded || state.loading} onClick={() => state.playing ? engine.pause() : void engine.play()} aria-label={state.playing ? 'Pause' : 'Play'} title="Play / pause (Space)">{state.loading ? <LoaderCircle size={19} className="spin" /> : state.playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button>
    </div>
    <div className="seek-control"><span>{formatTime(state.currentTime)}</span><input aria-label="Seek position" aria-valuetext={`${formatTime(state.currentTime)} of ${formatTime(state.duration)}`} type="range" min="0" max={state.duration || 1} step="0.1" value={state.currentTime} disabled={!loaded || state.loading} onChange={e => engine.seek(+e.target.value)} style={{ '--progress': `${state.duration ? state.currentTime / state.duration * 100 : 0}%` } as React.CSSProperties} /><span>{formatTime(state.duration)}</span></div>
    <div className="volume-control"><button className="icon-button" onClick={() => update({ muted: !settings.muted })} aria-label={settings.muted ? 'Unmute' : 'Mute'}>{settings.muted || settings.volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={settings.muted ? 0 : settings.volume} onChange={e => update({ volume: +e.target.value, muted: false })} /></div>
    <button className="icon-button player-upload" onClick={upload} aria-label="Upload audio" title="Choose audio"><Upload size={17} /></button>
  </section>;
}
