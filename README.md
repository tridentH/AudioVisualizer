# AudioVisualizer

**See sound. Feel everything.** A browser-based, real-time 3D music visualizer built with React, TypeScript, Three.js, React Three Fiber, drei, Tailwind CSS, and the Web Audio API.

Choose an audio file, explore three reactive worlds, and tune their appearance. Audio is decoded and played locally. There is no backend, account, audio upload service, analytics, or API key.

## Run locally

Use **Node.js 22.12+ or 24 LTS** and npm.

```sh
git clone https://github.com/tridentH/AudioVisualizer.git
cd AudioVisualizer
npm install
npm run dev
```

Open the local address printed by Vite. Choose **Choose audio file**, drop a file onto the scene, or select **explore the demo**. The original 40-second, 108 BPM demo is synthesized locally when requested.

```sh
npm test           # Signal-processing and audio lifecycle unit tests
npm run typecheck  # Strict TypeScript checks
npm run build      # Type checks and optimized production bundle
npm run preview    # Serve the production build locally
```

`npm ci` installs exactly the versions in the committed lockfile. The app is a static Vite application: deploy the generated `dist/` directory to a static host. The relative build base supports hosting under a repository subpath.

## Experience

- MP3, WAV, OGG, and other audio formats supported by the browser; drag-and-drop and file picker, with a 150 MB input limit.
- Play, pause, restart, seek, elapsed/total time, gain-controlled volume, and mute.
- Three switchable scenes that share one uninterrupted audio graph.
- Cyberpunk, Ocean, Sunset, and Monochrome palettes.
- Sensitivity, smoothing, intensity, Low/Medium/High quality, and reduced-motion settings. Preferences are saved locally when storage is available.
- Fullscreen where the browser supports the Fullscreen API; drag the scene to orbit it.
- Dark responsive layout, labeled controls, visible keyboard focus, loading states, decoding errors, and an explanatory help dialog.

| Key | Action |
| --- | --- |
| Space | Play / pause |
| 1 / 2 / 3 | Galaxy / terrain / sphere |
| F | Toggle fullscreen |
| Escape | Close settings or the help dialog |

Native inputs and buttons retain their own keyboard behavior. Space activates a focused button rather than also toggling playback.

## How sound becomes geometry

`AudioEngine` lazily creates one `AudioContext` after a user gesture. A decoded `AudioBuffer` feeds an `AudioBufferSourceNode`, then an `AnalyserNode`, then a `GainNode`, then the output. Placing gain after the analyser keeps visual response independent of listening volume and mute. Sources are recreated for play and seek, while the analyser and context are reused.

The browser's analyser performs **FFT-based frequency analysis** with an FFT size of **2048**. For bin `k`, its frequency is:

```text
frequencyHz = k × sampleRate / fftSize
```

Band membership follows this mapping rather than arbitrary array slices. The upper bound of each band is exclusive. Frequencies above Nyquist are automatically excluded.

| Band | Range | Particle Galaxy | Neon Terrain | Audio Sphere |
| --- | --- | --- | --- | --- |
| Bass | 20–250 Hz | Spiral expansion | Broad landscape waves | Overall scale |
| Mids | 250–4,000 Hz | Arm movement and depth | Intersecting wave patterns | Surface deformation |
| Highs | 4,000–16,000 Hz | Particle size and brightness | Fine surface detail | Wireframe brightness |
| Estimated onset | Adaptive energy change | Expanding shockwave | — | Brief scale burst |

The analyser provides byte-scaled frequency magnitudes. Each band uses root-mean-square energy normalized to 0–1, followed by sensitivity scaling and time-based exponential smoothing. These are visualization features, not calibrated physical measurements or loudness values. Time-domain waveform data is also captured in a reusable array for future waveform views.

The onset detector compares weighted bass/mid energy against a moving average, a minimum energy floor, a minimum rise, and a 240 ms cooldown. It is an **approximate onset detector**, not tempo estimation or perfect musical beat tracking. Sustained tones, soft attacks, and complex mixes can cause missed or extra pulses.

## Architecture

