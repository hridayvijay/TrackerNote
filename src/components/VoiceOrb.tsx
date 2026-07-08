import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useTheme } from "../themes/ThemeContext";
import { THEMES } from "../themes/themes";

interface VoiceOrbProps {
  state: "idle" | "recording" | "parsing";
  onClick: () => void;
  audioStream?: MediaStream | null;
  orbColors?: any; // Kept for backwards compat signature but unused
}

const vertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vViewPosition;
varying vec2 vUv;

uniform float u_amplitude;
uniform float u_time;
uniform float u_state;

// Simplex 3D Noise 
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 1.0/7.0; 
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  vUv = uv;

  vec3 displaced = position;
  
  // Base displacement based on state
  float noiseFreq = 2.0;
  float noiseAmp = 0.05;
  
  if (u_state > 0.5 && u_state < 1.5) { // Recording
    noiseFreq = 3.0 + u_amplitude * 4.0;
    noiseAmp = 0.08 + u_amplitude * 0.15;
  } else if (u_state > 1.5) { // Parsing
    noiseFreq = 4.0;
    noiseAmp = 0.035;
  }
  
  float disp = snoise(position * noiseFreq + u_time * 0.5) * noiseAmp;
  displaced = position + normal * disp;

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform float u_time;
uniform float u_amplitude;
uniform float u_breathe;
uniform vec3 u_weights;

uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform vec3 u_orbBg;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vViewPosition;
varying vec2 vUv;

