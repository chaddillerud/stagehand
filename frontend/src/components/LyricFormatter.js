import { useState, useEffect } from "react";
import { X, Wand2 } from "lucide-react";
import { toast } from "sonner";

export default function LyricFormatter({ lyrics, onApply, onClose }) {
  const [formatMode, setFormatMode] = useState('chords-above');
  const [preview, setPreview] = useState('');

  // Detect if text has chord notation
  const detectChords = (text) => {
    // Common chord patterns: A, Am, A7, Asus4, C#m, etc.
    const chordPattern = /^[A-G](#|b)?(m|maj|min|aug|dim|sus|add)?[0-9]?$/;
    const lines = text.split('\n');
    
    let chordLines = 0;
    lines.forEach(line => {
      const words = line.trim().split(/\s+/);
      if (words.length > 0 && words.length <= 6) {
        const allChords = words.every(word => 
          chordPattern.test(word) || word === ''
        );
        if (allChords && words.filter(w => w !== '').length > 0) {
          chordLines++;
        }
      }
    });
    
    return chordLines > 0;
  };

  // Format lyrics based on mode
  const formatLyrics = (text, mode) => {
    if (!text) return '';
    
    const lines = text.split('\n');
    const hasChords = detectChords(text);
    
    if (mode === 'lyrics-only') {
      // Remove chord lines (lines with only chords)
      const chordPattern = /^[A-G](#|b)?(m|maj|min|aug|dim|sus|add)?[0-9]?\s*$/;
      return lines
        .filter(line => {
          const words = line.trim().split(/\s+/);
          if (words.length === 0) return true;
          if (words.length > 6) return true; // Probably not a chord line
          return !words.every(w => chordPattern.test(w) || w === '');
        })
        .join('\n')
        .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive blank lines
        .trim();
    }
    
    if (mode === 'chords-above' && hasChords) {
      // Keep chords above lyrics, standardize spacing
      const formatted = [];
      let prevLineWasChord = false;
      
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        
        // Detect if this is a chord line
        const words = trimmed.split(/\s+/);
        const isChordLine = words.length > 0 && words.length <= 6 &&
          words.every(w => /^[A-G](#|b)?(m|maj|min|aug|dim|sus|add)?[0-9]?$/.test(w) || w === '');
        
        // Detect section markers (CHORUS, VERSE, etc.)
        const isSectionMarker = /^(CHORUS|VERSE|BRIDGE|INTRO|OUTRO|PRE-CHORUS|INSTRUMENTAL)/i.test(trimmed);
        
        if (trimmed === '') {
          // Add blank line only if previous line wasn't blank
          if (formatted.length > 0 && formatted[formatted.length - 1] !== '') {
            formatted.push('');
          }
        } else if (isSectionMarker) {
          // Add section marker with spacing
          if (formatted.length > 0) formatted.push('');
          formatted.push(trimmed.toUpperCase());
          formatted.push('');
        } else if (isChordLine) {
          // Add chord line
          formatted.push(trimmed);
          prevLineWasChord = true;
        } else {
          // Regular lyric line
          formatted.push(trimmed);
          prevLineWasChord = false;
        }
      });
      
      return formatted.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }
    
    if (mode === 'chords-inline' && hasChords) {
      // Convert chords to inline format [C]word [Am]word
      const formatted = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
        
        // Check if this is a chord line
        const words = line.split(/\s+/);
        const isChordLine = words.length > 0 && words.length <= 6 &&
          words.every(w => /^[A-G](#|b)?(m|maj|min|aug|dim|sus|add)?[0-9]?$/.test(w) || w === '');
        
        if (isChordLine && nextLine && nextLine !== '') {
          // Next line is lyrics, merge chords inline
          const chords = line.split(/\s+/).filter(c => c !== '');
          const lyricWords = nextLine.split(' ');
          
          // Simple merge: put chords at start of words
          let result = '';
          chords.forEach((chord, idx) => {
            if (idx < lyricWords.length) {
              result += `[${chord}]${lyricWords[idx]} `;
            } else {
              result += `[${chord}] `;
            }
          });
          // Add remaining words without chords
          if (lyricWords.length > chords.length) {
            result += lyricWords.slice(chords.length).join(' ');
          }
          
          formatted.push(result.trim());
          i++; // Skip next line (already processed)
        } else if (!isChordLine) {
          formatted.push(line);
        }
      }
      
      return formatted.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }
    
    if (mode === 'clean') {
      // Just clean up spacing, keep everything else
      return lines
        .map(l => l.trimEnd()) // Remove trailing spaces
        .join('\n')
        .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive blank lines
        .trim();
    }
    
    return text;
  };

  // Update preview when mode changes or lyrics change
  useEffect(() => {
    setPreview(formatLyrics(lyrics, formatMode));
  }, [formatMode, lyrics]);

  const handleFormatChange = (mode) => {
    setFormatMode(mode);
  };

  const handleApply = () => {
    onApply(preview);
    toast.success("Formatting applied! Click 'Save Changes' to save the song.");
    onClose();
  };

  const hasChords = detectChords(lyrics);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border-2 border-yellow-400 rounded-none w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-oswald font-bold uppercase text-yellow-400 flex items-center gap-2">
              <Wand2 size={24} strokeWidth={2} />
              Lyric Formatter
            </h3>
            <p className="text-zinc-400 text-sm mt-1">
              {hasChords ? '✓ Chords detected' : '○ No chords detected'} - Standardize formatting and spacing
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Format Options */}
        <div className="p-6 border-b border-zinc-800 bg-zinc-950">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => handleFormatChange('chords-above')}
              className={`p-3 rounded-none border-2 transition-all ${
                formatMode === 'chords-above'
                  ? 'border-yellow-400 bg-yellow-400/10'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <div className="font-bold text-white text-sm mb-1">Chords Above</div>
              <div className="text-xs text-zinc-500 font-mono">
                C    Am<br/>
                Lyrics here
              </div>
            </button>

            <button
              onClick={() => handleFormatChange('chords-inline')}
              className={`p-3 rounded-none border-2 transition-all ${
                formatMode === 'chords-inline'
                  ? 'border-yellow-400 bg-yellow-400/10'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <div className="font-bold text-white text-sm mb-1">Chords Inline</div>
              <div className="text-xs text-zinc-500 font-mono">
                [C]Lyrics [Am]here
              </div>
            </button>

            <button
              onClick={() => handleFormatChange('lyrics-only')}
              className={`p-3 rounded-none border-2 transition-all ${
                formatMode === 'lyrics-only'
                  ? 'border-yellow-400 bg-yellow-400/10'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <div className="font-bold text-white text-sm mb-1">Lyrics Only</div>
              <div className="text-xs text-zinc-500">
                Remove chords,<br/>keep lyrics
              </div>
            </button>

            <button
              onClick={() => handleFormatChange('clean')}
              className={`p-3 rounded-none border-2 transition-all ${
                formatMode === 'clean'
                  ? 'border-yellow-400 bg-yellow-400/10'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <div className="font-bold text-white text-sm mb-1">Clean Only</div>
              <div className="text-xs text-zinc-500">
                Fix spacing,<br/>keep format
              </div>
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {/* Before */}
            <div className="flex flex-col">
              <div className="text-sm font-oswald uppercase text-zinc-500 mb-2">Before</div>
              <textarea
                value={lyrics}
                readOnly
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-none p-4 text-white font-mono text-sm leading-relaxed resize-none focus:outline-none"
              />
            </div>

            {/* After */}
            <div className="flex flex-col">
              <div className="text-sm font-oswald uppercase text-yellow-400 mb-2">After (Preview)</div>
              <textarea
                value={preview}
                readOnly
                className="flex-1 bg-zinc-950 border-2 border-yellow-400 rounded-none p-4 text-white font-mono text-sm leading-relaxed resize-none focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-zinc-800 flex gap-4">
          <button
            onClick={handleApply}
            data-testid="format-apply"
            className="flex-1 rounded-none font-oswald uppercase tracking-wider font-bold bg-yellow-400 text-black hover:bg-yellow-500 transition-all active:scale-95 border-2 border-transparent px-6 py-3"
          >
            Apply Formatting
          </button>
          <button
            onClick={onClose}
            data-testid="format-cancel"
            className="flex-1 rounded-none font-oswald uppercase tracking-wider font-bold bg-zinc-800 text-white hover:bg-zinc-700 border-2 border-zinc-700 px-6 py-3"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
