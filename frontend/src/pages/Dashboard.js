import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Music, Trash2, Upload, Download, FileJson, Mic, Loader2, Search, Copy, HelpCircle, X, Keyboard } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const navigate = useNavigate();
  const [setlists, setSetlists] = useState([]);
  const [songs, setSongs] = useState([]);
  const [showNewSetListModal, setShowNewSetListModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAudioSongModal, setShowAudioSongModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [isCreatingFromAudio, setIsCreatingFromAudio] = useState(false);
  const [newSetListName, setNewSetListName] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '?' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        setShowShortcutsModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter songs by search query
  const filteredSongs = songs.filter(song => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      song.name?.toLowerCase().includes(query) ||
      song.artist?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [setlistsRes, songsRes] = await Promise.all([
        axios.get(`${API}/setlists`),
        axios.get(`${API}/songs`)
      ]);
      setSetlists(setlistsRes.data);
      setSongs(songsRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
      setLoading(false);
    }
  };

  const createSetList = async () => {
    if (!newSetListName.trim()) {
      toast.error("Please enter a set list name");
      return;
    }

    try {
      const response = await axios.post(`${API}/setlists`, {
        name: newSetListName,
        song_ids: []
      });
      setSetlists([...setlists, response.data]);
      setNewSetListName("");
      setShowNewSetListModal(false);
      toast.success("Set list created!");
    } catch (error) {
      console.error("Error creating set list:", error);
      toast.error("Failed to create set list");
    }
  };

  const deleteSetList = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;

    try {
      await axios.delete(`${API}/setlists/${id}`);
      setSetlists(setlists.filter(s => s.id !== id));
      toast.success(`"${name}" deleted`);
    } catch (error) {
      console.error("Error deleting set list:", error);
      toast.error("Failed to delete set list");
    }
  };

  const deleteSong = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;

    try {
      await axios.delete(`${API}/songs/${id}`);
      setSongs(songs.filter(s => s.id !== id));
      toast.success(`"${name}" deleted`);
    } catch (error) {
      console.error("Error deleting song:", error);
      toast.error("Failed to delete song");
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const response = await axios.post(`${API}/songs/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setSongs([...songs, response.data]);
      setImportFile(null);
      setShowImportModal(false);
      toast.success("Song imported!");
    } catch (error) {
      console.error("Error importing song:", error);
      toast.error("Failed to import song");
    }
  };

  const handleCreateFromAudio = async () => {
    if (!audioFile) {
      toast.error("Please select an audio file");
      return;
    }

    setIsCreatingFromAudio(true);

    const formData = new FormData();
    formData.append("file", audioFile);

    try {
      const response = await axios.post(`${API}/songs/from-audio`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setSongs([...songs, response.data]);
      setAudioFile(null);
      setShowAudioSongModal(false);
      toast.success("Song created from audio! Opening editor...");
      
      // Navigate to edit the new song
      navigate(`/song/${response.data.id}`);
    } catch (error) {
      console.error("Error creating song from audio:", error);
      toast.error(error.response?.data?.detail || "Failed to create song from audio");
    } finally {
      setIsCreatingFromAudio(false);
    }
  };

  const createNewSong = () => {
    navigate("/song/new");
  };

  const duplicateSong = async (song) => {
    try {
      const newSong = {
        name: `${song.name} (Copy)`,
        artist: song.artist || "",
        key: song.key || "",
        tempo: song.tempo || "",
        duration: song.duration || "",
        notes: song.notes || "",
        lyrics: song.lyrics || "",
        scroll_speed: song.scroll_speed || 1.0,
        auto_scroll: song.auto_scroll ?? true
      };
      const response = await axios.post(`${API}/songs`, newSong);
      setSongs([...songs, response.data]);
      toast.success(`Duplicated "${song.name}"`);
    } catch (error) {
      console.error("Error duplicating song:", error);
      toast.error("Failed to duplicate song");
    }
  };

  const duplicateSetlist = async (setlist) => {
    try {
      const response = await axios.post(`${API}/setlists`, {
        name: `${setlist.name} (Copy)`,
        song_ids: setlist.song_ids || []
      });
      setSetlists([...setlists, response.data]);
      toast.success(`Duplicated "${setlist.name}"`);
    } catch (error) {
      console.error("Error duplicating setlist:", error);
      toast.error("Failed to duplicate setlist");
    }
  };

  const exportBackup = async () => {
    try {
      const [setlistsRes, songsRes] = await Promise.all([
        axios.get(`${API}/setlists`),
        axios.get(`${API}/songs`)
      ]);

      const backup = {
        version: "1.0",
        exported_at: new Date().toISOString(),
        setlists: setlistsRes.data,
        songs: songsRes.data
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stagehand-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Backup created! ${setlistsRes.data.length} setlists, ${songsRes.data.length} songs`);
    } catch (error) {
      console.error("Error creating backup:", error);
      toast.error("Failed to create backup");
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      toast.error("Please select a backup file");
      return;
    }

    try {
      const text = await restoreFile.text();
      const backup = JSON.parse(text);

      if (!backup.version || !backup.songs || !backup.setlists) {
        toast.error("Invalid backup file format");
        return;
      }

      const confirmed = window.confirm(
        `This will restore ${backup.songs.length} songs and ${backup.setlists.length} setlists.\n\nWarning: This will ADD to your existing data, not replace it.\n\nContinue?`
      );

      if (!confirmed) return;

      // Map old song IDs to new song IDs
      const songIdMap = {};

      // Import songs and track ID mapping
      let importedSongs = 0;
      for (const song of backup.songs) {
        try {
          const response = await axios.post(`${API}/songs`, {
            name: song.name,
            artist: song.artist,
            key: song.key,
            tempo: song.tempo,
            duration: song.duration,
            notes: song.notes,
            lyrics: song.lyrics,
            scroll_speed: song.scroll_speed || 1.0,
            auto_scroll: song.auto_scroll ?? true
          });
          // Map old ID to new ID
          songIdMap[song.id] = response.data.id;
          importedSongs++;
        } catch (error) {
          console.error(`Error importing song ${song.name}:`, error);
        }
      }

      // Import setlists with mapped song IDs
      let importedSetlists = 0;
      for (const setlist of backup.setlists) {
        try {
          // Map old song IDs to new ones
          const oldSongIds = setlist.song_ids || [];
          console.log(`Setlist "${setlist.name}" has ${oldSongIds.length} songs:`, oldSongIds);
          
          const newSongIds = oldSongIds
            .map(oldId => {
              const newId = songIdMap[oldId];
              console.log(`  Mapping ${oldId} -> ${newId}`);
              return newId;
            })
            .filter(id => id); // Remove any unmapped IDs

          console.log(`  Final mapped IDs (${newSongIds.length}):`, newSongIds);

          await axios.post(`${API}/setlists`, {
            name: setlist.name,
            song_ids: newSongIds
          });
          importedSetlists++;
        } catch (error) {
          console.error(`Error importing setlist ${setlist.name}:`, error);
        }
      }

      await loadData();
      setRestoreFile(null);
      setShowRestoreModal(false);

      toast.success(`Restored ${importedSongs} songs and ${importedSetlists} setlists!`);
    } catch (error) {
      console.error("Error restoring backup:", error);
      toast.error("Failed to restore backup. Check file format.");
    }
  };

  const calculateTotalTime = (songIds) => {
    let totalSeconds = 0;
    songIds.forEach(songId => {
      const song = songs.find(s => s.id === songId);
      if (song && song.duration) {
        const parts = song.duration.split(':');
        if (parts.length === 2) {
          totalSeconds += parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
      }
    });
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-400 font-mono">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header with Logo */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-violet-600 rounded-lg flex items-center justify-center">
                <Music size={28} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-oswald font-bold tracking-tight">
                  <span className="brand-gradient">STAGEHAND</span>
                </h1>
                <p className="text-zinc-500 text-sm">Setlist Maker & Lyric Teleprompter</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                data-testid="shortcuts-btn"
                onClick={() => setShowShortcutsModal(true)}
                title="Keyboard shortcuts (?)"
                className="text-zinc-500 hover:text-amber-400 transition-colors p-2"
              >
                <HelpCircle size={20} strokeWidth={1.5} />
              </button>
              <button
                data-testid="export-backup-btn"
                onClick={exportBackup}
                title="Backup all data"
                className="text-zinc-500 hover:text-white transition-colors p-2"
              >
                <Download size={20} strokeWidth={1.5} />
              </button>
              <button
                data-testid="import-restore-btn"
                onClick={() => setShowRestoreModal(true)}
                title="Restore from backup"
                className="text-zinc-500 hover:text-white transition-colors p-2"
              >
                <Upload size={20} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Set Lists Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-oswald font-semibold tracking-tight text-white">
              Set Lists
            </h2>
            <button
              data-testid="create-setlist-btn"
              onClick={() => setShowNewSetListModal(true)}
              className="btn-primary rounded-lg px-5 py-2.5 flex items-center gap-2 font-oswald uppercase tracking-wider text-sm"
            >
              <Plus size={18} strokeWidth={2.5} />
              New Set List
            </button>
          </div>

          {setlists.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
              <Music size={48} className="mx-auto mb-4 text-zinc-700" strokeWidth={1.5} />
              <p className="text-zinc-500">No set lists yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {setlists.map((setlist) => (
                <div
                  key={setlist.id}
                  data-testid={`setlist-card-${setlist.id}`}
                  onClick={() => navigate(`/setlist/${setlist.id}`)}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-amber-500/50 transition-all cursor-pointer group relative"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors flex-1">
                      {setlist.name}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                      <span>{setlist.song_ids?.length || 0} songs</span>
                      <span>•</span>
                      <span>{calculateTotalTime(setlist.song_ids || [])}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                      <button
                        data-testid={`duplicate-setlist-${setlist.id}`}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); duplicateSetlist(setlist); }}
                        title="Duplicate"
                        className="text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 p-2 rounded-lg transition-colors"
                      >
                        <Copy size={18} strokeWidth={1.5} />
                      </button>
                      <button
                        data-testid={`delete-setlist-${setlist.id}`}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteSetList(setlist.id, setlist.name); }}
                        title="Delete"
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Songs Library Section */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl md:text-3xl font-oswald font-semibold tracking-tight text-white">
              Songs Library
            </h2>
            
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                data-testid="song-search-input"
                type="text"
                placeholder="Search songs by title or artist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                data-testid="import-song-btn"
                onClick={() => setShowImportModal(true)}
                title="Import .txt File"
                className="btn-secondary rounded-lg p-2.5 transition-colors"
              >
                <Upload size={18} strokeWidth={1.5} />
              </button>
              <button
                data-testid="create-song-from-audio-btn"
                onClick={() => setShowAudioSongModal(true)}
                className="btn-secondary rounded-lg px-4 py-2.5 flex items-center gap-2 font-oswald uppercase tracking-wider text-sm"
              >
                <Mic size={18} strokeWidth={2} />
                From Audio
              </button>
              <button
                data-testid="create-song-btn"
                onClick={createNewSong}
                className="btn-primary rounded-lg px-5 py-2.5 flex items-center gap-2 font-oswald uppercase tracking-wider text-sm"
              >
                <Plus size={18} strokeWidth={2.5} />
                New Song
              </button>
            </div>
          </div>

          {filteredSongs.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
              <Music size={48} className="mx-auto mb-4 text-zinc-700" strokeWidth={1.5} />
              <p className="text-zinc-500">
                {searchQuery ? `No songs matching "${searchQuery}"` : "No songs yet. Create or import one!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSongs.map((song) => (
                <div
                  key={song.id}
                  data-testid={`song-card-${song.id}`}
                  onClick={() => navigate(`/song/${song.id}`)}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-amber-500/50 transition-all cursor-pointer group relative"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">
                        {song.name}
                      </h3>
                      {song.artist && (
                        <p className="text-zinc-500 text-sm">{song.artist}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-xs font-mono text-zinc-600">
                      {song.key && <span>KEY: {song.key}</span>}
                      {song.tempo && <span>BPM: {song.tempo}</span>}
                      {song.duration && <span>{song.duration}</span>}
                      {song.audio_file && (
                        <span className="text-emerald-500" title="Has practice track">♪</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                      <button
                        data-testid={`duplicate-song-${song.id}`}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); duplicateSong(song); }}
                        title="Duplicate"
                        className="text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 p-2 rounded-lg transition-colors"
                      >
                        <Copy size={18} strokeWidth={1.5} />
                      </button>
                      <button
                        data-testid={`delete-song-${song.id}`}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteSong(song.id, song.name); }}
                        title="Delete"
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Set List Modal */}
      {showNewSetListModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border-2 border-yellow-400 rounded-none p-8 max-w-md w-full">
            <h3 className="text-2xl font-oswald font-bold uppercase mb-6 text-yellow-400">
              Create Set List
            </h3>
            <input
              data-testid="setlist-name-input"
              type="text"
              placeholder="Set List Name"
              value={newSetListName}
              onChange={(e) => setNewSetListName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createSetList()}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-4 py-3 text-white placeholder:text-zinc-600 font-mono focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 outline-none mb-6"
              autoFocus
            />
            <div className="flex gap-4">
              <button
                data-testid="create-setlist-confirm"
                onClick={createSetList}
                className="flex-1 rounded-none font-oswald uppercase tracking-wider font-bold bg-yellow-400 text-black hover:bg-yellow-500 transition-all active:scale-95 border-2 border-transparent px-6 py-3"
              >
                Create
              </button>
              <button
                data-testid="create-setlist-cancel"
                onClick={() => {
                  setShowNewSetListModal(false);
                  setNewSetListName("");
                }}
                className="flex-1 rounded-none font-oswald uppercase tracking-wider font-bold bg-zinc-800 text-white hover:bg-zinc-700 border-2 border-zinc-700 px-6 py-3"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border-2 border-yellow-400 rounded-none p-8 max-w-md w-full">
            <h3 className="text-2xl font-oswald font-bold uppercase mb-6 text-yellow-400">
              Import Song
            </h3>
            <p className="text-zinc-400 text-sm mb-4">
              Upload a .txt file. First line: "Title - Artist" or just "Title". Rest: lyrics.
            </p>
            <input
              data-testid="import-file-input"
              type="file"
              accept=".txt"
              onChange={(e) => setImportFile(e.target.files[0])}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:bg-yellow-400 file:text-black file:font-oswald file:uppercase file:font-bold file:cursor-pointer hover:file:bg-yellow-500 mb-6"
            />
            <div className="flex gap-4">
              <button
                data-testid="import-confirm"
                onClick={handleImport}
                className="flex-1 rounded-none font-oswald uppercase tracking-wider font-bold bg-yellow-400 text-black hover:bg-yellow-500 transition-all active:scale-95 border-2 border-transparent px-6 py-3"
              >
                Import
              </button>
              <button
                data-testid="import-cancel"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="flex-1 rounded-none font-oswald uppercase tracking-wider font-bold bg-zinc-800 text-white hover:bg-zinc-700 border-2 border-zinc-700 px-6 py-3"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Song from Audio Modal */}
      {showAudioSongModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border-2 border-green-500 rounded-none p-8 max-w-md w-full">
            <h3 className="text-2xl font-oswald font-bold uppercase mb-6 text-green-400 flex items-center gap-2">
              <Mic size={24} strokeWidth={2} />
              New Song from Audio
            </h3>
            <p className="text-zinc-400 text-sm mb-4">
              Upload an audio file to create a new song. Lyrics will be automatically transcribed and duration extracted.
            </p>
            <div className="bg-green-900/30 border border-green-600 p-3 rounded-none mb-4">
              <p className="text-green-400 text-xs">
                ✓ Supports MP3, WAV, M4A, OGG, FLAC (max 50MB)
              </p>
            </div>
            <input
              data-testid="audio-song-file-input"
              type="file"
              accept=".mp3,.wav,.m4a,.mp4,.ogg,.flac,.aac,audio/*"
              onChange={(e) => setAudioFile(e.target.files[0])}
              disabled={isCreatingFromAudio}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:bg-green-600 file:text-white file:font-oswald file:uppercase file:font-bold file:cursor-pointer hover:file:bg-green-700 disabled:opacity-50 mb-6"
            />
            {audioFile && (
              <div className="bg-zinc-950 border border-zinc-800 p-3 mb-4 text-sm">
                <div className="text-zinc-400">Selected file:</div>
                <div className="text-white font-mono text-xs truncate">{audioFile.name}</div>
              </div>
            )}
            <div className="flex gap-4">
              <button
                data-testid="audio-song-confirm"
                onClick={handleCreateFromAudio}
                disabled={isCreatingFromAudio || !audioFile}
                className="flex-1 rounded-none font-oswald uppercase tracking-wider font-bold bg-green-600 text-white hover:bg-green-700 transition-all active:scale-95 border-2 border-transparent px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreatingFromAudio ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Song'
                )}
              </button>
              <button
                data-testid="audio-song-cancel"
                onClick={() => {
                  setShowAudioSongModal(false);
                  setAudioFile(null);
                }}
                disabled={isCreatingFromAudio}
                className="flex-1 rounded-none font-oswald uppercase tracking-wider font-bold bg-zinc-800 text-white hover:bg-zinc-700 border-2 border-zinc-700 px-6 py-3 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-lg w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-oswald font-bold text-white flex items-center gap-3">
                <Keyboard size={24} className="text-amber-400" />
                Keyboard Shortcuts
              </h3>
              <button
                data-testid="close-shortcuts-modal"
                onClick={() => setShowShortcutsModal(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Teleprompter Shortcuts */}
              <div>
                <h4 className="text-sm font-oswald uppercase tracking-wider text-amber-400 mb-3">
                  Teleprompter
                </h4>
                <div className="space-y-2">
                  {[
                    { key: "Space", action: "Play / Pause" },
                    { key: "→ or PageDown", action: "Next Song" },
                    { key: "← or PageUp", action: "Previous Song" },
                    { key: "Home", action: "Start Set" },
                    { key: "Escape", action: "Stop" },
                    { key: "S", action: "Toggle Settings" },
                  ].map((shortcut) => (
                    <div key={shortcut.key} className="flex items-center justify-between">
                      <span className="text-zinc-400 text-sm">{shortcut.action}</span>
                      <kbd className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-1 rounded text-xs font-mono">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dashboard Shortcuts */}
              <div>
                <h4 className="text-sm font-oswald uppercase tracking-wider text-violet-400 mb-3">
                  Dashboard
                </h4>
                <div className="space-y-2">
                  {[
                    { key: "?", action: "Show this help" },
                  ].map((shortcut) => (
                    <div key={shortcut.key} className="flex items-center justify-between">
                      <span className="text-zinc-400 text-sm">{shortcut.action}</span>
                      <kbd className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-1 rounded text-xs font-mono">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* Touch Gestures */}
              <div>
                <h4 className="text-sm font-oswald uppercase tracking-wider text-emerald-400 mb-3">
                  Touch Gestures (Teleprompter)
                </h4>
                <div className="space-y-2 text-sm text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span>Swipe Left</span>
                    <span className="text-zinc-500">Next Song</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Swipe Right</span>
                    <span className="text-zinc-500">Previous Song</span>
                  </div>
                </div>
              </div>

              {/* Foot Pedal */}
              <div className="pt-4 border-t border-zinc-800">
                <h4 className="text-sm font-oswald uppercase tracking-wider text-zinc-500 mb-2">
                  Bluetooth Foot Pedal
                </h4>
                <p className="text-xs text-zinc-600">
                  Connect a Bluetooth gamepad/foot pedal. Button 1 = Next, Button 2 = Prev, Button 3 = Play/Pause
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsModal(false)}
              className="w-full mt-6 btn-primary rounded-lg py-3 font-oswald uppercase tracking-wider"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border-2 border-purple-500 rounded-none p-8 max-w-md w-full">
            <h3 className="text-2xl font-oswald font-bold uppercase mb-6 text-purple-400 flex items-center gap-2">
              <FileJson size={24} strokeWidth={2} />
              Restore Backup
            </h3>
            <p className="text-zinc-400 text-sm mb-4">
              Upload a StageHand backup file (.json) to restore your songs and setlists.
            </p>
            <div className="bg-yellow-900/30 border border-yellow-600 p-3 rounded-none mb-4">
              <p className="text-yellow-400 text-xs">
                ⚠️ This will ADD data to your library, not replace it. Setlists will be created empty.
              </p>
            </div>
            <input
              data-testid="restore-file-input"
              type="file"
              accept=".json"
              onChange={(e) => setRestoreFile(e.target.files[0])}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:bg-purple-600 file:text-white file:font-oswald file:uppercase file:font-bold file:cursor-pointer hover:file:bg-purple-700 mb-6"
            />
            <div className="flex gap-4">
              <button
                data-testid="restore-confirm"
                onClick={handleRestore}
                className="flex-1 rounded-none font-oswald uppercase tracking-wider font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all active:scale-95 border-2 border-transparent px-6 py-3"
              >
                Restore
              </button>
              <button
                data-testid="restore-cancel"
                onClick={() => {
                  setShowRestoreModal(false);
                  setRestoreFile(null);
                }}
                className="flex-1 rounded-none font-oswald uppercase tracking-wider font-bold bg-zinc-800 text-white hover:bg-zinc-700 border-2 border-zinc-700 px-6 py-3"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
