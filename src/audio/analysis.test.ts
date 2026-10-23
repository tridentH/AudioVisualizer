import { describe, expect, it } from 'vitest';
import { bandEnergy, OnsetDetector, smooth } from './analysis';

describe('frequency bands', () => {
  it.each([32000, 44100, 48000, 96000])('maps a synthetic 1 kHz signal to mids at %i Hz', rate => {
    const data = new Uint8Array(1024);
    data[Math.round(1000 * 2048 / rate)] = 255;
    expect(bandEnergy(data, rate, 2048, 250, 4000)).toBeGreaterThan(0);
    expect(bandEnergy(data, rate, 2048, 20, 250)).toBe(0);
    expect(bandEnergy(data, rate, 2048, 4000, 16000)).toBe(0);
  });
  it('assigns exact boundaries only to the next band', () => {
    const data = new Uint8Array(1024); data[16] = 255; // 250 Hz at 32 kHz / 2048
    expect(bandEnergy(data, 32000, 2048, 20, 250)).toBe(0);
    expect(bandEnergy(data, 32000, 2048, 250, 4000)).toBeGreaterThan(0);
  });
  it('returns normalized RMS energy and safely handles empty or out-of-range bands', () => {
    const data = new Uint8Array(1024).fill(128);
    expect(bandEnergy(data, 48000, 2048, 20, 250)).toBeCloseTo(128 / 255);
    expect(bandEnergy(data, 48000, 2048, 30000, 40000)).toBe(0);
    expect(bandEnergy(new Uint8Array(), 48000, 2048, 20, 250)).toBe(0);
  });
});

describe('smoothing', () => {
  it('converges without overshooting and leaves zero-delta frames unchanged', () => {
    expect(smooth(.2, .8, .1, 0)).toBe(.2);
    expect(smooth(.2, .8, .1, 1)).toBeGreaterThan(.79);
    expect(smooth(.2, .8, .1, 1)).toBeLessThan(.8);
    expect(smooth(1, 0, .1, .1)).toBeGreaterThan(0);
  });
  it('produces the same response at 30 and 120 frames per second', () => {
    let slow = 0, fast = 0;
    for (let i = 0; i < 30; i++) slow = smooth(slow, 1, .2, 1 / 30);
    for (let i = 0; i < 120; i++) fast = smooth(fast, 1, .2, 1 / 120);
    expect(slow).toBeCloseTo(fast, 10);
  });
  it('makes greater smoothing respond more slowly', () => {
    expect(smooth(0, 1, .4, 1 / 60)).toBeLessThan(smooth(0, 1, .02, 1 / 60));
  });
});

describe('estimated onset detection', () => {
  it('ignores silence and steady sustained energy', () => {
    const detector = new OnsetDetector();
    for (let i = 0; i < 60; i++) expect(detector.update(0, i / 60, 1 / 60)).toBe(false);
    expect(detector.update(.7, 1, 1 / 60)).toBe(true);
    for (let i = 1; i < 120; i++) expect(detector.update(.7, 1 + i / 60, 1 / 60)).toBe(false);
  });
  it('detects separated impulses while rejecting a second impulse inside the cooldown', () => {
    const detector = new OnsetDetector();
    expect(detector.update(.8, 0, .016)).toBe(true);
    detector.update(.05, .05, .05);
    expect(detector.update(.8, .1, .05)).toBe(false);
    detector.update(.05, .3, .2);
    expect(detector.update(.8, .5, .2)).toBe(true);
  });
  it('adapts to loud passages and resets between tracks', () => {
    const detector = new OnsetDetector();
    for (let i = 0; i < 300; i++) detector.update(.8, i / 60, 1 / 60);
    detector.update(.6, 5.01, .016);
    expect(detector.update(.82, 5.03, .016)).toBe(false);
    detector.reset();
    expect(detector.update(.8, 0, .016)).toBe(true);
  });
});
