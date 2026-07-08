const fs = require('fs');
let orbContent = fs.readFileSync('src/components/VoiceOrb.tsx', 'utf8');

const oldMaterial = `const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,`;
const newMaterial = `const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.FrontSide,`;

orbContent = orbContent.replace(oldMaterial, newMaterial);

const oldAlpha = `float baseAlpha = 0.55; 
  float alpha = baseAlpha + rim * 0.7;`;
const newAlpha = `float baseAlpha = 0.85; 
  float alpha = baseAlpha + rim * 0.5;`;
orbContent = orbContent.replace(oldAlpha, newAlpha);

fs.writeFileSync('src/components/VoiceOrb.tsx', orbContent);
