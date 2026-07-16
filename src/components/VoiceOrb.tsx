import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTheme } from "../themes/ThemeContext";

export interface VoiceOrbProps {
  state: "idle" | "recording" | "parsing";
  onClick: () => void;
  analyser?: AnalyserNode | null;
  orbStyle?: OrbStyle;
}

const ORB_SIZE = 72;

export type OrbStyle = "2d" | "3d";
const DEFAULT_ORB_STYLE: OrbStyle = "2d";

const FALLBACK_COLORS: [string, string, string, string] = [
  "#c084fc",
  "#8b2fe8",
  "#0cb8e8",
  "#ff375f",
];

function withAlpha(color: string, alpha: number): string {
  const hex = color.trim().replace("#", "");
  const expanded = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex;
  if (/^[0-9a-f]{6}$/i.test(expanded)) {
    return `rgba(${parseInt(expanded.slice(0, 2), 16)}, ${parseInt(expanded.slice(2, 4), 16)}, ${parseInt(expanded.slice(4, 6), 16)}, ${alpha})`;
  }
  return color;
}

function CanvasVoiceOrb({ state, onClick, analyser }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const stateRef = useRef(state);
  const analyserRef = useRef<AnalyserNode | null>(analyser ?? null);
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const amplitudeRef = useRef(0);
  const { orbColors } = useTheme();
  const colors = orbColors?.length === 4 ? orbColors : FALLBACK_COLORS;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    analyserRef.current = analyser ?? null;
    frequencyDataRef.current = analyser
      ? new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
      : null;
  }, [analyser]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = ORB_SIZE * pixelRatio;
    canvas.height = ORB_SIZE * pixelRatio;
    canvas.style.width = `${ORB_SIZE}px`;
    canvas.style.height = `${ORB_SIZE}px`;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const center = ORB_SIZE / 2;
    // Leave room for breathing, the rim stroke, and browser sub-pixel rounding.
    // The old 0.43 radius plus .orb-ring padding made the edge look cropped.
    const baseRadius = ORB_SIZE * 0.39;
    let elapsed = 0;
    let previousTime = performance.now();

    const drawColorBlob = (
      x: number,
      y: number,
      radius: number,
      color: string,
      opacity: number,
    ) => {
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, withAlpha(color, opacity));
      gradient.addColorStop(0.52, withAlpha(color, opacity * 0.55));
      gradient.addColorStop(1, withAlpha(color, 0));
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    };

    const drawBase = (radius: number, brightness = 1) => {
      const base = context.createRadialGradient(
        center - radius * 0.22,
        center - radius * 0.3,
        radius * 0.05,
        center,
        center,
        radius,
      );
      base.addColorStop(0, withAlpha(colors[0], 0.42 * brightness));
      base.addColorStop(0.45, withAlpha(colors[1], 0.22 * brightness));
      base.addColorStop(1, "rgba(2, 3, 12, 0.92)");
      context.fillStyle = base;
      context.fillRect(center - radius, center - radius, radius * 2, radius * 2);
    };

    const drawIdle = (radius: number) => {
      drawBase(radius, 1);
      context.globalCompositeOperation = "screen";
      const blobs = [
        { phase: 0, orbit: 0.34, size: 0.7, color: colors[0] },
        { phase: 2.1, orbit: 0.38, size: 0.66, color: colors[1] },
        { phase: 4.2, orbit: 0.32, size: 0.62, color: colors[2] },
        { phase: 5.3, orbit: 0.26, size: 0.48, color: colors[3] },
      ];
      blobs.forEach((blob, index) => {
        const angle = elapsed * (0.23 + index * 0.025) + blob.phase;
        drawColorBlob(
          center + Math.cos(angle) * radius * blob.orbit,
          center + Math.sin(angle * 0.83) * radius * blob.orbit * 0.72,
          radius * blob.size,
          blob.color,
          index === 3 ? 0.34 : 0.64,
        );
      });
      context.globalCompositeOperation = "source-over";
    };

    const drawRecording = (radius: number, amplitude: number) => {
      drawBase(radius, 1.05 + amplitude * 0.4);
      context.globalCompositeOperation = "screen";
      const orbit = radius * (0.08 + amplitude * 0.32);
      colors.forEach((color, index) => {
        const angle = elapsed * (0.75 + amplitude * 0.9) + index * Math.PI * 0.5;
        drawColorBlob(
          center + Math.cos(angle) * orbit,
          center + Math.sin(angle) * orbit,
          radius * (0.55 + amplitude * 0.25),
          color,
          0.66 + amplitude * 0.24,
        );
      });

      if (amplitude > 0.55) {
        drawColorBlob(center, center, radius * 0.92, colors[3], (amplitude - 0.55) * 0.42);
      }
      context.globalCompositeOperation = "source-over";
    };

    const drawParsing = (radius: number) => {
      drawBase(radius, 1.08);
      context.globalCompositeOperation = "screen";

      // Four soft aurora lobes fold through one another instead of reading as a
      // conventional loading spinner.
      colors.forEach((color, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        const angle = elapsed * (0.48 + index * 0.045) * direction + index * Math.PI * 0.5;
        const orbit = radius * (0.24 + Math.sin(elapsed * 1.25 + index) * 0.08);
        drawColorBlob(
          center + Math.cos(angle) * orbit,
          center + Math.sin(angle * 1.16) * orbit,
          radius * (0.62 + Math.sin(elapsed * 1.7 + index * 1.4) * 0.08),
          color,
          0.56,
        );
      });

      const sweepAngle = elapsed * 1.35;
      const sweepX = center + Math.cos(sweepAngle) * radius * 0.58;
      const sweepY = center + Math.sin(sweepAngle) * radius * 0.58;
      drawColorBlob(sweepX, sweepY, radius * 0.27, "#ffffff", 0.34);

      context.save();
      context.translate(center, center);
      context.rotate(-elapsed * 0.42);
      const band = context.createLinearGradient(-radius, 0, radius, 0);
      band.addColorStop(0, withAlpha(colors[2], 0));
      band.addColorStop(0.42, withAlpha(colors[2], 0.12));
      band.addColorStop(0.52, "rgba(255,255,255,0.19)");
      band.addColorStop(0.62, withAlpha(colors[0], 0.13));
      band.addColorStop(1, withAlpha(colors[0], 0));
      context.fillStyle = band;
      context.fillRect(-radius, -radius * 0.15, radius * 2, radius * 0.3);
      context.restore();
      context.globalCompositeOperation = "source-over";
    };

    const drawGlass = (radius: number) => {
      context.save();

      const haze = context.createLinearGradient(
        center - radius,
        center - radius,
        center + radius,
        center + radius,
      );
      haze.addColorStop(0, "rgba(255,255,255,0.16)");
      haze.addColorStop(0.38, "rgba(255,255,255,0.025)");
      haze.addColorStop(0.7, "rgba(255,255,255,0)");
      haze.addColorStop(1, "rgba(0,0,0,0.2)");
      context.fillStyle = haze;
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.fill();

      context.globalCompositeOperation = "screen";
      const specular = context.createRadialGradient(
        center - radius * 0.34,
        center - radius * 0.4,
        0,
        center - radius * 0.3,
        center - radius * 0.35,
        radius * 0.54,
      );
      specular.addColorStop(0, "rgba(255,255,255,0.68)");
      specular.addColorStop(0.2, "rgba(255,255,255,0.28)");
      specular.addColorStop(0.55, "rgba(255,255,255,0.055)");
      specular.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = specular;
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.fill();

      const rim = context.createLinearGradient(
        center - radius,
        center - radius,
        center + radius,
        center + radius,
      );
      rim.addColorStop(0, "rgba(255,255,255,0.62)");
      rim.addColorStop(0.34, "rgba(255,255,255,0.12)");
      rim.addColorStop(0.68, "rgba(255,255,255,0.04)");
      rim.addColorStop(1, "rgba(255,255,255,0.28)");
      context.strokeStyle = rim;
      context.lineWidth = 1.15;
      context.beginPath();
      context.arc(center, center, radius - 0.7, 0, Math.PI * 2);
      context.stroke();

      context.strokeStyle = "rgba(255,255,255,0.28)";
      context.lineWidth = 1.4;
      context.beginPath();
      context.arc(center, center, radius * 0.79, Math.PI * 1.12, Math.PI * 1.58);
      context.stroke();
      context.restore();
    };

    const render = (now: number) => {
      const delta = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;
      elapsed += delta;

      let targetAmplitude = 0;
      const activeAnalyser = analyserRef.current;
      const frequencyData = frequencyDataRef.current;
      if (stateRef.current === "recording" && activeAnalyser && frequencyData) {
        activeAnalyser.getByteFrequencyData(frequencyData);
        const count = Math.min(24, frequencyData.length);
        let total = 0;
        for (let index = 0; index < count; index += 1) total += frequencyData[index];
        targetAmplitude = Math.min((total / count / 255) * 3, 1);
      }
      amplitudeRef.current += (targetAmplitude - amplitudeRef.current) * 0.18;

      const breathing = stateRef.current === "parsing"
        ? 1 + Math.sin(elapsed * 2.15) * 0.035
        : stateRef.current === "idle"
          ? 1 + Math.sin(elapsed * 1.15) * 0.014
          : 1 + amplitudeRef.current * 0.065;
      const radius = baseRadius * breathing;

      context.clearRect(0, 0, ORB_SIZE, ORB_SIZE);
      context.save();
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.clip();

      if (stateRef.current === "idle") drawIdle(radius);
      else if (stateRef.current === "recording") drawRecording(radius, amplitudeRef.current);
      else drawParsing(radius);

      drawGlass(radius);
      context.restore();
      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameRef.current);
  }, [colors]);

  return (
    <button
      type="button"
      aria-label={state === "recording" ? "Stop voice recording" : "Start voice recording"}
      className="cursor-pointer shadow-xl transition-transform duration-300 hover:scale-105 active:scale-95 orb-ring"
      onClick={onClick}
      style={{
        width: ORB_SIZE,
        height: ORB_SIZE,
        borderRadius: "50%",
        transform: "translateZ(0)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        overflow: "visible",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", borderRadius: "50%" }} />
    </button>
  );
}

