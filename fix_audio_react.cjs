const fs = require('fs');

let content = fs.readFileSync('src/components/VoiceOrb.tsx', 'utf8');

// Add ctx.resume()
content = content.replace(
  'source.connect(analyser);',
  'source.connect(analyser);\n      ctx.resume().catch(()=>{});'
);

// Better amplitude logic
const oldAmpLogic = `        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) sum += dataArrayRef.current[i];
        targetAmplitude = (sum / dataArrayRef.current.length) / 255.0;`;

const newAmpLogic = `        let sum = 0;
        // Only average lower half of spectrum where voice mostly sits
        const limit = Math.floor(dataArrayRef.current.length / 2);
        for (let i = 0; i < limit; i++) sum += dataArrayRef.current[i];
        targetAmplitude = (sum / limit) / 255.0;
        targetAmplitude = Math.min(targetAmplitude * 2.5, 1.0); // Boost reactivity`;

content = content.replace(oldAmpLogic, newAmpLogic);

fs.writeFileSync('src/components/VoiceOrb.tsx', content);
