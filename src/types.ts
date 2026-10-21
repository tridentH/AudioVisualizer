export const palettes = {
  Cyberpunk: ['#a88aff', '#48d9fa', '#f286cf'],
  Ocean: ['#40c9dd', '#7aa5ff', '#76f1bd'],
  Sunset: ['#ff956b', '#ff688d', '#f7d38a'],
  Monochrome: ['#d3def5', '#94a3b8', '#ffffff'],
} as const;
export type Mode = 'galaxy' | 'terrain' | 'sphere';
export interface Settings {
  palette: keyof typeof palettes; sensitivity: number; smoothing: number; intensity: number;
  quality: 'Low' | 'Medium' | 'High'; reducedMotion: boolean; volume: number; muted: boolean;
}
export const defaults: Settings = { palette: 'Cyberpunk', sensitivity: 1.25, smoothing: 0.55, intensity: 0.85, quality: 'Medium', reducedMotion: false, volume: 0.65, muted: false };
export function readSettings(): Settings {
  const result = { ...defaults, reducedMotion: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches };
  try {
    const saved = JSON.parse(localStorage.getItem('audiovisualizer.settings') ?? '{}');
    if (saved.palette in palettes) result.palette = saved.palette;
    if (['Low', 'Medium', 'High'].includes(saved.quality)) result.quality = saved.quality;
    for (const key of ['sensitivity', 'smoothing', 'intensity', 'volume'] as const) {
      const max = key === 'sensitivity' ? 3 : key === 'intensity' ? 1.5 : 1;
      if (Number.isFinite(saved[key])) result[key] = Math.max(0, Math.min(max, saved[key]));
    }
    for (const key of ['reducedMotion', 'muted'] as const) if (typeof saved[key] === 'boolean') result[key] = saved[key];
  } catch { /* Private browsing or corrupt preferences: use defaults. */ }
  return result;
}