const threeVertexShader = `
  uniform float u_time;
  uniform float u_amplitude;
  uniform float u_state;
  varying vec3 v_normal;
  varying vec3 v_position;
  varying vec3 v_view_position;

  void main() {
    float idleWave = sin(position.y * 4.0 + u_time) * 0.018;
    float recordWave = sin(position.x * 7.0 + u_time * 4.0)
      * sin(position.y * 6.0 - u_time * 3.0)
      * (0.025 + u_amplitude * 0.11);
    float parseWave = sin(position.y * 9.0 + u_time * 3.0) * 0.035;
    float displacement = u_state < 0.5
      ? idleWave
      : (u_state < 1.5 ? recordWave : parseWave);
    vec3 displaced = position + normal * displacement;
    vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
    v_normal = normalize(normalMatrix * normal);
    v_position = displaced;
    v_view_position = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const threeFragmentShader = `
  uniform float u_time;
  uniform float u_amplitude;
  uniform vec3 u_weights;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform vec3 u_color3;
  uniform vec3 u_color4;
  varying vec3 v_normal;
  varying vec3 v_position;
  varying vec3 v_view_position;

  vec3 gradient4(float a, float b, float blend) {
    return mix(mix(u_color1, u_color2, a), mix(u_color3, u_color4, b), blend);
  }

  void main() {
    float idleA = sin(v_position.x * 2.8 + u_time * 0.45) * 0.5 + 0.5;
    float idleB = sin(v_position.y * 3.2 - u_time * 0.35 + 1.4) * 0.5 + 0.5;
    float idleMix = sin(v_position.z * 3.6 + u_time * 0.3 + 2.8) * 0.5 + 0.5;
    vec3 idleColor = gradient4(idleA, idleB, idleMix);

    float speed = 1.2 + u_amplitude * 3.0;
    float recordA = sin(v_position.x * 5.5 + u_time * speed) * 0.5 + 0.5;
    float recordB = sin(v_position.y * 5.0 - u_time * speed * 0.8) * 0.5 + 0.5;
    float recordMix = sin((v_position.x + v_position.z) * 4.0 + u_time) * 0.5 + 0.5;
    vec3 recordColor = gradient4(recordA, recordB, recordMix) * (0.95 + u_amplitude * 0.45);

    float parseA = sin(v_position.y * 8.0 + u_time * 2.2) * 0.5 + 0.5;
    float parseB = sin((v_position.x - v_position.z) * 5.0 - u_time * 1.6) * 0.5 + 0.5;
    vec3 parseColor = gradient4(parseA, parseB, parseA * 0.6 + parseB * 0.4);

    vec3 color = idleColor * u_weights.x
      + recordColor * u_weights.y
      + parseColor * u_weights.z;
    vec3 normal = normalize(v_normal);
    vec3 viewDirection = normalize(v_view_position);
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.4);
    vec3 lightDirection = normalize(vec3(-0.45, 0.75, 1.0));
    vec3 halfDirection = normalize(lightDirection + viewDirection);
    float specular = pow(max(dot(normal, halfDirection), 0.0), 56.0);
    color = mix(color, vec3(1.0), fresnel * 0.24);
    color += vec3(specular * 0.72);
    color = pow(max(color, vec3(0.0)), vec3(0.9));
    gl_FragColor = vec4(color, 0.92 + fresnel * 0.08);
  }
