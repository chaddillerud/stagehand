import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Square,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Settings,
  Bluetooth,
  X,
  Monitor,
  Smartphone
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Teleprompter() {
  const { setlistId } = useParams();
  const [setlist, setSetlist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayMode, setDisplayMode] = useState('default'); // default, high-contrast, stage-red, daylight
  const [orientation, setOrientation] = useState('landscape'); // landscape, portrait
  const [showSettings, setShowSettings] = useState(false);
  const [footPedalConnected, setFootPedalConnected] = useState(false);
  const timerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const clockRef = useRef(null);
  const lyricsRef = useRef(null);
  const gamepadRef = useRef(null);

  useEffect(() => {
    loadSetList();
    
    // Start clock
    clockRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // Keyboard shortcuts
    const handleKeyPress = (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        previous();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        stop();
      } else if (e.key === 'Home') {
        e.preventDefault();
        start();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setShowSettings(!showSettings);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    
    // Gamepad/Foot Pedal polling
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      if (gamepads && gamepads.length > 0) {
        const gamepad = gamepads[0];
        if (gamepad) {
          if (!footPedalConnected) {
            setFootPedalConnected(true);
          }
          
          // Button 0 = Next
          if (gamepad.buttons[0] && gamepad.buttons[0].pressed) {
            if (!gamepadRef.current?.button0) {
              next();
            }
            gamepadRef.current = { ...gamepadRef.current, button0: true };
          } else {
            gamepadRef.current = { ...gamepadRef.current, button0: false };
          }
          
          // Button 1 = Previous
          if (gamepad.buttons[1] && gamepad.buttons[1].pressed) {
            if (!gamepadRef.current?.button1) {
              previous();
            }
            gamepadRef.current = { ...gamepadRef.current, button1: true };
          } else {
            gamepadRef.current = { ...gamepadRef.current, button1: false };
          }
          
          // Button 2 = Play/Pause
          if (gamepad.buttons[2] && gamepad.buttons[2].pressed) {
            if (!gamepadRef.current?.button2) {
              togglePlayPause();
            }
            gamepadRef.current = { ...gamepadRef.current, button2: true };
          } else {
            gamepadRef.current = { ...gamepadRef.current, button2: false };
          }
        }
      }
      
      requestAnimationFrame(pollGamepad);
    };
    
    pollGamepad();
    
    return () => {
      if (clockRef.current) {
        clearInterval(clockRef.current);
      }
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [setlistId, isPlaying, currentIndex, showSettings]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    // Calculate total time for set list
    let total = 0;
    songs.forEach(song => {
      if (song.duration) {
        const parts = song.duration.split(':');
        if (parts.length === 2) {
          total += parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
      }
    });
    setTotalTime(total);
  }, [songs]);

  useEffect(() => {
    // Reset scroll when song changes
    if (lyricsRef.current) {
      lyricsRef.current.scrollTop = 0;
    }
  }, [currentIndex]);

  const loadSetList = async () => {
    try {
      const setlistRes = await axios.get(`${API}/setlists/${setlistId}`);
      setSetlist(setlistRes.data);

      const songsRes = await axios.get(`${API}/songs`);
      const allSongs = songsRes.data;

      const orderedSongs = [];
      for (const songId of setlistRes.data.song_ids) {
        const song = allSongs.find(s => s.id === songId);
        if (song) orderedSongs.push(song);
      }
      setSongs(orderedSongs);
    } catch (error) {
      console.error("Error loading set list:", error);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const start = () => {
    setIsPlaying(true);
    setElapsedTime(0);
    setCurrentIndex(0);
  };

  const stop = () => {
    setIsPlaying(false);
    setElapsedTime(0);
    setCurrentIndex(0);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const previous = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const next = () => {
    if (currentIndex < songs.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const skipTo = (index) => {
    setCurrentIndex(index);
  };

  const handleSongDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index);
  };

  const handleSongDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSongDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/html'));
    
    if (dragIndex === dropIndex) return;
    
    const newSongs = [...songs];
    const draggedSong = newSongs[dragIndex];
    newSongs.splice(dragIndex, 1);
    newSongs.splice(dropIndex, 0, draggedSong);
    
    // Adjust current index if needed
    if (currentIndex === dragIndex) {
      setCurrentIndex(dropIndex);
    } else if (dragIndex < currentIndex && dropIndex >= currentIndex) {
      setCurrentIndex(currentIndex - 1);
    } else if (dragIndex > currentIndex && dropIndex <= currentIndex) {
      setCurrentIndex(currentIndex + 1);
    }
    
    setSongs(newSongs);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  };

  const calculateEndTime = () => {
    const endTime = new Date(currentTime.getTime() + (totalTime - elapsedTime) * 1000);
    return endTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getDisplayModeStyles = () => {
    const modes = {
      'default': {
        bg: 'bg-black',
        text: 'text-white',
        headerBg: 'bg-zinc-900/95',
        controlsBg: 'bg-zinc-900/95',
        secondaryText: 'text-zinc-400',
        accent: 'text-yellow-400'
      },
      'high-contrast': {
        bg: 'bg-black',
        text: 'text-white',
        headerBg: 'bg-black',
        controlsBg: 'bg-black',
        secondaryText: 'text-white',
        accent: 'text-white'
      },
      'stage-red': {
        bg: 'bg-black',
        text: 'text-red-500',
        headerBg: 'bg-black',
        controlsBg: 'bg-black',
        secondaryText: 'text-red-400',
        accent: 'text-red-500'
      },
      'daylight': {
        bg: 'bg-white',
        text: 'text-black',
        headerBg: 'bg-white border-b-2 border-black',
        controlsBg: 'bg-white border-t-2 border-black',
        secondaryText: 'text-zinc-700',
        accent: 'text-black'
      }
    };
    return modes[displayMode] || modes.default;
  };

  const styles = getDisplayModeStyles();

  const getOrientationStyles = () => {
    if (orientation === 'portrait') {
      return {
        container: 'flex-col',
        header: 'flex-col gap-4 text-center',
        lyrics: 'text-3xl md:text-5xl lg:text-7xl',
        songTitle: 'text-5xl md:text-7xl',
        controls: 'flex-col gap-3',
        songNav: 'flex-col max-h-48 overflow-y-auto',
        mainControls: 'grid grid-cols-2 gap-3 w-full'
      };
    }
    return {
      container: 'flex-col',
      header: 'flex-row justify-between gap-8',
      lyrics: 'text-3xl md:text-4xl lg:text-6xl',
      songTitle: 'text-4xl md:text-6xl lg:text-8xl',
      controls: 'flex-col',
      songNav: 'flex-row overflow-x-auto',
      mainControls: 'flex gap-4'
    };
  };

  const orientStyles = getOrientationStyles();

  if (!setlist || songs.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-2xl font-mono mb-2">LOADING SET LIST...</div>
          <div className="text-zinc-600 text-sm">Please wait</div>
        </div>
      </div>
    );
  }

  const currentSong = songs[currentIndex];

  return (
    <div 
      className={`h-screen w-full ${styles.bg} ${styles.text} overflow-hidden flex flex-col`}
      onMouseMove={handleMouseMove}
    >
      {/* Header - Fixed */}
      <div 
        className={`${styles.headerBg} backdrop-blur-sm border-b border-zinc-800 p-4 transition-all duration-300 ${
          showControls ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className={`flex items-center ${orientStyles.header}`}>
          <div>
            <div className="text-xs font-oswald uppercase tracking-wider text-zinc-500">
              Set List
            </div>
            <div className={`text-xl font-oswald font-bold uppercase ${styles.accent}`}>
              {setlist.name}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xs font-oswald uppercase tracking-wider text-zinc-500">
              Current Time
            </div>
            <div className={`text-3xl font-mono font-bold ${styles.text}`} data-testid="current-time">
              {formatCurrentTime()}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-oswald uppercase tracking-wider text-zinc-500">
              Performance Time
            </div>
            <div className={`text-2xl font-mono font-bold ${styles.accent}`}>
              [{formatTime(elapsedTime)}] / [{formatTime(totalTime)}]
            </div>
            <div className={`text-sm font-mono ${styles.secondaryText} mt-1`}>
              Est. End: {calculateEndTime()}
            </div>
          </div>

          <button
            data-testid="settings-toggle"
            onClick={() => setShowSettings(!showSettings)}
            className="text-zinc-500 hover:text-yellow-400 transition-colors"
          >
            <Settings size={24} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Lyrics Display - Scrollable */}
      <div 
        ref={lyricsRef}
        className="flex-1 overflow-y-auto p-8 md:p-16"
        data-testid="lyrics-display"
      >
        <div className="max-w-4xl mx-auto">
          {/* Current Song Info */}
          <div className="mb-8">
            <h1 className={`${orientStyles.songTitle} font-mono font-bold leading-tight mb-4 ${styles.text}`}>
              {currentSong.name}
            </h1>
            {currentSong.artist && (
              <div className={`${orientation === 'portrait' ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'} ${styles.secondaryText} mb-4`}>
                {currentSong.artist}
              </div>
            )}
            <div className={`flex ${orientation === 'portrait' ? 'flex-col gap-2' : 'gap-4'} text-sm font-mono ${styles.secondaryText}`}>
              <span data-testid="song-position">
                Song {currentIndex + 1} of {songs.length}
              </span>
              {currentSong.key && <span>KEY: {currentSong.key}</span>}
              {currentSong.tempo && <span>BPM: {currentSong.tempo}</span>}
              {currentSong.duration && <span>DUR: {currentSong.duration}</span>}
            </div>
          </div>

          {/* Lyrics */}
          <div className={`${orientStyles.lyrics} font-mono font-bold leading-snug whitespace-pre-wrap ${styles.text}`}>
            {currentSong.lyrics || (
              <div className={`${displayMode === 'daylight' ? 'text-zinc-300' : 'text-zinc-700'} italic`}>No lyrics available</div>
            )}
          </div>

          {/* Notes */}
          {currentSong.notes && (
            <div className={`mt-8 p-6 ${displayMode === 'daylight' ? 'bg-zinc-100 border-2 border-zinc-300' : 'bg-zinc-900/50 border border-zinc-800'}`}>
              <div className={`text-sm font-oswald uppercase tracking-wider ${styles.accent} mb-2`}>
                Notes:
              </div>
              <div className={`text-lg ${styles.secondaryText} whitespace-pre-wrap`}>
                {currentSong.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed top-20 right-4 bg-zinc-900 border-2 border-yellow-400 rounded-none p-6 z-50 w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-oswald font-bold uppercase text-yellow-400">
              Display Settings
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Foot Pedal Status */}
          <div className="mb-6 p-3 bg-zinc-950 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Bluetooth size={16} className={footPedalConnected ? 'text-green-500' : 'text-zinc-600'} />
              <span className="text-sm font-oswald uppercase">
                {footPedalConnected ? 'Foot Pedal Connected' : 'No Foot Pedal Detected'}
              </span>
            </div>
            <div className="text-xs text-zinc-500">
              Connect Bluetooth foot pedal or gamepad
            </div>
          </div>

          {/* Display Mode Selection */}
          <div className="mb-4">
            <label className="block text-sm font-oswald uppercase tracking-wider text-zinc-400 mb-3">
              Display Mode
            </label>
            <div className="space-y-2">
              {[
                { value: 'default', label: 'Default (Dark)', desc: 'Yellow accent, low light' },
                { value: 'high-contrast', label: 'High Contrast', desc: 'Pure white on black' },
                { value: 'stage-red', label: 'Stage Red', desc: 'Preserves night vision' },
                { value: 'daylight', label: 'Daylight', desc: 'Black on white' }
              ].map(mode => (
                <button
                  key={mode.value}
                  data-testid={`display-mode-${mode.value}`}
                  onClick={() => setDisplayMode(mode.value)}
                  className={`w-full text-left p-3 rounded-none border-2 transition-all ${
                    displayMode === mode.value
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-bold text-white text-sm">{mode.label}</div>
                  <div className="text-xs text-zinc-500">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Orientation Selection */}
          <div className="mb-4">
            <label className="block text-sm font-oswald uppercase tracking-wider text-zinc-400 mb-3">
              Orientation
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                data-testid="orientation-landscape"
                onClick={() => setOrientation('landscape')}
                className={`p-3 rounded-none border-2 transition-all ${
                  orientation === 'landscape'
                    ? 'border-yellow-400 bg-yellow-400/10'
                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                }`}
              >
                <div className="font-bold text-white text-sm flex items-center justify-center gap-2">
                  <Monitor size={16} />
                  Landscape
                </div>
                <div className="text-xs text-zinc-500 text-center mt-1">Desktop/Laptop</div>
              </button>
              <button
                data-testid="orientation-portrait"
                onClick={() => setOrientation('portrait')}
                className={`p-3 rounded-none border-2 transition-all ${
                  orientation === 'portrait'
                    ? 'border-yellow-400 bg-yellow-400/10'
                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                }`}
              >
                <div className="font-bold text-white text-sm flex items-center justify-center gap-2">
                  <Smartphone size={16} />
                  Portrait
                </div>
                <div className="text-xs text-zinc-500 text-center mt-1">Mobile/Tablet</div>
              </button>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <div className="text-xs font-oswald uppercase tracking-wider text-zinc-500 mb-2">
              Keyboard Shortcuts
            </div>
            <div className="text-xs text-zinc-400 space-y-1">
              <div><kbd className="bg-zinc-800 px-1 rounded">Space</kbd> Play/Pause</div>
              <div><kbd className="bg-zinc-800 px-1 rounded">→</kbd> Next Song</div>
              <div><kbd className="bg-zinc-800 px-1 rounded">←</kbd> Previous Song</div>
              <div><kbd className="bg-zinc-800 px-1 rounded">Home</kbd> Start</div>
              <div><kbd className="bg-zinc-800 px-1 rounded">Esc</kbd> Stop</div>
              <div><kbd className="bg-zinc-800 px-1 rounded">S</kbd> Settings</div>
            </div>
          </div>
        </div>
      )}

      {/* Controls - Fixed Bottom */}
      <div 
        className={`${styles.controlsBg} backdrop-blur-sm border-t border-zinc-800 p-4 transition-all duration-300 ${
          showControls ? 'translate-y-0' : 'translate-y-full'
        }`}
        data-testid="teleprompter-controls"
      >
        <div className="max-w-4xl mx-auto">
          {/* Song Navigation */}
          <div className="mb-4">
            <div className="text-xs font-oswald uppercase tracking-wider text-zinc-500 mb-2 text-center">
              Song Order (Drag to Reorder)
            </div>
            <div className={`flex gap-2 pb-2 ${orientStyles.songNav}`}>
              {songs.map((song, index) => (
                <button
                  key={song.id}
                  data-testid={`skip-to-song-${index}`}
                  draggable
                  onDragStart={(e) => handleSongDragStart(e, index)}
                  onDragOver={handleSongDragOver}
                  onDrop={(e) => handleSongDrop(e, index)}
                  onClick={() => skipTo(index)}
                  className={`flex-shrink-0 px-4 py-2 rounded-none font-oswald uppercase text-xs border-2 transition-all cursor-move ${
                    index === currentIndex
                      ? 'bg-yellow-400 text-black border-yellow-400'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical size={12} strokeWidth={1.5} />
                    <span>{index + 1}. {song.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Controls */}
          <div className={`${orientStyles.mainControls} items-center justify-center`}>
            <button
              data-testid="teleprompter-start"
              onClick={start}
              disabled={isPlaying && currentIndex === 0}
              className="rounded-none font-oswald uppercase tracking-wider font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 border-2 border-transparent px-6 py-3 flex items-center justify-center gap-2"
            >
              <Play size={20} strokeWidth={2.5} />
              Start
            </button>

            <button
              data-testid="teleprompter-prev"
              onClick={previous}
              disabled={currentIndex === 0}
              className="rounded-none font-oswald uppercase tracking-wider font-bold bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 border-2 border-zinc-700 px-6 py-3 flex items-center justify-center gap-2"
            >
              <ChevronLeft size={20} strokeWidth={1.5} />
              {orientation === 'landscape' && 'Prev'}
            </button>

            <button
              data-testid="teleprompter-play-pause"
              onClick={togglePlayPause}
              className="rounded-none font-oswald uppercase tracking-wider font-bold bg-yellow-400 text-black hover:bg-yellow-500 transition-all active:scale-95 border-2 border-transparent px-8 py-3 flex items-center justify-center gap-2"
            >
              {isPlaying ? (
                <>
                  <Pause size={20} strokeWidth={2.5} />
                  Pause
                </>
              ) : (
                <>
                  <Play size={20} strokeWidth={2.5} />
                  Play
                </>
              )}
            </button>

            <button
              data-testid="teleprompter-next"
              onClick={next}
              disabled={currentIndex === songs.length - 1}
              className="rounded-none font-oswald uppercase tracking-wider font-bold bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 border-2 border-zinc-700 px-6 py-3 flex items-center justify-center gap-2"
            >
              {orientation === 'landscape' && 'Next'}
              <ChevronRight size={20} strokeWidth={1.5} />
            </button>

            <button
              data-testid="teleprompter-stop"
              onClick={stop}
              className="rounded-none font-oswald uppercase tracking-wider font-bold bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95 border-2 border-transparent px-6 py-3 flex items-center justify-center gap-2"
            >
              <Square size={20} strokeWidth={2.5} />
              Stop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
