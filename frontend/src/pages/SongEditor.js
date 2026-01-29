import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Save, Trash2, Wand2, Upload, Music, X, Loader2, Mic } from "lucide-react";
import { toast } from "sonner";
import LyricFormatter from "../components/LyricFormatter";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SongEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const audioInputRef = useRef(null);
  const pendingFileRef = useRef(null);

  const [name, setName] = useState("");
  const [artist, setArtist] = useState("");
  const [songKey, setSongKey] = useState("");
  const [tempo, setTempo] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [audioFile, setAudioFile] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [showFormatter, setShowFormatter] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [showTranscribeConfirm, setShowTranscribeConfirm] = useState(false);

  useEffect(() => {
    if (!isNew) {
      loadSong();
    }
  }, [id]);

  const loadSong = async () => {
    try {
      const response = await axios.get(`${API}/songs/${id}`);
      const song = response.data;
      setName(song.name);
      setArtist(song.artist || "");
      setSongKey(song.key || "");
      setTempo(song.tempo || "");
      setDuration(song.duration || "");
      setNotes(song.notes || "");
      setLyrics(song.lyrics || "");
      setAudioFile(song.audio_file || "");
      setLoading(false);
    } catch (error) {
      console.error("Error loading song:", error);
      toast.error("Failed to load song");
      setLoading(false);
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/flac', 'audio/aac'];
    if (!allowedTypes.some(type => file.type.includes(type.split('/')[1]))) {
      toast.error("Please upload an audio file (MP3, WAV, M4A, OGG, FLAC)");
      return;
    }

    // Check file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large. Maximum size: 50MB");
      return;
    }

    setUploadingAudio(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/songs/${id}/audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAudioFile(response.data.audio_file);
      // Update duration if extracted from audio
      if (response.data.duration) {
        setDuration(response.data.duration);
        toast.success(`Practice track uploaded! Duration: ${response.data.duration}`);
      } else {
        toast.success("Practice track uploaded!");
      }
    } catch (error) {
      console.error("Error uploading audio:", error);
      toast.error(error.response?.data?.detail || "Failed to upload audio");
    } finally {
      setUploadingAudio(false);
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAudio = async () => {
    if (!window.confirm("Remove practice track from this song?")) return;

    try {
      await axios.delete(`${API}/songs/${id}/audio`);
      setAudioFile("");
      toast.success("Practice track removed");
    } catch (error) {
      console.error("Error deleting audio:", error);
      toast.error("Failed to remove audio");
    }
  };

  const saveSong = async () => {
    if (!name.trim()) {
      toast.error("Song name is required");
      return;
    }

    const songData = {
      name,
      artist,
      key: songKey,
      tempo,
      duration,
      notes,
      lyrics
    };

    try {
      if (isNew) {
        const response = await axios.post(`${API}/songs`, songData);
        toast.success("Song created!");
        navigate(`/song/${response.data.id}`);
      } else {
        await axios.put(`${API}/songs/${id}`, songData);
        toast.success("Song saved!");
      }
    } catch (error) {
      console.error("Error saving song:", error);
      toast.error("Failed to save song");
    }
  };

  const deleteSong = async () => {
    if (!window.confirm("Delete this song? It will be removed from all set lists.")) return;

    try {
      await axios.delete(`${API}/songs/${id}`);
      toast.success("Song deleted");
      navigate('/');
    } catch (error) {
      console.error("Error deleting song:", error);
      toast.error("Failed to delete song");
    }
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            data-testid="back-to-dashboard-from-song"
            onClick={() => navigate('/')}
            className="text-zinc-400 hover:text-white transition-colors mb-4 flex items-center gap-2 font-oswald uppercase text-sm"
          >
            <ArrowLeft size={18} strokeWidth={1.5} />
            Back to Dashboard
          </button>

          <h1 className="text-4xl md:text-6xl font-oswald font-bold tracking-tighter uppercase text-yellow-400 mb-6">
            {isNew ? 'New Song' : 'Edit Song'}
          </h1>

          <div className="flex gap-4">
            <button
              data-testid="save-song-btn"
              onClick={saveSong}
              className="rounded-none font-oswald uppercase tracking-wider font-bold bg-yellow-400 text-black hover:bg-yellow-500 transition-all active:scale-95 border-2 border-transparent px-6 py-3 flex items-center gap-2"
            >
              <Save size={20} strokeWidth={2.5} />
              {isNew ? 'Create Song' : 'Save Changes'}
            </button>
            {!isNew && (
              <button
                data-testid="delete-song-btn"
                onClick={deleteSong}
                className="rounded-none font-oswald uppercase tracking-wider font-bold bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95 border-2 border-transparent px-6 py-3 flex items-center gap-2"
              >
                <Trash2 size={20} strokeWidth={1.5} />
                Delete Song
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Song Name */}
          <div>
            <label className="block text-sm font-oswald uppercase tracking-wider text-zinc-400 mb-2">
              Song Name *
            </label>
            <input
              data-testid="song-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter song name"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-4 py-3 text-white placeholder:text-zinc-600 font-mono focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
            />
          </div>

          {/* Artist */}
          <div>
            <label className="block text-sm font-oswald uppercase tracking-wider text-zinc-400 mb-2">
              Artist
            </label>
            <input
              data-testid="song-artist-input"
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Enter artist name"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-4 py-3 text-white placeholder:text-zinc-600 font-mono focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
            />
          </div>

          {/* Key, Tempo, Duration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-oswald uppercase tracking-wider text-zinc-400 mb-2">
                Key
              </label>
              <input
                data-testid="song-key-input"
                type="text"
                value={songKey}
                onChange={(e) => setSongKey(e.target.value)}
                placeholder="e.g. C, Am, F#"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-4 py-3 text-white placeholder:text-zinc-600 font-mono focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-oswald uppercase tracking-wider text-zinc-400 mb-2">
                Tempo (BPM)
              </label>
              <input
                data-testid="song-tempo-input"
                type="text"
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                placeholder="e.g. 120"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-4 py-3 text-white placeholder:text-zinc-600 font-mono focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-oswald uppercase tracking-wider text-zinc-400 mb-2">
                Duration
              </label>
              <input
                data-testid="song-duration-input"
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 3:45"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-4 py-3 text-white placeholder:text-zinc-600 font-mono focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-oswald uppercase tracking-wider text-zinc-400 mb-2">
              Notes
            </label>
            <textarea
              data-testid="song-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes, reminders, or special instructions..."
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-4 py-3 text-white placeholder:text-zinc-600 font-mono focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 outline-none resize-none"
            />
          </div>

          {/* Practice Track Upload */}
          {!isNew && (
            <div>
              <label className="block text-sm font-oswald uppercase tracking-wider text-zinc-400 mb-2">
                Practice Track (MP3)
              </label>
              
              {audioFile ? (
                <div className="bg-zinc-950 border border-zinc-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Music size={20} className="text-green-500" />
                      <div>
                        <div className="text-white font-mono text-sm">Practice track uploaded</div>
                        <div className="text-xs text-zinc-500">{audioFile}</div>
                      </div>
                    </div>
                    <button
                      data-testid="delete-audio-btn"
                      onClick={handleDeleteAudio}
                      className="text-zinc-500 hover:text-red-500 transition-colors"
                      title="Remove audio"
                    >
                      <X size={20} strokeWidth={1.5} />
                    </button>
                  </div>
                  <audio
                    controls
                    className="w-full h-10"
                    src={`${API}/audio/${audioFile}`}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              ) : (
                <div className="bg-zinc-950 border border-zinc-800 border-dashed p-6 text-center">
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept=".mp3,.wav,.m4a,.ogg,.flac,.aac,audio/*"
                    onChange={handleAudioUpload}
                    className="hidden"
                    id="audio-upload"
                    data-testid="audio-upload-input"
                  />
                  <label
                    htmlFor="audio-upload"
                    className={`cursor-pointer flex flex-col items-center gap-2 ${uploadingAudio ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    {uploadingAudio ? (
                      <>
                        <Loader2 size={32} className="text-yellow-400 animate-spin" />
                        <span className="text-zinc-400 font-mono text-sm">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={32} className="text-zinc-600" />
                        <span className="text-zinc-400 font-mono text-sm">Click to upload practice track</span>
                        <span className="text-xs text-zinc-600">MP3, WAV, M4A, OGG, FLAC (max 50MB)</span>
                      </>
                    )}
                  </label>
                </div>
              )}
              <p className="text-xs text-zinc-500 mt-1">
                Upload your own recording for Practice Mode in the teleprompter
              </p>
            </div>
          )}

          {/* Lyrics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-oswald uppercase tracking-wider text-zinc-400">
                Lyrics
              </label>
              <button
                data-testid="format-lyrics-btn"
                onClick={() => setShowFormatter(true)}
                className="text-xs font-oswald uppercase tracking-wider font-bold bg-green-600 text-white hover:bg-green-700 transition-all px-4 py-2 rounded-none flex items-center gap-2"
              >
                <Wand2 size={14} strokeWidth={2} />
                Format Lyrics
              </button>
            </div>
            <textarea
              data-testid="song-lyrics-input"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Paste or type lyrics here..."
              rows={15}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-4 py-3 text-white placeholder:text-zinc-600 font-mono text-base leading-relaxed focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* Lyric Formatter Modal */}
      {showFormatter && (
        <LyricFormatter
          lyrics={lyrics}
          onApply={(formattedLyrics) => setLyrics(formattedLyrics)}
          onApplyAndSave={(formattedLyrics) => {
            setLyrics(formattedLyrics);
            // Trigger save automatically
            setTimeout(() => {
              saveSong();
            }, 100);
          }}
          onClose={() => setShowFormatter(false)}
        />
      )}
    </div>
  );
}
