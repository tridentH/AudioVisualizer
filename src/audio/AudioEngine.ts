import { bandEnergy, FFT_SIZE, OnsetDetector, smooth } from './analysis';

export interface PlaybackState {
  name: string; duration: number; currentTime: number; playing: boolean; loading: boolean; error: string;
}
export interface AudioFrame { low: number; mid: number; high: number; beat: number; spectrum: Uint8Array; waveform: Uint8Array }

export class AudioEngine {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private offset = 0;
  private startedAt = 0;
  private requestId = 0;
  private listeners = new Set<() => void>();
  private detector = new OnsetDetector();
  private analysisTime = 0;
  private volume = 0.7;
  private muted = false;
  state: PlaybackState = { name: '', duration: 0, currentTime: 0, playing: false, loading: false, error: '' };
  readonly frame: AudioFrame = { low: 0, mid: 0, high: 0, beat: 0, spectrum: new Uint8Array(FFT_SIZE / 2), waveform: new Uint8Array(FFT_SIZE).fill(128) };

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(patch: Partial<PlaybackState> = {}) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  private async initialize() {
    if (!this.context) {
      this.context = new AudioContext();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0;
      this.gain = this.context.createGain();
      this.gain.gain.value = this.muted ? 0 : this.volume;
      this.analyser.connect(this.gain);
      this.gain.connect(this.context.destination);
    }
    await this.context.resume();
    if (this.context.state !== 'running') throw new Error('Audio is suspended. Press play to enable sound in your browser.');
  }
  async load(file: File) {
    const id = ++this.requestId;
    if (!/\.(mp3|wav|ogg|m4a|aac|flac|webm|opus)$/i.test(file.name) && !file.type.startsWith('audio/')) {
      this.emit({ error: 'Choose an audio file such as MP3, WAV, or OGG.' }); return;
    }
    if (file.size > 150 * 1024 * 1024) { this.emit({ error: 'Please choose a file smaller than 150 MB.' }); return; }
    this.pause(); this.emit({ loading: true, error: '' });
    try {
      await this.initialize();
      const bytes = await file.arrayBuffer();
      if (id !== this.requestId) return;
      const buffer = await this.context!.decodeAudioData(bytes);
      if (id !== this.requestId) return;
      this.buffer = buffer; this.offset = 0; this.resetAnalysis();
      this.emit({ name: file.name, duration: buffer.duration, currentTime: 0, loading: false });
      await this.play();
    } catch {
      if (id === this.requestId) this.emit({ loading: false, error: 'This file could not be decoded. Try another MP3, WAV, or OGG file, then press play.' });
    }
  }
  async demo() {
    const id = ++this.requestId;
    this.pause(); this.emit({ loading: true, error: '' });
    try {
      await this.initialize();
      if (id !== this.requestId) return;
      const rate = 32000, duration = 40;
      const buffer = this.context!.createBuffer(2, rate * duration, rate);
      // Original synthesized 108 BPM loop. No external audio, network request, or license required.
      const notes = [110, 130.81, 164.81, 146.83];
      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        let seed = 17;
        for (let i = 0; i < data.length; i++) {
          const t = i / rate, beat = t % (60 / 108), bar = Math.floor(t / (60 / 108) / 4);
          const note = notes[bar % notes.length];
          const kick = Math.sin(2 * Math.PI * (45 * beat + 8 * (1 - Math.exp(-beat * 35)))) * Math.exp(-beat * 14);
          const bass = Math.sin(2 * Math.PI * note / 2 * t) * Math.exp(-beat * 6) * 0.22;
          const pad = (Math.sin(2 * Math.PI * note * t + channel * 0.2) + Math.sin(2 * Math.PI * note * 1.5 * t)) * 0.055;
          seed = (seed * 16807) % 2147483647;
          const hat = (seed / 2147483647 * 2 - 1) * Math.exp(-(t % (60 / 108 / 2)) * 100) * 0.09;
          data[i] = (kick * 0.45 + bass + pad + hat) * Math.min(1, t * 2, (duration - t) * 2);
        }
      }
      this.buffer = buffer; this.offset = 0; this.resetAnalysis();
      this.emit({ name: 'Weightless · original demo', duration, currentTime: 0, loading: false });
      await this.play();
    } catch { if (id === this.requestId) this.emit({ loading: false, error: 'Audio could not start. Press play to try again.' }); }
  }
  async play() {
    if (!this.buffer || this.state.loading) return;
    try {
      await this.initialize();
      if (this.state.playing || !this.buffer) return;
      if (this.offset >= this.buffer.duration) this.offset = 0;
      const source = this.context!.createBufferSource();
      source.buffer = this.buffer; source.connect(this.analyser!);
      source.onended = () => {
        if (this.source !== source) return;
        this.source = null; source.disconnect(); this.offset = this.buffer?.duration ?? 0;
        this.emit({ playing: false, currentTime: this.offset });
      };
      this.source = source; this.startedAt = this.context!.currentTime;
      source.start(0, this.offset); this.emit({ playing: true, error: '' });
    } catch { this.emit({ error: 'Playback was blocked. Press play again to enable audio.' }); }
  }
  get currentTime() { return this.state.playing && this.context ? Math.min(this.state.duration, this.offset + this.context.currentTime - this.startedAt) : this.offset; }
  tick = () => { if (this.state.playing) this.emit({ currentTime: this.currentTime }); };
  pause() {
    this.offset = this.currentTime;
    if (this.source) { this.source.onended = null; this.source.stop(); this.source.disconnect(); this.source = null; }
    this.emit({ playing: false, currentTime: this.offset });
  }
  seek(time: number) {
    const wasPlaying = this.state.playing;
    this.pause(); this.offset = Math.max(0, Math.min(this.state.duration, time)); this.resetAnalysis();
    this.emit({ currentTime: this.offset }); if (wasPlaying) void this.play();
  }
  setVolume(volume: number, muted: boolean) {
    this.volume = Math.max(0, Math.min(1, volume)); this.muted = muted;
    if (this.gain && this.context) this.gain.gain.setTargetAtTime(muted ? 0 : this.volume, this.context.currentTime, 0.02);
  }
  sample(delta: number, sensitivity: number, smoothing: number) {
    const dt = Math.min(delta, 0.05); this.analysisTime += dt;
    const f = this.frame;
    if (this.analyser) { this.analyser.getByteFrequencyData(f.spectrum as Uint8Array<ArrayBuffer>); this.analyser.getByteTimeDomainData(f.waveform as Uint8Array<ArrayBuffer>); }
    const rate = this.context?.sampleRate ?? 48000;
    const rawLow = this.state.playing ? bandEnergy(f.spectrum, rate, FFT_SIZE, 20, 250) : 0;
    const rawMid = this.state.playing ? bandEnergy(f.spectrum, rate, FFT_SIZE, 250, 4000) : 0;
    const rawHigh = this.state.playing ? bandEnergy(f.spectrum, rate, FFT_SIZE, 4000, 16000) : 0;
    const seconds = 0.025 + smoothing * 0.32;
    f.low = smooth(f.low, Math.min(1.8, rawLow * sensitivity), seconds, dt);
    f.mid = smooth(f.mid, Math.min(1.8, rawMid * sensitivity), seconds, dt);
    f.high = smooth(f.high, Math.min(1.8, rawHigh * sensitivity), seconds, dt);
    f.beat = this.detector.update(rawLow * 0.7 + rawMid * 0.3, this.analysisTime, dt) ? 1 : Math.max(0, f.beat - dt * 3);
    return f;
  }
  private resetAnalysis() { this.detector.reset(); this.frame.low = this.frame.mid = this.frame.high = this.frame.beat = 0; this.frame.spectrum.fill(0); }
  dispose() {
    this.requestId++; this.pause(); this.buffer = null;
    this.analyser?.disconnect(); this.gain?.disconnect(); void this.context?.close();
    this.context = null; this.analyser = null; this.gain = null; this.listeners.clear();
  }
}
