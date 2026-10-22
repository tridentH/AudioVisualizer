import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AudioEngine } from '../audio/AudioEngine';
import type { Settings } from '../types';
import { palettes } from '../types';

export interface SceneProps { engine: AudioEngine; settings: Settings; preview: boolean }

const vertex = `
  attribute float aSize;
  attribute float aMix;
  uniform float uTime, uLow, uMid, uHigh, uIntensity, uMotion, uDpr;
  varying float vMix;
  varying float vGlow;
  void main() {
    vec3 p = position;
    float radius = length(p.xy);
    float angle = uTime * .045 * uMotion + uMid * .12 * sin(radius * 2. - uTime);
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    p.xy = rotation * p.xy * (1. + uLow * .24 * uIntensity);
    p.z += sin(radius * 3. - uTime * .5) * uMid * .3 * uIntensity;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    float sparkle = .8 + .2 * sin(uTime * 2. + aSize * 90.);
    gl_PointSize = clamp(aSize * uDpr * (40. / -mv.z) * (1. + uHigh * 1.8 * uIntensity) * sparkle, 1., 26.);
    vMix = aMix;
    vGlow = .65 + uHigh * .6;
  }
`;
const fragment = `
  uniform vec3 uColorA, uColorB, uColorC;
  varying float vMix, vGlow;
  void main() {
    float d = length(gl_PointCoord - .5) * 2.;
    if (d > 1.) discard;
    float alpha = pow(1. - d, 2.5);
    vec3 color = mix(uColorA, uColorB, smoothstep(.1, .8, vMix));
    color = mix(color, uColorC, pow(1. - vMix, 4.) * .6);
    gl_FragColor = vec4(color * vGlow, alpha * .95);
  }
`;

export default function ParticleGalaxy({ engine, settings, preview }: SceneProps) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  const time = useRef(0);
  const count = { Low: 4500, Medium: 12000, High: 24000 }[settings.quality];
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3), sizes = new Float32Array(count), mixes = new Float32Array(count);
    let seed = 12345;
    const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < count; i++) {
      const radius = Math.pow(random(), 0.7) * 5.2;
      const branch = (i % 4) / 4 * Math.PI * 2;
      const angle = branch + radius * 1.05 + (random() - .5) * .65;
      const scatter = Math.pow(random(), 3) * .8;
      positions[i * 3] = Math.cos(angle) * radius + (random() - .5) * scatter;
      positions[i * 3 + 1] = Math.sin(angle) * radius + (random() - .5) * scatter;
      positions[i * 3 + 2] = (random() - .5) * .55 * (1 - radius / 6);
      sizes[i] = .35 + Math.pow(random(), 4) * 1.4;
      mixes[i] = radius / 5.2;
    }
    return { positions, sizes, mixes };
  }, [count]);
  const colors = palettes[settings.palette];
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uLow: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
    uIntensity: { value: 1 }, uMotion: { value: 1 }, uDpr: { value: 1 },
    uColorA: { value: new THREE.Color(colors[0]) }, uColorB: { value: new THREE.Color(colors[1]) }, uColorC: { value: new THREE.Color(colors[2]) },
  }), [colors]);
  useFrame((state, delta) => {
    const dt = Math.min(delta, .05); time.current += dt * (settings.reducedMotion ? .12 : 1);
    if (!material.current) return;
    const u = material.current.uniforms, f = engine.frame;
    u.uTime.value = time.current;
    u.uLow.value = f.low; u.uMid.value = f.mid; u.uHigh.value = f.high;
    u.uIntensity.value = settings.intensity; u.uMotion.value = settings.reducedMotion ? .1 : 1;
    u.uDpr.value = state.gl.getPixelRatio();
    if (ring.current) {
      ring.current.scale.setScalar(1 + (1 - f.beat) * 4);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = settings.reducedMotion ? 0 : f.beat * .22 * settings.intensity;
    }
  });
  return <group rotation={[-.48, -.08, -.22]} scale={preview ? .92 : 1}>
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
        <bufferAttribute attach="attributes-aMix" args={[data.mixes, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={material} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
    <mesh ref={ring}><ringGeometry args={[.94, .96, 128]} /><meshBasicMaterial color={colors[1]} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
  </group>;
}