// Simplex 3D Noise 
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 1.0/7.0; 
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  // Soft rim light
  float fresnel = dot(normal, viewDir);
  fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
  float rim = pow(fresnel, 2.5);
  float intenseRim = pow(fresnel, 4.0);

  // Base slow noise for internal structure
  float n1 = snoise(vec3(vPosition.xy * 1.8, u_time * 0.2));
  float n2 = snoise(vec3(vPosition.yz * 2.2, u_time * 0.3 + 5.0));

  vec3 idleColor = mix(u_color1, u_color2, smoothstep(-0.8, 0.8, n1));
  idleColor = mix(idleColor, u_color3, smoothstep(-0.4, 0.8, n2));
  idleColor += u_color4 * intenseRim * 1.5;
  
  // Recording state
  float recTime = u_time * (1.0 + u_amplitude * 2.5);
  float rn1 = snoise(vec3(vPosition.xy * 1.8, recTime * 0.5));
  float rn2 = snoise(vec3(vPosition.yz * 2.2, recTime * 0.6 + 5.0));
  
  vec3 recColor = mix(u_color1, u_color2, smoothstep(-0.8, 0.5, rn1));
  recColor = mix(recColor, u_color3, smoothstep(-0.2, 0.8, rn2));
  recColor += u_color4 * intenseRim * 1.5;
  
  // Increase brightness and vibrancy for recording based on amplitude
  recColor += mix(u_color2, u_color4, u_amplitude) * u_amplitude * 2.0;
  
  // Parsing state
  float pTime = u_time * 1.5;
  float pn = sin(vPosition.y * 5.0 - pTime) * 0.5 + 0.5;
  vec3 parseColor = mix(u_color1, u_color4, pn);
  parseColor *= u_breathe;

  vec3 finalColor = idleColor * u_weights.x + recColor * u_weights.y + parseColor * u_weights.z;
  
  // Specular highlight for a glass-like shell
  vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
  vec3 halfVector = normalize(lightDir + viewDir);
  float NdotH = max(0.0, dot(normal, halfVector));
  float specular = pow(NdotH, 60.0) * 0.8;
  finalColor += specular;
  
  // Translucency: alpha depends on fresnel and a base opacity
  float baseAlpha = 0.85; 
  float alpha = baseAlpha + rim * 0.5;
  alpha = clamp(alpha, 0.0, 1.0);
  
  gl_FragColor = vec4(finalColor, alpha);
}
`;

export default function VoiceOrb({ state, onClick, audioStream }: VoiceOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const { themeId, mode, orbColors } = useTheme();
  const safeColors = orbColors?.length === 4 ? orbColors : ['#c084fc','#8B2FE8','#0CB8E8','#ff375f'];

  const reqIdRef = useRef<number>(0);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Parse CSS var back to THREE.Color
  const parseColor = (varName: string) => new THREE.Color("#ffffff");

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
    camera.position.z = 2.8;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(90, 90);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.debug.checkShaderErrors = true;
    renderer.domElement.style.pointerEvents = 'none';
    console.log("WebGLRenderer initialized in VoiceOrb");
    containerRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(1, 64, 64);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.FrontSide,
      uniforms: {
        u_time: { value: 0.0 },
        u_amplitude: { value: 0.0 },
        u_state: { value: 0.0 },
        u_breathe: { value: 1.0 },
        u_weights: { value: new THREE.Vector3(1.0, 0.0, 0.0) },
        u_color1: { value: new THREE.Color('#000000') },
        u_color2: { value: new THREE.Color('#000000') },
        u_color3: { value: new THREE.Color('#000000') },
        u_color4: { value: new THREE.Color('#000000') },
        u_orbBg: { value: new THREE.Color(THEMES[themeId][mode].orbBg) },
      }
    });

    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    let targetWeights = new THREE.Vector3(1.0, 0.0, 0.0);
    let targetState = 0.0;
    let frameCount = 0;
    let firstFrame = true;

    const updateLoop = () => {
      reqIdRef.current = requestAnimationFrame(updateLoop);
      if (!materialRef.current || !meshRef.current) return;
      
      if (firstFrame) {
        console.log('u_color1 value', materialRef.current.uniforms.u_color1.value);
        firstFrame = false;
      }
      
      frameCount++;
      if (frameCount % 60 === 0) {
         console.log("VoiceOrb updateLoop running, frame:", frameCount, "u_color1:", materialRef.current.uniforms.u_color1.value);
      }

      const mat = materialRef.current;
      const m = meshRef.current;

      // Map string state to shader states
      let activeStateId = 0;
      if (stateRef.current === "idle") activeStateId = 0;
      else if (stateRef.current === "recording") activeStateId = 1;
      else if (stateRef.current === "parsing") activeStateId = 2;

      targetState = activeStateId;
      mat.uniforms.u_state.value = THREE.MathUtils.lerp(mat.uniforms.u_state.value, targetState, 0.1);

      targetWeights.set(
        activeStateId === 0 ? 1 : 0,
        activeStateId === 1 ? 1 : 0,
        activeStateId === 2 ? 1 : 0
      );
      
      mat.uniforms.u_weights.value.lerp(targetWeights, 0.08);

      let targetAmplitude = 0.0;
      if (stateRef.current === "recording" && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        let sum = 0;
        // Focus heavily on voice frequencies (approx first 20 bins for 256 fftSize)
        const limit = Math.min(20, dataArrayRef.current.length);
        for (let i = 0; i < limit; i++) sum += dataArrayRef.current[i];
        targetAmplitude = (sum / limit) / 255.0;
        targetAmplitude = Math.min(targetAmplitude * 4.0, 1.0); // Significantly boost reactivity
      }

      mat.uniforms.u_amplitude.value = THREE.MathUtils.lerp(mat.uniforms.u_amplitude.value, targetAmplitude, 0.4);

      if (stateRef.current === "idle") {
        m.rotation.y += 0.0018;
        mat.uniforms.u_time.value += 0.007;
        m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, 1.0, 0.08));
      } else if (stateRef.current === "recording") {
        m.rotation.y = 0; // locked
        mat.uniforms.u_time.value += 0.015 + mat.uniforms.u_amplitude.value * 0.018;
        const s = 1.0 + mat.uniforms.u_amplitude.value * 0.35;
        m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, s, 0.25));
      } else if (stateRef.current === "parsing") {
        m.rotation.y = 0;
        mat.uniforms.u_time.value += 0.011;
        const b = Math.sin(Date.now() * 0.0018) * 0.08 + 1.0;
        mat.uniforms.u_breathe.value = b;
        m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, b, 0.05));
      }

      renderer.render(scene, camera);
    };

    updateLoop();

    return () => {
      cancelAnimationFrame(reqIdRef.current);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []); // Only init scene once

  console.log('orbColors from context', safeColors);

  useEffect(() => {
    if (!materialRef.current || !safeColors || safeColors.length !== 4) return;
    console.log('applying orb colors', safeColors);
    materialRef.current.uniforms.u_color1.value.set(safeColors[0]);
    materialRef.current.uniforms.u_color2.value.set(safeColors[1]);
    materialRef.current.uniforms.u_color3.value.set(safeColors[2]);
    materialRef.current.uniforms.u_color4.value.set(safeColors[3]);
    const bgColor = new THREE.Color(THEMES[themeId][mode].orbBg);
    materialRef.current.uniforms.u_orbBg.value.copy(bgColor);
    materialRef.current.uniformsNeedUpdate = true;
  }, [safeColors, themeId, mode]);

  // Handle audio stream updates
  useEffect(() => {
    if (state === "recording" && audioStream) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(audioStream);
      source.connect(analyser);
      ctx.resume().catch(()=>{});
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    } else {
      if (audioCtxRef.current?.state !== "closed") {
        audioCtxRef.current?.close().catch(()=>{});
      }
      audioCtxRef.current = null;
      analyserRef.current = null;
      dataArrayRef.current = null;
    }

    return () => {
      if (audioCtxRef.current?.state !== "closed") {
        audioCtxRef.current?.close().catch(()=>{});
      }
    };
  }, [state, audioStream]);

  return (
    <div 
      className="cursor-pointer shadow-xl transition-transform duration-300 hover:scale-105 active:scale-95"
      onClick={onClick}
      onTouchStart={onClick}
      style={{
        width: 110,
        height: 110,
        borderRadius: "50%",
        transform: "translateZ(0)",
      }}
    >
      <div ref={containerRef} style={{ width: 110, height: 110 }} />
    </div>
  );
}
