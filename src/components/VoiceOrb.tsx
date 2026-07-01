import React, { useRef, useEffect } from "react";
import * as THREE from "three";

interface VoiceOrbProps {
  state: "idle" | "recording" | "parsing";
  onClick: () => void;
  audioStream?: MediaStream | null;
  orbColors?: {
    color1?: string;
    color2?: string;
    color3?: string;
    color4?: string;
  };
}

export default function VoiceOrb({ state, onClick, audioStream, orbColors }: VoiceOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  
  const reqIdRef = useRef<number>(0);
  
  // Audio analyzer refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Set up Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
    camera.position.z = 2.5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(100, 100);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Get Colors from CSS or props
    const getCssColor = (varName: string) => {
      const styles = getComputedStyle(document.documentElement);
      return styles.getPropertyValue(varName).trim();
    };

    const c1 = new THREE.Color(orbColors?.color1 || getCssColor("--orb-color-1") || "#bf5af2");
    const c2 = new THREE.Color(orbColors?.color2 || getCssColor("--orb-color-2") || "#32ade6");
    const c3 = new THREE.Color(orbColors?.color3 || getCssColor("--orb-color-3") || "#ff375f");
    const c4 = new THREE.Color(orbColors?.color4 || getCssColor("--orb-color-4") || "#30d158");

    // Geometry and Material
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    // Shader with inline simplex noise
    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vNormal = normal;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform float u_amplitude;
      
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform vec3 u_color3;
      uniform vec3 u_color4;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;

      // Simplex 3D Noise 
      // by Ian McEwan, Ashima Arts
      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

      float snoise(vec3 v){ 
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

        // First corner
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;

        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );

        //  x0 = x0 - 0.0 + 0.0 * C 
        vec3 x1 = x0 - i1 + 1.0 * C.xxx;
        vec3 x2 = x0 - i2 + 2.0 * C.xxx;
        vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

        // Permutations
        i = mod(i, 289.0 ); 
        vec4 p = permute( permute( permute( 
                   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

        // Gradients
        float n_ = 1.0/7.0; // N=7
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

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

        //Normalise gradients
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        // Mix final noise value
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                      dot(p2,x2), dot(p3,x3) ) );
      }

      void main() {
        float n = snoise(vPosition * 1.5 + u_time);
        
        // Map noise to colors
        vec3 color = mix(u_color1, u_color2, smoothstep(-1.0, 0.0, n));
        color = mix(color, u_color3, smoothstep(0.0, 0.5, n));
        color = mix(color, u_color4, smoothstep(0.5, 1.0, n));
        
        // Add brightness based on amplitude
        color += vec3(u_amplitude * 0.5);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0.0 },
        u_amplitude: { value: 0.15 },
        u_color1: { value: c1 },
        u_color2: { value: c2 },
        u_color3: { value: c3 },
        u_color4: { value: c4 },
      }
    });

    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    // Animation Loop
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      if (!materialRef.current || !meshRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      // Render
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    animate();

    return () => {
      cancelAnimationFrame(reqIdRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []); // Run once on mount to setup

  // Handle state updates and animation logic within a rAF
  useEffect(() => {
    let animId = 0;
    
    // Audio analyzer setup if recording
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

    const updateLoop = () => {
       animId = requestAnimationFrame(updateLoop);
       if (!materialRef.current || !meshRef.current) return;

       const mat = materialRef.current;
       const mesh = meshRef.current;

       if (state === "idle") {
         mat.uniforms.u_time.value += 0.003;
         mat.uniforms.u_amplitude.value = 0.15;
         mesh.rotation.y += 0.002;
         mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
       } else if (state === "recording") {
         mat.uniforms.u_time.value += 0.008;
         mesh.rotation.y += 0.004;

         if (analyserRef.current && dataArrayRef.current) {
           analyserRef.current.getByteFrequencyData(dataArrayRef.current);
           let sum = 0;
           for (let i = 0; i < dataArrayRef.current.length; i++) sum += dataArrayRef.current[i];
           const avg = sum / dataArrayRef.current.length;
           const normalizedAmplitude = avg / 255.0; // 0 to 1

           // Smoothly transition amplitude uniform
           mat.uniforms.u_amplitude.value = THREE.MathUtils.lerp(mat.uniforms.u_amplitude.value, normalizedAmplitude, 0.2);
           
           // Scale based on amplitude
           const targetScale = 1.0 + (normalizedAmplitude * 0.12);
           mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
         }
       } else if (state === "parsing") {
         mat.uniforms.u_time.value += 0.005;
         mat.uniforms.u_amplitude.value = 0.4;
         mesh.rotation.y += 0.005;

         const breathe = Math.sin(Date.now() * 0.002) * 0.08 + 1.0;
         mesh.scale.setScalar(breathe);
       }
    };

    updateLoop();

    return () => {
       cancelAnimationFrame(animId);
       if (audioCtxRef.current?.state !== "closed") {
         audioCtxRef.current?.close().catch(()=>{});
       }
    };
  }, [state, audioStream]);

  return (
    <div 
      className="cursor-pointer shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
      onClick={onClick}
      style={{
        width: 100,
        height: 100,
        borderRadius: "50%",
        overflow: "hidden",
        WebkitMask: "radial-gradient(circle, white 100%, transparent 100%)",
        transform: "translateZ(0)",
      }}
    >
      <div ref={containerRef} style={{ width: 100, height: 100 }} />
    </div>
  );
}
