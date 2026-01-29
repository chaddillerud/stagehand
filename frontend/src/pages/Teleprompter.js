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
  Smartphone,
  Music,
  Volume2,
  VolumeX
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
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true); // Default ON
  const [scrollSpeed, setScrollSpeed] = useState(1.0); // 1.0 = 100% baseline
  const [fontSize, setFontSize] = useState('large'); // small, medium, large, xlarge
  const [showSettings, setShowSettings] = useState(false);
  const [footPedalConnected, setFootPedalConnected] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false); // Practice mode with audio playback
  const [audioMuted, setAudioMuted] = useState(false);
  const [clickTrackEnabled, setClickTrackEnabled] = useState(false); // Click track / metronome
  const [countIn, setCountIn] = useState('none'); // none, 4, 8 beats
  const [isCountingIn, setIsCountingIn] = useState(false);
  const [countInBeats, setCountInBeats] = useState(0);
  const [scrollPaused, setScrollPaused] = useState(false); // For [Solo:30] style pauses
  const timerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const clockRef = useRef(null);
  const lyricsRef = useRef(null);
  const gamepadRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const autoScrollIntervalRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const clickIntervalRef = useRef(null);
  const pauseTimeoutRef = useRef(null);
  const lastPauseMarkerRef = useRef(null); // Track which marker we last paused at

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

  // Auto-scroll effect - Uses requestAnimationFrame with time-based accumulator
  // Supports [Solo:8] style pause markers (bars) in lyrics
  useEffect(() => {
    // Clear any existing animation
    if (autoScrollIntervalRef.current) {
      cancelAnimationFrame(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }

    // Early exit conditions
    if (!autoScrollEnabled || !isPlaying || !lyricsRef.current || songs.length === 0 || scrollPaused) {
      return;
    }

    const currentSong = songs[currentIndex];
    if (!currentSong) {
      return;
    }

    // Parse duration (MM:SS format) - returns seconds
    const parseDuration = (durationStr) => {
      if (!durationStr) return 0;
      const parts = durationStr.split(':');
      if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
      return 0;
    };

    // Get BPM for bar calculations
    const bpm = currentSong.tempo ? parseInt(currentSong.tempo) : 0;
    
    // Convert bars to seconds: bars × 4 beats × (60 / BPM)
    const barsToSeconds = (bars) => {
      if (bpm <= 0) return 0;
      return bars * 4 * (60 / bpm);
    };

    // Parse pause markers from lyrics - returns array of {text, bars, seconds, lineIndex}
    const parsePauseMarkers = (lyrics) => {
      if (!lyrics) return [];
      const markers = [];
      const lines = lyrics.split('\n');
      const markerRegex = /\[([^\]:]+):(\d+)\]/gi;
      
      lines.forEach((line, lineIndex) => {
        let match;
        while ((match = markerRegex.exec(line)) !== null) {
          const bars = parseInt(match[2]);
          const seconds = barsToSeconds(bars);
          if (seconds > 0) {
            markers.push({
              text: match[0],
              label: match[1],
              bars,
              seconds,
              lineIndex
            });
          }
        }
      });
      return markers;
    };

    const songDurationSeconds = parseDuration(currentSong.duration);
    const effectiveDuration = songDurationSeconds > 0 ? songDurationSeconds : 60;
    
    // Calculate scroll parameters
    const container = lyricsRef.current;
    const totalScrollHeight = container.scrollHeight - container.clientHeight;
    
    if (totalScrollHeight <= 0) {
      return; // Nothing to scroll
    }

    // Parse pause markers
    const pauseMarkers = parsePauseMarkers(currentSong.lyrics);
    
    // Calculate approximate scroll position for each marker based on line position
    const lyricsLines = (currentSong.lyrics || '').split('\n').length;
    const pixelsPerLine = totalScrollHeight / Math.max(lyricsLines, 1);
    
    const markerPositions = pauseMarkers.map(marker => ({
      ...marker,
      scrollPosition: marker.lineIndex * pixelsPerLine
    }));

    // Calculate pixels per second based on song duration
    const basePixelsPerSecond = totalScrollHeight / effectiveDuration;
    const pixelsPerSecond = basePixelsPerSecond * scrollSpeed;

    if (pauseMarkers.length > 0) {
      console.log(`🎵 AUTO-SCROLL: "${currentSong.name}" | BPM: ${bpm} | ${pauseMarkers.length} pause markers`);
    }

    // Use requestAnimationFrame with time-based scrolling for accuracy
    let lastTime = performance.now();
    let accumulatedScroll = 0;

    const scrollStep = (currentTime) => {
      const el = lyricsRef.current;
      if (!el) {
        autoScrollIntervalRef.current = requestAnimationFrame(scrollStep);
        return;
      }

      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      // Check if we've hit a pause marker
      const currentScroll = el.scrollTop;
      for (const marker of markerPositions) {
        // Check if we're within 5px of the marker and haven't already paused at it
        if (Math.abs(currentScroll - marker.scrollPosition) < 5 && 
            lastPauseMarkerRef.current !== `${currentIndex}-${marker.lineIndex}`) {
          
          console.log(`⏸️ PAUSE: [${marker.label}:${marker.bars}] = ${marker.seconds.toFixed(1)}s at line ${marker.lineIndex}`);
          lastPauseMarkerRef.current = `${currentIndex}-${marker.lineIndex}`;
          setScrollPaused(true);
          
          // Resume after calculated seconds
          pauseTimeoutRef.current = setTimeout(() => {
            console.log(`▶️ RESUME after ${marker.bars} bars (${marker.seconds.toFixed(1)}s)`);
            setScrollPaused(false);
          }, marker.seconds * 1000);
          
          return; // Stop scrolling
        }
      }

      // Accumulate scroll amount
      accumulatedScroll += pixelsPerSecond * deltaTime;

      // Only scroll when we have at least 1 pixel accumulated
      if (accumulatedScroll >= 1) {
        const scrollAmount = Math.floor(accumulatedScroll);
        accumulatedScroll -= scrollAmount;

        const maxScroll = el.scrollHeight - el.clientHeight;
        if (el.scrollTop < maxScroll) {
          el.scrollTop += scrollAmount;
        }
      }

      autoScrollIntervalRef.current = requestAnimationFrame(scrollStep);
    };

    // Start the animation loop
    autoScrollIntervalRef.current = requestAnimationFrame(scrollStep);

    // Cleanup - only cancel animation frame, NOT the pause timeout
    return () => {
      if (autoScrollIntervalRef.current) {
        cancelAnimationFrame(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
      // Don't clear pauseTimeoutRef here - let the resume timeout complete
    };
  }, [isPlaying, autoScrollEnabled, currentIndex, scrollSpeed, songs, scrollPaused]);

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
    // Reset scroll and pause state when song changes
    if (lyricsRef.current) {
      lyricsRef.current.scrollTop = 0;
    }
    lastPauseMarkerRef.current = null;
    setScrollPaused(false);
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
  }, [currentIndex]);

  // Auto-play audio when song changes in practice mode
  useEffect(() => {
    if (!practiceMode || !audioRef.current || songs.length === 0) return;
    
    const currentSong = songs[currentIndex];
    if (!currentSong?.audio_file) return;
    
    // If playing, auto-play the new song's audio
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    }
  }, [currentIndex, practiceMode, songs, isPlaying]);

  // Count songs with audio for practice mode indicator
  const songsWithAudio = songs.filter(s => s.audio_file).length;

  // Initialize Audio Context for click track
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // Play a metronome click sound
  const playClick = (isAccent = false) => {
    const ctx = initAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Classic metronome: higher pitch for accent (beat 1), lower for others
    oscillator.frequency.value = isAccent ? 1000 : 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  };

  // Start click track metronome
  const startClickTrack = (bpm) => {
    if (clickIntervalRef.current) {
      clearInterval(clickIntervalRef.current);
    }
    
    if (!bpm || bpm <= 0) return;
    
    const msPerBeat = 60000 / bpm;
    let beatCount = 0;
    
    // Play first click immediately
    playClick(true);
    beatCount++;
    
    clickIntervalRef.current = setInterval(() => {
      const isAccent = beatCount % 4 === 0;
      playClick(isAccent);
      beatCount++;
    }, msPerBeat);
  };

  // Stop click track
  const stopClickTrack = () => {
    if (clickIntervalRef.current) {
      clearInterval(clickIntervalRef.current);
      clickIntervalRef.current = null;
    }
  };

  // Handle count-in before starting
  const doCountIn = (bpm, numBeats, callback) => {
    if (!bpm || bpm <= 0 || numBeats <= 0) {
      callback();
      return;
    }
    
    setIsCountingIn(true);
    setCountInBeats(numBeats);
    
    const msPerBeat = 60000 / bpm;
    let beatsRemaining = numBeats;
    
    // Play first beat immediately
    playClick(true);
    beatsRemaining--;
    setCountInBeats(beatsRemaining);
    
    const countInterval = setInterval(() => {
      if (beatsRemaining <= 0) {
        clearInterval(countInterval);
        setIsCountingIn(false);
        setCountInBeats(0);
        callback();
        return;
      }
      
      const isAccent = (numBeats - beatsRemaining) % 4 === 0;
      playClick(isAccent);
      beatsRemaining--;
      setCountInBeats(beatsRemaining);
    }, msPerBeat);
  };

  // Click track effect - start/stop based on playing state
  useEffect(() => {
    if (!clickTrackEnabled || !isPlaying || isCountingIn) {
      stopClickTrack();
      return;
    }
    
    const currentSong = songs[currentIndex];
    const bpm = currentSong?.tempo ? parseInt(currentSong.tempo) : 0;
    
    if (bpm > 0) {
      startClickTrack(bpm);
    }
    
    return () => stopClickTrack();
  }, [clickTrackEnabled, isPlaying, currentIndex, songs, isCountingIn]);

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

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX.current || !touchStartY.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;
    
    // Only register swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const minSwipeDistance = 50; // minimum pixels for a swipe
      
      if (deltaX > minSwipeDistance) {
        // Swipe right = Previous song
        previous();
      } else if (deltaX < -minSwipeDistance) {
        // Swipe left = Next song
        next();
      }
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const start = () => {
    const currentSong = songs[0];
    const bpm = currentSong?.tempo ? parseInt(currentSong.tempo) : 0;
    
    // Determine count-in beats
    const countInBeatsNum = countIn === '4' ? 4 : countIn === '8' ? 8 : 0;
    
    // Reset state
    setElapsedTime(0);
    setCurrentIndex(0);
    setScrollPaused(false);
    lastPauseMarkerRef.current = null;
    if (lyricsRef.current) {
      lyricsRef.current.scrollTop = 0;
    }
    
    // If count-in is enabled and we have BPM, do count-in first
    if (countInBeatsNum > 0 && bpm > 0 && clickTrackEnabled) {
      doCountIn(bpm, countInBeatsNum, () => {
        // After count-in, start playing
        setIsPlaying(true);
        // Play audio if practice mode enabled
        if (practiceMode && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      });
    } else {
      // No count-in, start immediately
      setIsPlaying(true);
      // Play audio if practice mode enabled
      if (practiceMode && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const stop = () => {
    setIsPlaying(false);
    setElapsedTime(0);
    setCurrentIndex(0);
    setIsCountingIn(false);
    setCountInBeats(0);
    setScrollPaused(false);
    lastPauseMarkerRef.current = null;
    stopClickTrack();
    // Clear any pending pause timeout
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    // Reset scroll position
    if (lyricsRef.current) {
      lyricsRef.current.scrollTop = 0;
    }
    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const togglePlayPause = () => {
    if (isCountingIn) return; // Don't allow pause during count-in
    
    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);
    
    // Sync audio with play/pause
    if (practiceMode && audioRef.current) {
      if (newIsPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  };

  const previous = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      // Reset scroll position for new song
      if (lyricsRef.current) {
        lyricsRef.current.scrollTop = 0;
      }
      // Reset audio for new song
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  };

  const next = () => {
    if (currentIndex < songs.length - 1) {
      setCurrentIndex(currentIndex + 1);
      // Reset scroll position for new song
      if (lyricsRef.current) {
        lyricsRef.current.scrollTop = 0;
      }
      // Reset audio for new song
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  };

  const skipTo = (index) => {
    setCurrentIndex(index);
    // Reset scroll position for new song
    if (lyricsRef.current) {
      lyricsRef.current.scrollTop = 0;
    }
    // Reset audio for new song
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
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
        lyrics: getFontSizeClass(fontSize, true),
        songTitle: getSongTitleSizeClass(fontSize, true),
        controls: 'flex-col gap-3',
        songNav: 'flex-col max-h-48 overflow-y-auto',
        mainControls: 'grid grid-cols-2 gap-3 w-full'
      };
    }
    return {
      container: 'flex-col',
      header: 'flex-row justify-between gap-8',
      lyrics: getFontSizeClass(fontSize, false),
      songTitle: getSongTitleSizeClass(fontSize, false),
      controls: 'flex-col',
      songNav: 'flex-row overflow-x-auto',
      mainControls: 'flex gap-4'
    };
  };

  const getFontSizeClass = (size, isPortrait) => {
    const sizes = {
      'small': isPortrait ? 'text-2xl md:text-3xl lg:text-4xl' : 'text-xl md:text-2xl lg:text-3xl',
      'medium': isPortrait ? 'text-3xl md:text-4xl lg:text-5xl' : 'text-2xl md:text-3xl lg:text-4xl',
      'large': isPortrait ? 'text-3xl md:text-5xl lg:text-7xl' : 'text-3xl md:text-4xl lg:text-6xl',
      'xlarge': isPortrait ? 'text-5xl md:text-6xl lg:text-8xl' : 'text-4xl md:text-6xl lg:text-8xl'
    };
    return sizes[size] || sizes.large;
  };

  const getSongTitleSizeClass = (size, isPortrait) => {
    const sizes = {
      'small': isPortrait ? 'text-3xl md:text-4xl' : 'text-3xl md:text-4xl lg:text-5xl',
      'medium': isPortrait ? 'text-4xl md:text-5xl' : 'text-4xl md:text-5xl lg:text-6xl',
      'large': isPortrait ? 'text-5xl md:text-7xl' : 'text-4xl md:text-6xl lg:text-8xl',
      'xlarge': isPortrait ? 'text-6xl md:text-8xl' : 'text-5xl md:text-7xl lg:text-9xl'
    };
    return sizes[size] || sizes.large;
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
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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

      {/* Count-In Overlay */}
      {isCountingIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="text-center">
            <div className="text-9xl font-mono font-bold text-yellow-400 animate-pulse">
              {countInBeats}
            </div>
            <div className="text-2xl text-zinc-400 font-oswald uppercase tracking-wider mt-4">
              Count In
            </div>
          </div>
        </div>
      )}

      {/* Lyrics Display - Scrollable */}
      <div 
        ref={lyricsRef}
        className="flex-1 overflow-y-auto p-8 md:p-16"
        data-testid="lyrics-display"
      >
        <div className={`mx-auto ${orientation === 'portrait' ? 'max-w-4xl' : 'max-w-7xl'}`}>
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
          <div className={`${orientStyles.lyrics} font-mono font-bold leading-snug whitespace-pre-wrap break-words hyphens-auto`}>
            {currentSong.lyrics ? (
              // Render lyrics with highlighted pause markers
              currentSong.lyrics.split(/(\[[^\]:]+:\d+\])/gi).map((part, index) => {
                // Check if this part is a pause marker
                if (/^\[[^\]:]+:\d+\]$/i.test(part)) {
                  return (
                    <span 
                      key={index} 
                      className="text-yellow-400 bg-yellow-400/20 px-2 py-0.5 rounded"
                    >
                      {part}
                    </span>
                  );
                }
                return <span key={index}>{part}</span>;
              })
            ) : (
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
        <div className="fixed top-20 right-4 bg-zinc-900 border-2 border-yellow-400 rounded-none p-6 z-50 w-80 max-h-[calc(100vh-120px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-zinc-900 pb-2 border-b border-zinc-800">
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

          {/* Auto-Scroll Settings */}
          <div className="mb-4 pt-4 border-t border-zinc-800">
            <label className="block text-sm font-oswald uppercase tracking-wider text-zinc-400 mb-3">
              Auto-Scroll
            </label>
            
            <div className="flex items-center justify-between mb-3 p-3 bg-zinc-950 border border-zinc-800">
              <div>
                <div className="text-white font-bold text-sm">Enable Auto-Scroll</div>
                <div className="text-xs text-zinc-500">
                  {autoScrollEnabled ? 'Scrolls based on song duration' : 'Manual control only'}
                </div>
              </div>
              <button
                data-testid="auto-scroll-toggle"
                onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative ${
                  autoScrollEnabled ? 'bg-green-600' : 'bg-zinc-700'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                  autoScrollEnabled ? 'right-0.5' : 'left-0.5'
                }`} />
              </button>
            </div>

            {autoScrollEnabled && (
              <div className="p-3 bg-zinc-950 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400">Scroll Speed</span>
                  <span className="text-sm font-mono font-bold text-yellow-400">
                    {Math.round(scrollSpeed * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
                  className="w-full accent-yellow-400"
                  data-testid="scroll-speed-slider"
                />
                <div className="flex justify-between text-xs text-zinc-600 mt-1">
                  <span>50%</span>
                  <span>100%</span>
                  <span>300%</span>
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  💡 100% = Scroll finishes with song duration
                  {songs[currentIndex]?.duration ? (
                    <div className="text-green-500 mt-1">✓ Using duration: {songs[currentIndex].duration}</div>
                  ) : (
                    <div className="text-yellow-500 mt-1">⚠ No duration set (using 60s default)</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Practice Mode Settings */}
          <div className="mb-4 pt-4 border-t border-zinc-800">
            <label className="block text-sm font-oswald uppercase tracking-wider text-zinc-400 mb-3">
              Practice Mode
            </label>
            
            <div className="flex items-center justify-between mb-3 p-3 bg-zinc-950 border border-zinc-800">
              <div>
                <div className="text-white font-bold text-sm flex items-center gap-2">
                  <Music size={16} className={practiceMode ? 'text-green-500' : 'text-zinc-500'} />
                  Enable Practice Mode
                </div>
                <div className="text-xs text-zinc-500">
                  {practiceMode ? 'Audio plays with each song' : 'Lyrics only'}
                </div>
              </div>
              <button
                data-testid="practice-mode-toggle"
                onClick={() => setPracticeMode(!practiceMode)}
                className={`w-12 h-6 rounded-full transition-all relative ${
                  practiceMode ? 'bg-green-600' : 'bg-zinc-700'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                  practiceMode ? 'right-0.5' : 'left-0.5'
                }`} />
              </button>
            </div>

            <div className="text-xs text-zinc-500 p-2 bg-zinc-950 border border-zinc-800">
              {songsWithAudio > 0 ? (
                <div className="text-green-500">✓ {songsWithAudio} of {songs.length} songs have practice tracks</div>
              ) : (
                <div className="text-yellow-500">⚠ No songs have practice tracks uploaded</div>
              )}
            </div>
          </div>

          {/* Click Track Settings */}
          <div className="mb-4 pt-4 border-t border-zinc-800">
            <label className="block text-sm font-oswald uppercase tracking-wider text-zinc-400 mb-3">
              Click Track (Metronome)
            </label>
            
            {/* Enable Click Track Toggle */}
            <div className="flex items-center justify-between mb-3 p-3 bg-zinc-950 border border-zinc-800">
              <div>
                <div className="text-white font-bold text-sm">Enable Click Track</div>
                <div className="text-xs text-zinc-500">
                  {clickTrackEnabled ? 'Metronome plays with BPM' : 'No metronome'}
                </div>
              </div>
              <button
                data-testid="click-track-toggle"
                onClick={() => setClickTrackEnabled(!clickTrackEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative ${
                  clickTrackEnabled ? 'bg-green-600' : 'bg-zinc-700'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                  clickTrackEnabled ? 'right-0.5' : 'left-0.5'
                }`} />
              </button>
            </div>

            {/* Count-In Selection */}
            {clickTrackEnabled && (
              <div className="p-3 bg-zinc-950 border border-zinc-800">
                <div className="text-sm text-white mb-2">Count-In</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'none', label: 'None' },
                    { value: '4', label: '4 Beats' },
                    { value: '8', label: '8 Beats' }
                  ].map(option => (
                    <button
                      key={option.value}
                      data-testid={`count-in-${option.value}`}
                      onClick={() => setCountIn(option.value)}
                      className={`py-2 px-3 text-xs font-mono transition-all border ${
                        countIn === option.value
                          ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  {songs[currentIndex]?.tempo ? (
                    <span className="text-green-500">✓ Current song: {songs[currentIndex].tempo} BPM</span>
                  ) : (
                    <span className="text-yellow-500">⚠ Current song has no BPM set</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Font Size Settings */}
          <div className="mb-4 pt-4 border-t border-zinc-800">
            <label className="block text-sm font-oswald uppercase tracking-wider text-zinc-400 mb-3">
              Font Size
            </label>
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'small', label: 'Small', sample: 'Aa' },
                { value: 'medium', label: 'Medium', sample: 'Aa' },
                { value: 'large', label: 'Large', sample: 'Aa' },
                { value: 'xlarge', label: 'X-Large', sample: 'Aa' }
              ].map(size => (
                <button
                  key={size.value}
                  data-testid={`font-size-${size.value}`}
                  onClick={() => setFontSize(size.value)}
                  className={`p-3 rounded-none border-2 transition-all ${
                    fontSize === size.value
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  <div className={`font-bold text-white mb-1 ${
                    size.value === 'small' ? 'text-sm' : 
                    size.value === 'medium' ? 'text-base' :
                    size.value === 'large' ? 'text-lg' : 'text-xl'
                  }`}>
                    {size.sample}
                  </div>
                  <div className="text-xs text-zinc-500">{size.label}</div>
                </button>
              ))}
            </div>
            <div className="text-xs text-zinc-500 mt-2 p-2 bg-zinc-950 border border-zinc-800">
              💡 Adjust for your screen distance and viewing comfort
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

          {/* Touch Gestures */}
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="text-xs font-oswald uppercase tracking-wider text-zinc-500 mb-2">
              Touch Gestures
            </div>
            <div className="text-xs text-zinc-400 space-y-1">
              <div>👈 Swipe Left → Next Song</div>
              <div>👉 Swipe Right → Previous Song</div>
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
                    {song.audio_file && practiceMode && (
                      <Music size={12} className={index === currentIndex ? 'text-black' : 'text-green-500'} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Audio Player - Practice Mode */}
          {practiceMode && (
            <div className="mb-4 p-3 bg-zinc-950/80 border border-zinc-800 rounded-none">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Music size={18} className={currentSong?.audio_file ? 'text-green-500' : 'text-zinc-600'} />
                  <span className="text-xs font-oswald uppercase text-zinc-400">Practice Mode</span>
                </div>
                
                {currentSong?.audio_file ? (
                  <>
                    <audio
                      ref={audioRef}
                      src={`${API}/audio/${currentSong.audio_file}`}
                      muted={audioMuted}
                      onEnded={() => {
                        // Auto-advance to next song when audio ends
                        if (currentIndex < songs.length - 1) {
                          next();
                        }
                      }}
                      className="hidden"
                    />
                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-xs text-green-500 font-mono">♪ Track loaded</span>
                    </div>
                    <button
                      data-testid="audio-mute-toggle"
                      onClick={() => setAudioMuted(!audioMuted)}
                      className={`p-2 rounded-none transition-colors ${
                        audioMuted ? 'text-red-500 bg-red-500/10' : 'text-zinc-400 hover:text-white'
                      }`}
                      title={audioMuted ? 'Unmute' : 'Mute'}
                    >
                      {audioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                  </>
                ) : (
                  <div className="flex-1 text-xs text-zinc-500 font-mono">
                    No practice track for this song
                  </div>
                )}
              </div>
            </div>
          )}

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
