const fs = require('fs');

let content = fs.readFileSync('src/components/VoiceOrb.tsx', 'utf8');

const newVertexShader = `
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
  float n = snoise(vec3(vPosition.xy * 2.0, u_time * 0.3));
  float n2 = snoise(vec3(vPosition.yz * 3.0, u_time * 0.4 + 10.0));
  float n3 = snoise(vec3(vPosition.zx * 2.5, u_time * 0.2 + 20.0));
  
  vec3 baseColor = u_color1;
  
  // Idle state
  vec3 colorIdle = mix(baseColor, u_color2, smoothstep(-0.5, 0.5, n));
  colorIdle = mix(colorIdle, u_color3, smoothstep(-0.3, 0.8, n2));
  colorIdle = mix(colorIdle, u_color4, smoothstep(0.0, 1.0, n3));
  
  // Recording state
  float recTime = u_time * (1.0 + u_amplitude * 2.0);
  float rn = snoise(vec3(vPosition.xy * (2.0 + u_amplitude*3.0), recTime * 0.5));
  float rn2 = snoise(vec3(vPosition.yz * (3.0 + u_amplitude*2.0), recTime * 0.6 + 10.0));
  float rn3 = snoise(vec3(vPosition.zx * (2.5 + u_amplitude*2.5), recTime * 0.4 + 20.0));
  
  vec3 colorRec = mix(baseColor, u_color2, smoothstep(-1.0, 0.5, rn));
  colorRec = mix(colorRec, u_color3, smoothstep(-0.5, 0.5, rn2));
  colorRec = mix(colorRec, u_color4, smoothstep(0.0, 1.0, rn3));
  
  // Make it brighter based on amplitude
  colorRec += vec3(u_amplitude * 0.8);
  
  // Parsing state (scanning bands)
  float band1 = sin(vPosition.y*4.0 + u_time*2.0)*0.5+0.5;
  float band2 = sin(vPosition.y*6.0 - u_time*1.5 + vPosition.x*3.0)*0.5+0.5;
  float band3 = sin(vPosition.y*3.0 + u_time*1.2 + vPosition.z*2.5)*0.5+0.5;
  vec3 colorParse = mix(u_color1, u_color2, band1);
  colorParse = mix(colorParse, u_color3, band2);
  colorParse = mix(colorParse, u_color4, band3);
  colorParse *= u_breathe;
  
  // Final mix based on state weights
  vec3 color = colorIdle * u_weights.x + colorRec * u_weights.y + colorParse * u_weights.z;
  
  // Lighting and glass effect
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  
  // Soft rim light
  float rim = 1.0 - max(dot(viewDir, normal), 0.0);
  rim = smoothstep(0.6, 1.0, rim);
  color += vec3(rim * 0.3);
  
  // Specular highlight
  vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
  vec3 halfVector = normalize(lightDir + viewDir);
  float NdotH = max(0.0, dot(normal, halfVector));
  float specular = pow(NdotH, 64.0);
  color += vec3(specular * 0.8);
  
  // Contrast boost
  color = smoothstep(0.0, 1.1, color);

  gl_FragColor = vec4(color, 1.0);
}
`;

const vertexRegex = /const vertexShader = `[\s\S]*?\n`;/;
const fragRegex = /const fragmentShader = `[\s\S]*?\n`;/;

content = content.replace(vertexRegex, "const vertexShader = `" + newVertexShader + "`;");
content = content.replace(fragRegex, "const fragmentShader = `" + newFragmentShader + "`;");

fs.writeFileSync('src/components/VoiceOrb.tsx', content);
console.log("Shaders updated.");
