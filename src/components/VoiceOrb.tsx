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

  vec3 displaced = position;
  if (u_state > 0.5 && u_state < 1.5) {
    float disp = snoise(position * 3.0 + u_time * 0.5) * u_amplitude * 0.12;
    displaced = position + normal * disp;
  } else if (u_state > 1.5) {
    float wave = sin(position.y * 4.0 + u_time * 2.0) * 0.035;
    displaced = position + normal * wave;
  }

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
  vec3 colorIdle = vec3(0.0);
  vec3 colorRec = vec3(0.0);
  vec3 colorParse = vec3(0.0);
  
  if (u_weights.x > 0.0) {
    float t = u_time * 0.15;
    vec3 b1Center = vec3(cos(t)*0.4, sin(t*0.7)*0.4, sin(t*0.5)*0.3);
    vec3 b2Center = vec3(cos(t+2.09)*0.38, sin(t*0.6+1.0)*0.35, cos(t*0.8)*0.3);
    vec3 b3Center = vec3(cos(t+4.19)*0.34, sin(t*0.9+2.0)*0.32, sin(t)*0.28);
    float b1 = 1.0 - smoothstep(0.0, 0.6, length(vPosition - b1Center));
    float b2 = 1.0 - smoothstep(0.0, 0.55, length(vPosition - b2Center));
    float b3 = 1.0 - smoothstep(0.0, 0.5, length(vPosition - b3Center));
    colorIdle = mix(u_orbBg, u_color1, b1); 
    colorIdle = mix(colorIdle, u_color2, b2); 
    colorIdle = mix(colorIdle, u_color3, b3*0.7);
    colorIdle *= 0.82;
  }
  
  if (u_weights.y > 0.0) {
    float orbitR = 0.08 + u_amplitude * 0.62;
    float rt = u_time * 0.2;
    vec3 b1C = vec3(cos(rt)*orbitR, sin(rt)*orbitR, 0.0);
    vec3 b2C = vec3(cos(rt+1.57)*orbitR, sin(rt+1.57)*orbitR, 0.0);
    vec3 b3C = vec3(cos(rt+3.14)*orbitR, sin(rt+3.14)*orbitR, 0.0);
    vec3 b4C = vec3(cos(rt+4.71)*orbitR, sin(rt+4.71)*orbitR, 0.0);
    float blobSize = 0.5 + u_amplitude * 0.4;
    float b1 = 1.0 - smoothstep(0.0, blobSize, length(vPosition - b1C));
    float b2 = 1.0 - smoothstep(0.0, blobSize, length(vPosition - b2C));
    float b3 = 1.0 - smoothstep(0.0, blobSize, length(vPosition - b3C));
    float b4 = 1.0 - smoothstep(0.0, blobSize, length(vPosition - b4C));
    
    colorRec = mix(u_orbBg, u_color1, b1);
    colorRec = mix(colorRec, u_color2, b2);
    colorRec = mix(colorRec, u_color3, b3);
    colorRec = mix(colorRec, u_color4, b4);
    
    float sat = 1.0 + u_amplitude * 0.45; 
    float lum = dot(colorRec, vec3(0.299,0.587,0.114)); 
    colorRec = mix(vec3(lum), colorRec, sat);
    colorRec *= (0.85 + u_amplitude * 0.4);
  }
  
  if (u_weights.z > 0.0) {
    float band1 = sin(vPosition.y*3.0 + u_time*1.4)*0.5+0.5;
    float band2 = sin(vPosition.y*5.0 - u_time*1.0 + vPosition.x*2.0)*0.5+0.5;
    float band3 = sin(vPosition.y*2.0 + u_time*0.8 + vPosition.z*1.5)*0.5+0.5;
    colorParse = mix(u_color1, u_color2, band1);
    colorParse = mix(colorParse, u_color3, band2*0.65);
    colorParse = mix(colorParse, u_color4, band3*0.4);
    
    float scanA = u_time * 2.5;
    vec3 scanDir = normalize(vec3(sin(scanA), 0.0, cos(scanA)));
    float scan = 1.0 - smoothstep(0.0, 0.06, abs(dot(normalize(vPosition), scanDir) - 0.92));
    colorParse += vec3(scan * 0.85);
    colorParse *= u_breathe;
  }
  
  vec3 color = colorIdle * u_weights.x + colorRec * u_weights.y + colorParse * u_weights.z;

  // GLASS EFFECT
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 2.5);
  color = mix(color, vec3(1.0), fresnel * 0.28);
  
  vec3 lightDir = normalize(vec3(-0.5, 0.8, 1.0));
  vec3 viewDir = normalize(vViewPosition);
  vec3 reflectDir = reflect(-lightDir, normalize(vNormal));
  float spec = pow(max(dot(reflectDir, viewDir), 0.0), 52.0);
  color += vec3(spec * 0.52);
  
  vec3 shadowDir = normalize(vec3(0.3, -0.8, -0.5));
  float shadow = pow(max(dot(normalize(vNormal), shadowDir), 0.0), 4.0);
  color = mix(color, color * 0.25, shadow * 0.38);
  
  float alpha = 0.86 + fresnel * 0.14;
  gl_FragColor = vec4(color, alpha);
}
`;

export default function VoiceOrb({ state, onClick, audioStream }: VoiceOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const { themeId, mode } = useTheme();

  const reqIdRef = useRef<number>(0);
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
        u_color1: { value: new THREE.Color(THEMES[themeId][mode].orb[0]) },
        u_color2: { value: new THREE.Color(THEMES[themeId][mode].orb[1]) },
        u_color3: { value: new THREE.Color(THEMES[themeId][mode].orb[2]) },
        u_color4: { value: new THREE.Color(THEMES[themeId][mode].orb[3]) },
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

    const updateLoop = () => {
      reqIdRef.current = requestAnimationFrame(updateLoop);
      if (!materialRef.current || !meshRef.current) return;
      
      frameCount++;
      if (frameCount % 60 === 0) {
         console.log("VoiceOrb updateLoop running, frame:", frameCount);
      }

      const mat = materialRef.current;
      const m = meshRef.current;

      // Map string state to shader states
      let activeStateId = 0;
      if (state === "idle") activeStateId = 0;
      else if (state === "recording") activeStateId = 1;
      else if (state === "parsing") activeStateId = 2;

      targetState = activeStateId;
      mat.uniforms.u_state.value = THREE.MathUtils.lerp(mat.uniforms.u_state.value, targetState, 0.1);

      targetWeights.set(
        activeStateId === 0 ? 1 : 0,
        activeStateId === 1 ? 1 : 0,
        activeStateId === 2 ? 1 : 0
      );
      
      mat.uniforms.u_weights.value.lerp(targetWeights, 0.08);

      let targetAmplitude = 0.0;
      if (state === "recording" && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) sum += dataArrayRef.current[i];
        targetAmplitude = (sum / dataArrayRef.current.length) / 255.0;
      }

      mat.uniforms.u_amplitude.value = THREE.MathUtils.lerp(mat.uniforms.u_amplitude.value, targetAmplitude, 0.15);

      if (state === "idle") {
        m.rotation.y += 0.0018;
        mat.uniforms.u_time.value += 0.007;
        m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, 1.0, 0.08));
      } else if (state === "recording") {
        m.rotation.y = 0; // locked
        mat.uniforms.u_time.value += 0.015 + mat.uniforms.u_amplitude.value * 0.018;
        const s = 1.0 + mat.uniforms.u_amplitude.value * 0.12;
        m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, s, 0.08));
      } else if (state === "parsing") {
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

  // Re-read colors when theme changes
  useEffect(() => {
    if (!materialRef.current) return;
    
    // We delay slightly to let CSS variables apply via Context
    const t = setTimeout(() => {
      materialRef.current!.uniforms.u_color1.value = new THREE.Color(THEMES[themeId][mode].orb[0]);
      materialRef.current!.uniforms.u_color2.value = new THREE.Color(THEMES[themeId][mode].orb[1]);
      materialRef.current!.uniforms.u_color3.value = new THREE.Color(THEMES[themeId][mode].orb[2]);
      materialRef.current!.uniforms.u_color4.value = new THREE.Color(THEMES[themeId][mode].orb[3]);
      materialRef.current!.uniforms.u_orbBg.value = new THREE.Color(THEMES[themeId][mode].orbBg);
    }, 50);

    return () => clearTimeout(t);
  }, [themeId, mode]);

  // Handle audio stream updates
  useEffect(() => {
    if (state === "recording" && audioStream) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(audioStream);
      source.connect(analyser);
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
      style={{
        width: 90,
        height: 90,
        borderRadius: "50%",
        overflow: "hidden",
        WebkitMask: "radial-gradient(circle, white 100%, transparent 100%)",
        transform: "translateZ(0)",
      }}
    >
      <div ref={containerRef} style={{ width: 90, height: 90 }} />
    </div>
  );
}
