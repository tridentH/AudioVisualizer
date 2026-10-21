export const FFT_SIZE = 2048;

/** FFT bin k represents k * sampleRate / fftSize Hz. Upper bounds are exclusive. */
export function bandEnergy(data: Uint8Array, sampleRate: number, fftSize: number, lowHz: number, highHz: number): number {
  const start = Math.max(0, Math.ceil(lowHz * fftSize / sampleRate));
  const end = Math.min(data.length, Math.ceil(highHz * fftSize / sampleRate));
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) sum += (data[i] / 255) ** 2;
  return Math.sqrt(sum / (end - start));
}

/** Frame-rate independent exponential smoothing. */
export function smooth(previous: number, target: number, seconds: number, delta: number): number {
  return previous + (target - previous) * (1 - Math.exp(-Math.max(0, delta) / Math.max(0.001, seconds)));
}

export class OnsetDetector {
  private average = 0.08;
  private previous = 0;
  private lastOnset = -Infinity;
  reset() { this.average = 0.08; this.previous = 0; this.lastOnset = -Infinity; }
  update(energy: number, time: number, delta: number): boolean {
    const onset = energy > Math.max(0.13, this.average * 1.35) && energy - this.previous > 0.035 && time - this.lastOnset > 0.24;
    this.average = smooth(this.average, energy, 0.7, delta);
    this.previous = energy;
    if (onset) this.lastOnset = time;
    return onset;
  }
}
