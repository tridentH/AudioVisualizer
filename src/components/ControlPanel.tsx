import { Check, ChevronDown, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import type { Settings } from '../types';
import { defaults, palettes } from '../types';

interface Props { settings: Settings; update: (patch: Partial<Settings>) => void; close: () => void }
export default function ControlPanel({ settings, update, close }: Props) {
  return <aside className="settings-panel" aria-label="Visual settings">
    <div className="panel-heading"><span><SlidersHorizontal size={15} /> Make it yours</span><button className="icon-button" onClick={close} aria-label="Close settings"><X size={17} /></button></div>
    <fieldset><legend>Color palette</legend><div className="palette-grid">
      {Object.entries(palettes).map(([name, colors]) => <button key={name} className={`palette ${settings.palette === name ? 'selected' : ''}`} aria-pressed={settings.palette === name} onClick={() => update({ palette: name as Settings['palette'] })}>
        <span className="swatches">{colors.map(c => <i key={c} style={{ background: c }} />)}</span><span>{name}</span>{settings.palette === name && <Check size={12} />}
      </button>)}
    </div></fieldset>
    <div className="panel-divider" />
    <label className="setting-slider"><span>Sensitivity <output>{settings.sensitivity.toFixed(2)}×</output></span><input aria-label="Sensitivity" type="range" min="0.25" max="3" step="0.05" value={settings.sensitivity} onChange={e => update({ sensitivity: +e.target.value })} /></label>
    <label className="setting-slider"><span>Smoothing <output>{Math.round(settings.smoothing * 100)}%</output></span><input aria-label="Smoothing" type="range" min="0" max="1" step="0.01" value={settings.smoothing} onChange={e => update({ smoothing: +e.target.value })} /></label>
    <label className="setting-slider"><span>Visual intensity <output>{Math.round(settings.intensity * 100)}%</output></span><input aria-label="Visual intensity" type="range" min="0" max="1.5" step="0.05" value={settings.intensity} onChange={e => update({ intensity: +e.target.value })} /></label>
    <div className="panel-divider" />
    <label className="quality-select"><span>Render quality</span><span className="select-wrap"><select aria-label="Render quality" value={settings.quality} onChange={e => update({ quality: e.target.value as Settings['quality'] })}>{['Low', 'Medium', 'High'].map(x => <option key={x}>{x}</option>)}</select><ChevronDown size={12} /></span></label>
    <label className="motion-toggle"><span>Reduced motion<small>Gentler movement, same music.</small></span><input type="checkbox" checked={settings.reducedMotion} onChange={e => update({ reducedMotion: e.target.checked })} /><span className="toggle" aria-hidden="true" /></label>
    <button className="reset-button" onClick={() => update({ ...defaults, volume: settings.volume, muted: settings.muted })}><RotateCcw size={12} /> Reset visual settings</button>
  </aside>;
}
