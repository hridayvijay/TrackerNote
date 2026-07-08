const fs = require('fs');
let orbContent = fs.readFileSync('src/components/VoiceOrb.tsx', 'utf8');

const oldAmpLogic = `        // Only average lower half of spectrum where voice mostly sits
        const limit = Math.floor(dataArrayRef.current.length / 2);
        for (let i = 0; i < limit; i++) sum += dataArrayRef.current[i];
        targetAmplitude = (sum / limit) / 255.0;
        targetAmplitude = Math.min(targetAmplitude * 2.5, 1.0); // Boost reactivity`;

const newAmpLogic = `        // Focus heavily on voice frequencies (approx first 20 bins for 256 fftSize)
        const limit = Math.min(20, dataArrayRef.current.length);
        for (let i = 0; i < limit; i++) sum += dataArrayRef.current[i];
        targetAmplitude = (sum / limit) / 255.0;
        targetAmplitude = Math.min(targetAmplitude * 4.0, 1.0); // Significantly boost reactivity`;

orbContent = orbContent.replace(oldAmpLogic, newAmpLogic);
fs.writeFileSync('src/components/VoiceOrb.tsx', orbContent);
