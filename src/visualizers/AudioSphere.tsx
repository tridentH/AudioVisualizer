import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneProps } from './ParticleGalaxy';
import { palettes } from '../types';

export default function AudioSphere({ engine, settings }: SceneProps) {
  const mesh = useRef<THREE.Mesh>(null), group = useRef<THREE.Group>(null);
  const geometry = useRef<THREE.IcosahedronGeometry>(null);
  const time = useRef(0);
  const detail = { Low: 3, Medium: 4, High: 5 }[settings.quality];
  const base = useMemo(() => {
    const temporary = new THREE.IcosahedronGeometry(2.1, detail);
    const data = new Float32Array(temporary.attributes.position.array); temporary.dispose(); return data;
  }, [detail]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, .05), f = engine.frame;
    time.current += dt * (settings.reducedMotion ? .1 : 1);
    if (!geometry.current || !mesh.current || !group.current) return;
    const positions = geometry.current.attributes.position, t = time.current;
    for (let i = 0; i < positions.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      const displacement = 1 + Math.sin(x * 3 + t) * Math.cos(y * 3 - t * .7) * Math.sin(z * 2 + t) * (.035 + f.mid * .22 * settings.intensity);
      positions.setXYZ(i, x * displacement, y * displacement, z * displacement);
    }
    positions.needsUpdate = true;
    mesh.current.scale.setScalar(1 + (f.low * .22 + f.beat * .06) * settings.intensity);
    mesh.current.rotation.y = t * .1;
    group.current.rotation.z = t * .035;
    const mat = mesh.current.material as THREE.MeshBasicMaterial;
    mat.opacity = .35 + Math.min(.4, f.high * .6);
  });
  const colors = palettes[settings.palette];
  return <group ref={group}>
    <mesh ref={mesh}>
      <icosahedronGeometry ref={geometry} key={detail} args={[2.1, detail]} />
      <meshBasicMaterial color={colors[0]} wireframe transparent opacity={.5} />
    </mesh>
    {[0, 1, 2].map(i => <mesh key={i} rotation={[Math.PI / 2 + i * .5, i * .65, i * .3]}>
      <torusGeometry args={[2.85 + i * .3, .008, 8, 180]} />
      <meshBasicMaterial color={colors[i]} transparent opacity={.5} />
    </mesh>)}
    <mesh><sphereGeometry args={[1.94, 32, 24]} /><meshBasicMaterial color="#0d1023" /></mesh>
  </group>;
}
