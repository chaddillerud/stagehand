import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Music, Trash2, Edit, Upload } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const navigate = useNavigate();
  const [setlists, setSetlists] = useState([]);
  const [songs, setSongs] = useState([]);
  const [showNewSetListModal, setShowNewSetListModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newSetListName, setNewSetListName] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const deleteSetList = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this set list?")) return;

    try {
      await axios.delete(`${API}/setlists/${id}`);
      setSetlists(setlists.filter(s => s.id !== id));
      toast.success("Set list deleted");
    } catch (error) {
      console.error("Error deleting set list:", error);
      toast.error("Failed to delete set list");
    }
  };

  const deleteSong = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this song?")) return;

    try {
      await axios.delete(`${API}/songs/${id}`);
      setSongs(songs.filter(s => s.id !== id));
      toast.success("Song deleted");
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

  const createNewSong = () => {
    navigate("/song/new");
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
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-oswald font-bold tracking-tighter uppercase text-yellow-400 mb-2">
            StageHand
          </h1>
          <p className="text-zinc-400 text-lg">Your savage setlist maker & lyric teleprompter</p>
        </div>

        {/* Set Lists Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl md:text-5xl font-oswald font-bold tracking-tight uppercase text-white">
              Set Lists
            </h2>
            <button
              data-testid="create-setlist-btn"
              onClick={() => setShowNewSetListModal(true)}
              className="rounded-none font-oswald uppercase tracking-wider font-bold bg-yellow-400 text-black hover:bg-yellow-500 transition-all active:scale-95 border-2 border-transparent px-6 py-3 flex items-center gap-2"
            >
              <Plus size={20} strokeWidth={2.5} />
              New Set List
            </button>
          </div>

          {setlists.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-none p-12 text-center">
              <Music size={48} className="mx-auto mb-4 text-zinc-700" strokeWidth={1.5} />
              <p className="text-zinc-500 text-lg">No set lists yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {setlists.map((setlist) => (
                <div
                  key={setlist.id}
                  data-testid={`setlist-card-${setlist.id}`}
                  onClick={() => navigate(`/setlist/${setlist.id}`)}
                  className="bg-zinc-900 border border-zinc-800 rounded-none p-6 hover:border-yellow-400/50 transition-all cursor-pointer group relative overflow-hidden hover:shadow-[4px_4px_0px_0px_rgba(250,204,21,1)]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                      {setlist.name}
                    </h3>
                    <button
                      data-testid={`delete-setlist-${setlist.id}`}
                      onClick={(e) => deleteSetList(setlist.id, e)}
                      className="text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="font-mono text-sm text-zinc-500">
                    [{setlist.song_ids.length}] SONGS / {calculateTotalTime(setlist.song_ids)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Songs Library Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl md:text-5xl font-oswald font-bold tracking-tight uppercase text-white">
              Songs Library
            </h2>
            <div className="flex gap-4">
              <button
                data-testid="import-song-btn"
                onClick={() => setShowImportModal(true)}
                className="rounded-none font-oswald uppercase tracking-wider font-bold bg-zinc-800 text-white hover:bg-zinc-700 border-2 border-zinc-700 px-6 py-3 flex items-center gap-2"
              >
                <Upload size={20} strokeWidth={1.5} />
                Import .txt
              </button>
              <button
                data-testid="create-song-btn"
                onClick={createNewSong}
                className="rounded-none font-oswald uppercase tracking-wider font-bold bg-yellow-400 text-black hover:bg-yellow-500 transition-all active:scale-95 border-2 border-transparent px-6 py-3 flex items-center gap-2"
              >
                <Plus size={20} strokeWidth={2.5} />
                New Song
              </button>
            </div>
          </div>

          {songs.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-none p-12 text-center">
              <Music size={48} className="mx-auto mb-4 text-zinc-700" strokeWidth={1.5} />
              <p className="text-zinc-500 text-lg">No songs yet. Create or import one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {songs.map((song) => (
                <div
                  key={song.id}
                  data-testid={`song-card-${song.id}`}
                  onClick={() => navigate(`/song/${song.id}`)}
                  className="bg-zinc-900 border border-zinc-800 rounded-none p-6 hover:border-yellow-400/50 transition-all cursor-pointer group relative overflow-hidden hover:shadow-[4px_4px_0px_0px_rgba(250,204,21,1)]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors mb-1">
                        {song.name}
                      </h3>
                      {song.artist && (
                        <p className="text-zinc-400 text-sm">{song.artist}</p>
                      )}
                    </div>
                    <button
                      data-testid={`delete-song-${song.id}`}
                      onClick={(e) => deleteSong(song.id, e)}
                      className="text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="flex gap-4 text-xs font-mono text-zinc-500">
                    {song.key && <span>KEY: {song.key}</span>}
                    {song.tempo && <span>BPM: {song.tempo}</span>}
                    {song.duration && <span>DUR: {song.duration}</span>}
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
    </div>
  );
}