`;

function ThreeVoiceOrb({ state, onClick, analyser }: VoiceOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const stateRef = useRef(state);
  const analyserRef = useRef<AnalyserNode | null>(analyser ?? null);
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const { orbColors } = useTheme();
  const colors = orbColors?.length === 4 ? orbColors : FALLBACK_COLORS;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    analyserRef.current = analyser ?? null;
    frequencyDataRef.current = analyser
      ? new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
      : null;
  }, [analyser]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.u_color1.value.set(colors[0]);
    material.uniforms.u_color2.value.set(colors[1]);
    material.uniforms.u_color3.value.set(colors[2]);
    material.uniforms.u_color4.value.set(colors[3]);
  }, [colors]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 10);
    camera.position.z = 3.25;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // Keep the WebGL drawing buffer and the canvas's CSS box in sync. Passing
    // false here left the DOM canvas at its 300x150 default, so the 72px orb
    // wrapper exposed only the canvas's top-left corner.
    renderer.setSize(ORB_SIZE, ORB_SIZE);
    renderer.domElement.style.display = "block";
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.ShaderMaterial({
      vertexShader: threeVertexShader,
      fragmentShader: threeFragmentShader,
      transparent: true,
      uniforms: {
        u_time: { value: 0 },
        u_amplitude: { value: 0 },
        u_state: { value: 0 },
        u_weights: { value: new THREE.Vector3(1, 0, 0) },
        u_color1: { value: new THREE.Color(colors[0]) },
        u_color2: { value: new THREE.Color(colors[1]) },
        u_color3: { value: new THREE.Color(colors[2]) },
        u_color4: { value: new THREE.Color(colors[3]) },
      },
    });
    materialRef.current = material;
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const targetWeights = new THREE.Vector3(1, 0, 0);
    const clock = new THREE.Clock();
    let frame = 0;

    const render = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const activeState = stateRef.current;
      const stateValue = activeState === "idle" ? 0 : activeState === "recording" ? 1 : 2;
      targetWeights.set(stateValue === 0 ? 1 : 0, stateValue === 1 ? 1 : 0, stateValue === 2 ? 1 : 0);
      material.uniforms.u_weights.value.lerp(targetWeights, 1 - Math.pow(0.001, delta));
      material.uniforms.u_state.value = stateValue;

      let amplitude = 0;
      const activeAnalyser = analyserRef.current;
      const data = frequencyDataRef.current;
      if (activeState === "recording" && activeAnalyser && data) {
        activeAnalyser.getByteFrequencyData(data);
        const count = Math.min(24, data.length);
        let total = 0;
        for (let index = 0; index < count; index += 1) total += data[index];
        amplitude = Math.min((total / count / 255) * 3, 1);
      }
      material.uniforms.u_amplitude.value = THREE.MathUtils.lerp(
        material.uniforms.u_amplitude.value,
        amplitude,
        1 - Math.pow(0.01, delta),
      );
      material.uniforms.u_time.value += delta;
      mesh.rotation.y += delta * (activeState === "idle" ? 0.22 : 0.08);
      const pulse = activeState === "parsing"
        ? 1 + Math.sin(material.uniforms.u_time.value * 3) * 0.025
        : 1 + material.uniforms.u_amplitude.value * 0.07;
      mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, pulse, 0.12));
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      materialRef.current = null;
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // State, analyser data, and colors are driven through refs/uniform updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      type="button"
      aria-label={state === "recording" ? "Stop voice recording" : "Start voice recording"}
      className="cursor-pointer shadow-xl transition-transform duration-300 hover:scale-105 active:scale-95 orb-ring"
      onClick={onClick}
      style={{
        width: ORB_SIZE,
        height: ORB_SIZE,
        padding: 0,
        borderRadius: "50%",
        overflow: "visible",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div ref={containerRef} style={{ width: ORB_SIZE, height: ORB_SIZE }} />
    </button>
  );
}

function renderOrb(style: OrbStyle, props: VoiceOrbProps) {
  return style === "3d" ? <ThreeVoiceOrb {...props} /> : <CanvasVoiceOrb {...props} />;
}

export default function VoiceOrb(props: VoiceOrbProps) {
  return renderOrb(props.orbStyle ?? DEFAULT_ORB_STYLE, props);
}
