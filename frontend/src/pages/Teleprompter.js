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
  GripVertical
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
  const timerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const clockRef = useRef(null);
  const lyricsRef = useRef(null);

  useEffect(() => {
    loadSetList();
    
    // Start clock
    clockRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => {
      if (clockRef.current) {
        clearInterval(clockRef.current);
      }
    };
  }, [setlistId]);

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
      className="h-screen w-full bg-black text-white overflow-hidden flex flex-col"
      onMouseMove={handleMouseMove}
    >
      {/* Header - Fixed */}
      <div 
        className={`bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 p-4 transition-all duration-300 ${
          showControls ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between gap-8">
          <div>
            <div className="text-xs font-oswald uppercase tracking-wider text-zinc-500">
              Set List
            </div>
            <div className="text-xl font-oswald font-bold uppercase text-yellow-400">
              {setlist.name}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xs font-oswald uppercase tracking-wider text-zinc-500">
              Current Time
            </div>
            <div className="text-3xl font-mono font-bold text-white" data-testid="current-time">
              {formatCurrentTime()}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-oswald uppercase tracking-wider text-zinc-500">
              Performance Time
            </div>
            <div className="text-2xl font-mono font-bold text-yellow-400">
              [{formatTime(elapsedTime)}] / [{formatTime(totalTime)}]
            </div>
            <div className="text-sm font-mono text-zinc-400 mt-1">
              Est. End: {calculateEndTime()}
            </div>
          </div>
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
            <h1 className="text-4xl md:text-6xl lg:text-8xl font-mono font-bold leading-tight mb-4">
              {currentSong.name}
            </h1>
            {currentSong.artist && (
              <div className="text-2xl md:text-3xl text-zinc-400 mb-4">
                {currentSong.artist}
              </div>
            )}
            <div className="flex gap-4 text-sm font-mono text-zinc-500">
              <span data-testid="song-position">
                Song {currentIndex + 1} of {songs.length}
              </span>
              {currentSong.key && <span>KEY: {currentSong.key}</span>}
              {currentSong.tempo && <span>BPM: {currentSong.tempo}</span>}
              {currentSong.duration && <span>DUR: {currentSong.duration}</span>}
            </div>
          </div>

          {/* Lyrics */}
          <div className="text-3xl md:text-4xl lg:text-6xl font-mono font-bold leading-snug whitespace-pre-wrap">
            {currentSong.lyrics || (
              <div className="text-zinc-700 italic">No lyrics available</div>
            )}
          </div>

          {/* Notes */}
          {currentSong.notes && (
            <div className="mt-8 p-6 bg-zinc-900/50 border border-zinc-800">
              <div className="text-sm font-oswald uppercase tracking-wider text-yellow-400 mb-2">
                Notes:
              </div>
              <div className="text-lg text-zinc-300 whitespace-pre-wrap">
                {currentSong.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls - Fixed Bottom */}
      <div 
        className={`bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 p-4 transition-all duration-300 ${
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
            <div className="flex gap-2 overflow-x-auto pb-2">
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
          <div className="flex items-center justify-center gap-4">
            <button
              data-testid="teleprompter-start"
              onClick={start}
              disabled={isPlaying && currentIndex === 0}
              className="rounded-none font-oswald uppercase tracking-wider font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 border-2 border-transparent px-6 py-3 flex items-center gap-2"
            >
              <Play size={20} strokeWidth={2.5} />
              Start
            </button>

            <button
              data-testid="teleprompter-prev"
              onClick={previous}
              disabled={currentIndex === 0}
              className="rounded-none font-oswald uppercase tracking-wider font-bold bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 border-2 border-zinc-700 px-6 py-3 flex items-center gap-2"
            >
              <ChevronLeft size={20} strokeWidth={1.5} />
              Prev
            </button>

            <button
              data-testid="teleprompter-play-pause"
              onClick={togglePlayPause}
              className="rounded-none font-oswald uppercase tracking-wider font-bold bg-yellow-400 text-black hover:bg-yellow-500 transition-all active:scale-95 border-2 border-transparent px-8 py-3 flex items-center gap-2"
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
              className="rounded-none font-oswald uppercase tracking-wider font-bold bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 border-2 border-zinc-700 px-6 py-3 flex items-center gap-2"
            >
              Next
              <ChevronRight size={20} strokeWidth={1.5} />
            </button>

            <button
              data-testid="teleprompter-stop"
              onClick={stop}
              className="rounded-none font-oswald uppercase tracking-wider font-bold bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95 border-2 border-transparent px-6 py-3 flex items-center gap-2"
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
