import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTheme } from "../themes/ThemeContext";

export interface VoiceOrbProps {
  state: "idle" | "recording" | "parsing";
  onClick: () => void;
  analyser?: AnalyserNode | null;
}

const ORB_SIZE = 72;
const FALLBACK_COLORS: [string, string, string, string] = [
  "#c084fc",
  "#8b2fe8",
  "#0cb8e8",
  "#ff375f",
];

const vertexShader = `
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

    float displacement = idleWave;
    if (u_state > 0.5 && u_state < 1.5) displacement = recordWave;
    if (u_state >= 1.5) displacement = parseWave;

    vec3 displaced = position + normal * displacement;
    vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
    v_normal = normalize(normalMatrix * normal);
    v_position = displaced;
    v_view_position = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const fragmentShader = `
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

  vec3 fourColorGradient(float a, float b, float c) {
    vec3 firstPair = mix(u_color1, u_color2, a);
    vec3 secondPair = mix(u_color3, u_color4, b);
    return mix(firstPair, secondPair, c);
  }

  void main() {
    // These bands are evaluated directly on the unit-sphere surface. Unlike the
    // previous off-surface blob centres, every fragment is guaranteed a color.
    float idleA = sin(v_position.x * 2.8 + u_time * 0.45) * 0.5 + 0.5;
    float idleB = sin(v_position.y * 3.2 - u_time * 0.35 + 1.4) * 0.5 + 0.5;
    float idleC = sin(v_position.z * 3.6 + u_time * 0.30 + 2.8) * 0.5 + 0.5;
    vec3 idleColor = fourColorGradient(idleA, idleB, idleC);

    float speed = 1.2 + u_amplitude * 3.0;
    float recordA = sin(v_position.x * 5.5 + u_time * speed) * 0.5 + 0.5;
    float recordB = sin(v_position.y * 5.0 - u_time * speed * 0.8) * 0.5 + 0.5;
    float recordC = sin((v_position.x + v_position.z) * 4.0 + u_time) * 0.5 + 0.5;
    vec3 recordColor = fourColorGradient(recordA, recordB, recordC);
    recordColor *= 0.95 + u_amplitude * 0.45;

    float bandA = sin(v_position.y * 8.0 + u_time * 2.2) * 0.5 + 0.5;
    float bandB = sin((v_position.x - v_position.z) * 5.0 - u_time * 1.6) * 0.5 + 0.5;
    vec3 parseColor = fourColorGradient(bandA, bandB, bandA * 0.6 + bandB * 0.4);

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

export default function VoiceOrb({ state, onClick, analyser }: VoiceOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const stateRef = useRef(state);
  const analyserRef = useRef<AnalyserNode | null>(analyser ?? null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const { orbColors } = useTheme();

  const colors = orbColors?.length === 4 ? orbColors : FALLBACK_COLORS;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    analyserRef.current = analyser ?? null;
    dataArrayRef.current = analyser
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
    camera.position.z = 3.05;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(ORB_SIZE, ORB_SIZE, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.FrontSide,
      uniforms: {
        u_time: { value: 0 },
        u_amplitude: { value: 0 },
        u_state: { value: 0 },
        u_weights: { value: new THREE.Vector3(1, 0, 0) },
        // Initialize with context colors so the first rendered frame is never black.
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
    let animationFrame = 0;

    const render = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const activeState = stateRef.current;
      const stateValue = activeState === "idle" ? 0 : activeState === "recording" ? 1 : 2;
      targetWeights.set(stateValue === 0 ? 1 : 0, stateValue === 1 ? 1 : 0, stateValue === 2 ? 1 : 0);
      material.uniforms.u_weights.value.lerp(targetWeights, 1 - Math.pow(0.001, delta));
      material.uniforms.u_state.value = stateValue;

      let amplitude = 0;
      const activeAnalyser = analyserRef.current;
      const frequencyData = dataArrayRef.current;
      if (activeState === "recording" && activeAnalyser && frequencyData) {
        activeAnalyser.getByteFrequencyData(frequencyData);
        const sampleCount = Math.min(24, frequencyData.length);
        let total = 0;
        for (let i = 0; i < sampleCount; i += 1) total += frequencyData[i];
        amplitude = Math.min((total / sampleCount / 255) * 3, 1);
      }
      material.uniforms.u_amplitude.value = THREE.MathUtils.lerp(
        material.uniforms.u_amplitude.value,
        amplitude,
        1 - Math.pow(0.01, delta),
      );
      material.uniforms.u_time.value += delta;

      mesh.rotation.y += delta * (activeState === "idle" ? 0.22 : 0.08);
      const pulse = activeState === "parsing"
        ? 1 + Math.sin(material.uniforms.u_time.value * 3) * 0.035
        : 1 + material.uniforms.u_amplitude.value * 0.1;
      mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, pulse, 0.12));

      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrame);
      materialRef.current = null;
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // The scene is intentionally initialized once; refs drive state and color updates.
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
        borderRadius: "50%",
        transform: "translateZ(0)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div ref={containerRef} style={{ width: ORB_SIZE, height: ORB_SIZE, borderRadius: "50%", overflow: "hidden" }} />
    </button>
  );
}
