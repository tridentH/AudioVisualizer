import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from './AudioEngine';

class FakeNode {
  connect = vi.fn(); disconnect = vi.fn(); stop = vi.fn(); start = vi.fn();
  buffer: unknown; onended: (() => void) | null = null;
  fftSize = 2048; smoothingTimeConstant = 0;
  gain = { value: 0, setTargetAtTime: vi.fn() };
  getByteFrequencyData(data: Uint8Array) { data.fill(100); }
  getByteTimeDomainData(data: Uint8Array) { data.fill(128); }
}
class FakeContext {
  static instances: FakeContext[] = [];
  state = 'running'; currentTime = 0; sampleRate = 48000; destination = {};
  sources: FakeNode[] = [];
  analyser = new FakeNode(); gain = new FakeNode();
  constructor() { FakeContext.instances.push(this); }
  resume = vi.fn(async () => {}); close = vi.fn(async () => {});
  createAnalyser() { return this.analyser; }
  createGain() { return this.gain; }
  createBufferSource() { const node = new FakeNode(); this.sources.push(node); return node; }
  decodeAudioData = vi.fn(async () => ({ duration: 10 }));
}
const file = () => ({ name: 'tone.wav', type: 'audio/wav', size: 100, arrayBuffer: async () => new ArrayBuffer(16) }) as File;

describe('audio engine lifecycle', () => {
  let engine: AudioEngine;
  beforeEach(() => { FakeContext.instances = []; vi.stubGlobal('AudioContext', FakeContext); engine = new AudioEngine(); });
  afterEach(() => { engine.dispose(); vi.unstubAllGlobals(); });
  it('decodes local data, reuses one graph and keeps analysis independent of volume', async () => {
    await engine.load(file());
    expect(engine.state.playing).toBe(true);
    const ctx = FakeContext.instances[0];
    expect(ctx.analyser.connect).toHaveBeenCalledWith(ctx.gain);
    engine.setVolume(.3, true);
    expect(ctx.gain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, .02);
    await engine.load(file());
    expect(FakeContext.instances).toHaveLength(1);
    expect(ctx.sources[0].stop).toHaveBeenCalled();
    expect(ctx.sources[0].disconnect).toHaveBeenCalled();
  });
  it('preserves playback position across pause and resumes with a fresh source', async () => {
    await engine.load(file());
    const ctx = FakeContext.instances[0]; ctx.currentTime = 3;
    engine.pause(); expect(engine.state.currentTime).toBe(3);
    ctx.currentTime = 7; await engine.play();
    expect(ctx.sources[1].start).toHaveBeenCalledWith(0, 3);
    ctx.currentTime = 9; engine.tick();
    expect(engine.state.currentTime).toBe(5);
  });
  it('clamps seeking and restarts a track after natural completion', async () => {
    await engine.load(file()); engine.pause();
    engine.seek(-20); expect(engine.state.currentTime).toBe(0);
    engine.seek(100); expect(engine.state.currentTime).toBe(10);
    await engine.play();
    const ctx = FakeContext.instances[0];
    expect(ctx.sources[1].start).toHaveBeenCalledWith(0, 0);
    ctx.sources[1].onended?.();
    expect(engine.state.playing).toBe(false); expect(engine.state.currentTime).toBe(10);
  });
  it('rejects unsupported and oversized files before creating a context', async () => {
    await engine.load({ ...file(), name: 'notes.txt', type: 'text/plain' } as File);
    expect(engine.state.error).toContain('Choose an audio');
    await engine.load({ ...file(), size: 151 * 1024 * 1024 } as File);
    expect(engine.state.error).toContain('150 MB');
    expect(FakeContext.instances).toHaveLength(0);
  });
  it('reports corrupt audio and releases the loading state', async () => {
    const original = file(); original.arrayBuffer = async () => {
      FakeContext.instances[0].decodeAudioData.mockRejectedValueOnce(new Error('decode failed'));
      return new ArrayBuffer(16);
    };
    await engine.load(original);
    expect(engine.state.error).toContain('could not be decoded');
    expect(engine.state.loading).toBe(false);
  });
  it('smooths the analysed bands and cleans up the context', async () => {
    await engine.load(file());
    expect(engine.sample(1 / 60, 1, .2).low).toBeGreaterThan(0);
    const ctx = FakeContext.instances[0]; engine.dispose();
    expect(ctx.close).toHaveBeenCalled(); expect(ctx.analyser.disconnect).toHaveBeenCalled();
    expect(ctx.sources[0].disconnect).toHaveBeenCalled();
  });
});
