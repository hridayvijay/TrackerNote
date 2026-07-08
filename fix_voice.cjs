const fs = require('fs');

// 1. Update VoiceOrb.tsx
let orbContent = fs.readFileSync('src/components/VoiceOrb.tsx', 'utf8');

const newFragmentShader = `
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
  float baseAlpha = 0.55; 
  float alpha = baseAlpha + rim * 0.7;
  alpha = clamp(alpha, 0.0, 1.0);
  
  gl_FragColor = vec4(finalColor, alpha);
}
`;

const fragRegex = /const fragmentShader = `[\s\S]*?\n`;/;
orbContent = orbContent.replace(fragRegex, "const fragmentShader = `" + newFragmentShader + "`;");

// Update animation scaler logic
const oldScaleLogic = `      if (state === "idle") {
        m.rotation.y += 0.0018;
        mat.uniforms.u_time.value += 0.007;
        m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, 1.0, 0.08));
      } else if (state === "recording") {
        m.rotation.y = 0; // locked
        mat.uniforms.u_time.value += 0.015 + mat.uniforms.u_amplitude.value * 0.018;
        const s = 1.0 + mat.uniforms.u_amplitude.value * 0.12;
        m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, s, 0.08));
      }`;

const newScaleLogic = `      if (state === "idle") {
        m.rotation.y += 0.0018;
        mat.uniforms.u_time.value += 0.007;
        m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, 1.0, 0.08));
      } else if (state === "recording") {
        m.rotation.y = 0; // locked
        mat.uniforms.u_time.value += 0.015 + mat.uniforms.u_amplitude.value * 0.018;
        const s = 1.0 + mat.uniforms.u_amplitude.value * 0.35;
        m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, s, 0.25));
      }`;

orbContent = orbContent.replace(oldScaleLogic, newScaleLogic);

// Add blending mode for translucency
const oldMaterial = `const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.FrontSide,`;
const newMaterial = `const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,`;

orbContent = orbContent.replace(oldMaterial, newMaterial);
fs.writeFileSync('src/components/VoiceOrb.tsx', orbContent);


// 2. Update VoiceNoteCreator.tsx backdrop
let creatorContent = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

const oldWrapper = `          <div className="relative group">
            {/* Backdrop glow */}
            <div className={\`absolute inset-0 rounded-full blur-xl transition-all duration-700 \${isRecording ? 'bg-[var(--theme-accent)] opacity-40 scale-125' : 'bg-[var(--theme-accent)] opacity-0 group-hover:opacity-20 scale-100'}\`} />
            <div className="relative z-10">
              <VoiceOrb 
                state={isParsing ? "parsing" : isRecording ? "recording" : "idle"}
                onClick={handleMicClick}
                audioStream={audioStream}
              />
            </div>
          </div>`;

const newWrapper = `          <div className="relative z-10">
            <VoiceOrb 
              state={isParsing ? "parsing" : isRecording ? "recording" : "idle"}
              onClick={handleMicClick}
              audioStream={audioStream}
            />
          </div>`;

creatorContent = creatorContent.replace(oldWrapper, newWrapper);
fs.writeFileSync('src/components/VoiceNoteCreator.tsx', creatorContent);
