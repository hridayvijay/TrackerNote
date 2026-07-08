const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceNoteCreator.tsx', 'utf8');

const oldWrapper = `          <div className="relative">
            <VoiceOrb 
              state={isParsing ? "parsing" : isRecording ? "recording" : "idle"}
              onClick={handleMicClick}
              audioStream={audioStream}
            />
          </div>`;

const newWrapper = `          <div className="relative group">
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

content = content.replace(oldWrapper, newWrapper);
fs.writeFileSync('src/components/VoiceNoteCreator.tsx', content);
