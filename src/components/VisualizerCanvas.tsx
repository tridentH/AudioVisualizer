import { Component, Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ParticleGalaxy from '../visualizers/ParticleGalaxy';
import NeonTerrain from '../visualizers/NeonTerrain';
import AudioSphere from '../visualizers/AudioSphere';
import type { SceneProps } from '../visualizers/ParticleGalaxy';
import type { Mode } from '../types';

function AnalysisClock({ engine, settings }: SceneProps) {
  useFrame((_, delta) => { engine.sample(delta, settings.sensitivity, settings.smoothing); }, -2);
  return null;
}
class GraphicsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="graphics-error">3D graphics are unavailable. Enable hardware acceleration and reload to restore visuals. Your playback controls remain available.</div> : this.props.children; }
}
export default function VisualizerCanvas(props: SceneProps & { mode: Mode }) {
  const [hidden, setHidden] = useState(document.hidden);
  const [contextLost, setContextLost] = useState(false);
  useEffect(() => {
    const change = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  return <GraphicsBoundary>
    {contextLost && <div className="graphics-error" role="alert">The graphics connection was interrupted. Reload the page to restore the visualizer.</div>}
    <Canvas camera={{ position: [0, 0, 12], fov: 46 }} dpr={props.settings.quality === 'Low' ? 1 : [1, 1.75]} frameloop={hidden || contextLost ? 'never' : 'always'}
      gl={{ antialias: props.settings.quality !== 'Low', alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setContextLost(true); }, { once: true });
      }}>
      <Suspense fallback={null}>
        <AnalysisClock {...props} />
        {props.mode === 'galaxy' && <ParticleGalaxy {...props} />}
        {props.mode === 'terrain' && <NeonTerrain {...props} />}
        {props.mode === 'sphere' && <AudioSphere {...props} />}
        <OrbitControls enableZoom={false} enablePan={false} enableDamping dampingFactor={.06} rotateSpeed={.35} />
      </Suspense>
    </Canvas>
  </GraphicsBoundary>;
}
