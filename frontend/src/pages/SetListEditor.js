import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Save, Trash2, Play, Plus, GripVertical, X } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SetListEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [setlist, setSetlist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [allSongs, setAllSongs] = useState([]);
  const [name, setName] = useState("");
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [setlistRes, allSongsRes] = await Promise.all([
        axios.get(`${API}/setlists/${id}`),
        axios.get(`${API}/songs`)
      ]);
      
      setSetlist(setlistRes.data);
      setName(setlistRes.data.name);
      setAllSongs(allSongsRes.data);

      // Load songs in order
      const orderedSongs = [];
      for (const songId of setlistRes.data.song_ids) {
        const song = allSongsRes.data.find(s => s.id === songId);
        if (song) orderedSongs.push(song);
      }
      setSongs(orderedSongs);
      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load set list");
      setLoading(false);
    }
  };

  const saveSetList = async () => {
    try {
      await axios.put(`${API}/setlists/${id}`, {
        name,
        song_ids: songs.map(s => s.id)
      });
      toast.success("Set list saved!");
    } catch (error) {
      console.error("Error saving set list:", error);
      toast.error("Failed to save set list");
    }
  };

  const addSongToSetList = (song) => {
    if (!songs.find(s => s.id === song.id)) {
      setSongs([...songs, song]);
    }
    setShowAddSongModal(false);
  };

  const removeSongFromSetList = (songId) => {
    setSongs(songs.filter(s => s.id !== songId));
  };

  const moveSong = (index, direction) => {
    const newSongs = [...songs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newSongs.length) return;
    
    [newSongs[index], newSongs[targetIndex]] = [newSongs[targetIndex], newSongs[index]];
    setSongs(newSongs);
  };

  const openTeleprompter = () => {
    saveSetList();
    const url = `/prompter/${id}`;
    window.open(url, 'teleprompter', 'width=1200,height=800');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-400 font-mono">LOADING...</div>
      </div>
    );
  }

  const availableSongs = allSongs.filter(s => !songs.find(song => song.id === s.id));

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            data-testid="back-to-dashboard"
            onClick={() => navigate('/')}
            className="text-zinc-400 hover:text-white transition-colors mb-4 flex items-center gap-2 font-oswald uppercase text-sm"
          >
            <ArrowLeft size={18} strokeWidth={1.5} />
            Back to Dashboard
          </button>

          <div className="flex items-start justify-between gap-4 mb-6">
            <input
              data-testid="setlist-name-edit"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-transparent border-b-2 border-zinc-800 focus:border-yellow-400 outline-none text-4xl md:text-6xl font-oswald font-bold tracking-tighter uppercase text-white px-0 py-2 transition-colors"
            />
          </div>

          <div className="flex gap-4">
            <button
              data-testid="save-setlist-btn"
              onClick={saveSetList}
              className="rounded-none font-oswald uppercase tracking-wider font-bold bg-yellow-400 text-black hover:bg-yellow-500 transition-all active:scale-95 border-2 border-transparent px-6 py-3 flex items-center gap-2"
            >
              <Save size={20} strokeWidth={2.5} />
              Save Changes
            </button>
            <button
              data-testid="open-teleprompter-btn"
              onClick={openTeleprompter}
              className="rounded-none font-oswald uppercase tracking-wider font-bold bg-green-600 text-white hover:bg-green-700 transition-all active:scale-95 border-2 border-transparent px-6 py-3 flex items-center gap-2"
            >
              <Play size={20} strokeWidth={2.5} />
              Open Teleprompter
            </button>
          </div>
        </div>

        {/* Songs List */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-oswald font-bold uppercase text-white">
              Songs [{songs.length}]
            </h2>
            <button
              data-testid="add-song-to-setlist-btn"
              onClick={() => setShowAddSongModal(true)}
              className="rounded-none font-oswald uppercase tracking-wider font-bold bg-zinc-800 text-white hover:bg-zinc-700 border-2 border-zinc-700 px-6 py-3 flex items-center gap-2"
            >
              <Plus size={20} strokeWidth={1.5} />
              Add Song
            </button>
          </div>

          {songs.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-none p-12 text-center">
              <p className="text-zinc-500 text-lg">No songs in this set list. Add some!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {songs.map((song, index) => (
                <div
                  key={song.id}
                  data-testid={`setlist-song-${song.id}`}
                  className="bg-zinc-900 border border-zinc-800 rounded-none p-4 flex items-center gap-4 group hover:border-zinc-700 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      data-testid={`move-song-up-${song.id}`}
                      onClick={() => moveSong(index, 'up')}
                      disabled={index === 0}
                      className="text-zinc-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <GripVertical size={16} strokeWidth={1.5} />
                    </button>
                    <button
                      data-testid={`move-song-down-${song.id}`}
                      onClick={() => moveSong(index, 'down')}
                      disabled={index === songs.length - 1}
                      className="text-zinc-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <GripVertical size={16} strokeWidth={1.5} />
                    </button>
                  </div>

                  <div className="font-mono text-sm text-zinc-500 w-8">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <div className="flex-1">
                    <div className="font-bold text-white">{song.name}</div>
                    {song.artist && (
                      <div className="text-sm text-zinc-400">{song.artist}</div>
                    )}
                  </div>

                  <div className="flex gap-2 text-xs font-mono text-zinc-500">
                    {song.key && <span className="bg-zinc-800 px-2 py-1 border border-zinc-700">KEY: {song.key}</span>}
                    {song.tempo && <span className="bg-zinc-800 px-2 py-1 border border-zinc-700">BPM: {song.tempo}</span>}
                    {song.duration && <span className="bg-zinc-800 px-2 py-1 border border-zinc-700">DUR: {song.duration}</span>}
                  </div>

                  <button
                    data-testid={`remove-song-${song.id}`}
                    onClick={() => removeSongFromSetList(song.id)}
                    className="text-zinc-600 hover:text-red-500 transition-colors"
                  >
                    <X size={20} strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Song Modal */}
      {showAddSongModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border-2 border-yellow-400 rounded-none p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-oswald font-bold uppercase mb-6 text-yellow-400">
              Add Song to Set List
            </h3>

            {availableSongs.length === 0 ? (
              <p className="text-zinc-500 mb-6">No more songs available. Create more songs first!</p>
            ) : (
              <div className="space-y-3 mb-6">
                {availableSongs.map((song) => (
                  <div
                    key={song.id}
                    data-testid={`available-song-${song.id}`}
                    onClick={() => addSongToSetList(song)}
                    className="bg-zinc-950 border border-zinc-800 rounded-none p-4 cursor-pointer hover:border-yellow-400 transition-colors"
                  >
                    <div className="font-bold text-white">{song.name}</div>
                    {song.artist && (
                      <div className="text-sm text-zinc-400">{song.artist}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              data-testid="close-add-song-modal"
              onClick={() => setShowAddSongModal(false)}
              className="w-full rounded-none font-oswald uppercase tracking-wider font-bold bg-zinc-800 text-white hover:bg-zinc-700 border-2 border-zinc-700 px-6 py-3"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
