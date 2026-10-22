import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneProps } from './ParticleGalaxy';
import { palettes } from '../types';

export default function NeonTerrain({ engine, settings }: SceneProps) {
  const geometry = useRef<THREE.PlaneGeometry>(null);
  const time = useRef(0);
  const segments = { Low: 40, Medium: 80, High: 120 }[settings.quality];
  const base = useMemo(() => {
    const data = new Float32Array((segments + 1) ** 2 * 2);
    for (let y = 0; y <= segments; y++) for (let x = 0; x <= segments; x++) {
      const i = (y * (segments + 1) + x) * 2;
      data[i] = x / segments * 22 - 11; data[i + 1] = y / segments * 18 - 9;
    }
    return data;
  }, [segments]);
  useFrame((_, delta) => {
    time.current += Math.min(delta, .05) * (settings.reducedMotion ? .12 : 1);
    if (!geometry.current) return;
    const positions = geometry.current.attributes.position;
    const f = engine.frame, t = time.current;
    for (let i = 0; i < positions.count; i++) {
      const x = base[i * 2], y = base[i * 2 + 1], radius = Math.sqrt(x * x + y * y);
      const height = Math.sin(radius * 1.2 - t * .9) * (.18 + f.low * 1.4 * settings.intensity)
        + Math.sin(x * 1.6 + y * .8 + t) * f.mid * .7 * settings.intensity
        + Math.sin(x * 6 + y * 4 - t * 2) * f.high * .25 * settings.intensity;
      positions.setZ(i, height);
    }
    positions.needsUpdate = true;
  });
  return <group position={[0, -1.5, -2]} rotation={[-1.05, 0, -.12]}>
    <mesh frustumCulled={false}>
      <planeGeometry key={segments} ref={geometry} args={[22, 18, segments, segments]} />
      <meshBasicMaterial color={palettes[settings.palette][0]} wireframe transparent opacity={.55} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0, -.4]}><planeGeometry args={[23, 19]} /><meshBasicMaterial color="#080b17" side={THREE.DoubleSide} /></mesh>
  </group>;
}
