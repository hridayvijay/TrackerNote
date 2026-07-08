const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceOrb.tsx', 'utf8');

content = content.replace(
  'mat.uniforms.u_amplitude.value = THREE.MathUtils.lerp(mat.uniforms.u_amplitude.value, targetAmplitude, 0.15);',
  'mat.uniforms.u_amplitude.value = THREE.MathUtils.lerp(mat.uniforms.u_amplitude.value, targetAmplitude, 0.4);'
);

fs.writeFileSync('src/components/VoiceOrb.tsx', content);
