import { useEffect, useState, useSyncExternalStore } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

export function useAudioEngine() {
  const [engine] = useState(() => new AudioEngine());
  const state = useSyncExternalStore(engine.subscribe, () => engine.state);
  useEffect(() => {
    const interval = window.setInterval(engine.tick, 150);
    return () => { clearInterval(interval); engine.dispose(); };
  }, [engine]);
  return { engine, state };
}