```text
src/
  audio/
    AudioEngine.ts        Local decoding, playback, graph lifecycle, frame sampling
    analysis.ts           Hz-based bands, smoothing, adaptive onset detection
    *.test.ts             Synthetic analysis and mocked audio lifecycle tests
  components/
    AudioPlayer.tsx       Playback, seeking, volume, file replacement
    AudioMeter.tsx        Canvas frequency readout
    ControlPanel.tsx      Visual preferences
    VisualizerCanvas.tsx  WebGL boundary, analysis clock, scene switching
  hooks/
    useAudioEngine.ts     External-store subscription and cleanup
  visualizers/
    ParticleGalaxy.tsx    GPU-driven points and onset ring
    NeonTerrain.tsx       Reused wireframe geometry
    AudioSphere.tsx       Deformed geometry and orbit rings
  types.ts                Validated settings and palettes
  App.tsx                 Responsive workspace, upload, shortcuts, fullscreen
  styles.css              Tailwind entry and visual design
```

The renderer samples analysis at the start of its animation frame, before scene callbacks. Audio frames live on a mutable engine object, so frequency updates do not cause React renders. Playback labels refresh approximately every 150 ms. Three.js handles resizing and device pixel ratio through React Three Fiber.

## Performance decisions and tradeoffs

- The galaxy uses one point cloud, static typed-array attributes, and a custom GPU shader. Quality changes its particle count from **4,500** to **12,000** to **24,000**.
- Terrain resolution changes from **40** to **80** to **120** subdivisions per axis. Sphere detail changes from **3** to **4** to **5**. Geometry arrays are reused during animation.
- Low quality caps pixel ratio at 1; the other presets cap it at 1.75. There is no postprocessing pipeline. A lightweight additive particle shader provides the galaxy's glow.
- The 3D renderer is lazy-loaded so playback UI can load separately from the larger graphics bundle. Three.js still adds substantial download weight.
- Visual time deltas are capped at 50 ms after a stall or tab switch. Hidden tabs stop 3D rendering; audio may continue. Reduced motion slows ambient movement and disables galaxy shockwaves while retaining gradual audio response.
- Pausing/stopping disconnects the old source, new tracks reset the onset detector, and disposal disconnects audio nodes and closes the context. React Three Fiber disposes declarative scene resources when a scene unmounts. Files are decoded from array buffers, so there are no object URLs to leak.
- Local decoding makes accurate seeking straightforward but keeps the full uncompressed track in memory. The 150 MB compressed-file cap does not bound decoded memory use; short tracks are preferable on mobile devices. Streaming is a possible future extension.

No fixed frame-rate or device performance claim is made. Select Low quality for slower devices. WebGL and hardware acceleration are required for the 3D scenes. A graphics failure shows a fallback message while leaving playback controls accessible; context loss currently requires a page reload.

## Validation and limitations

The unit suite covers multiple sample rates, exact band boundaries, normalized energy, smoothing at different frame rates, onset thresholds/cooldown/adaptation, playback offsets, source reuse, seeking, completion, invalid inputs, decoding failure, and cleanup. GitHub Actions runs the tests and production build on pushes to `main` and pull requests.

Browser codecs and autoplay/fullscreen policies differ by platform. Audio starts only after an interaction. An unsupported or corrupt file produces a readable error. The demo provides a self-contained source to explore without supplying a file.

During initial implementation, automated checks passed, but end-to-end browser and mobile visual verification were blocked by the preview environment. Audible playback, fullscreen, WebGL appearance, and real-device performance still need manual validation. To check them:

1. Play the demo; switch all three scenes while listening for uninterrupted playback.
2. Upload a short WAV or MP3, pause/resume, scrub near the end, restart, mute, and adjust volume.
3. Change each palette and slider; compare Low and High quality, then reload to confirm preferences persist.
4. Try reduced motion, fullscreen, keyboard controls, and a mobile-width viewport.
5. Try a corrupt file, switch tabs during playback, and repeatedly replace tracks and scenes.

## Portfolio description

Built AudioVisualizer, a local-first 3D music visualization app using React, TypeScript, Three.js, and the Web Audio API. Implemented FFT-derived frequency bands, frame-rate-independent smoothing, adaptive onset estimation, three reactive scenes, GPU particle animation, and reusable audio/rendering resources, with unit tests and continuous integration.
