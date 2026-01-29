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

    // If song already has lyrics, ask if user wants to transcribe
    if (lyrics.trim()) {
      pendingFileRef.current = file;
      setShowTranscribeConfirm(true);
    } else {
      // No existing lyrics - transcribe by default
      await doAudioUpload(file, true);
    }
  };

  const doAudioUpload = async (file, shouldTranscribe) => {
    setUploadingAudio(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API}/songs/${id}/audio?transcribe=${shouldTranscribe}`, 
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      setAudioFile(response.data.audio_file);
      
      // Update duration if extracted from audio
      if (response.data.duration) {
        setDuration(response.data.duration);
      }
      
      // Update lyrics if transcribed
      if (response.data.lyrics) {
        setLyrics(response.data.lyrics);
        toast.success(`Practice track uploaded! Duration: ${response.data.duration || 'N/A'} | Lyrics transcribed!`);
      } else if (response.data.duration) {
        toast.success(`Practice track uploaded! Duration: ${response.data.duration}`);
      } else {
        toast.success("Practice track uploaded!");
      }
    } catch (error) {
      console.error("Error uploading audio:", error);
      toast.error(error.response?.data?.detail || "Failed to upload audio");
    } finally {
      setUploadingAudio(false);
      pendingFileRef.current = null;
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    }
  };

  const handleTranscribeConfirm = async (shouldTranscribe) => {
    setShowTranscribeConfirm(false);
    if (pendingFileRef.current) {
      await doAudioUpload(pendingFileRef.current, shouldTranscribe);
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
            className="text-zinc-400 hover:text-white transition-colors mb-6 flex items-center gap-2 text-sm group"
          >
            <ArrowLeft size={18} strokeWidth={1.5} className="group-hover:-translate-x-1 transition-transform" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-violet-600 rounded flex items-center justify-center">
                <Music size={14} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="font-oswald uppercase tracking-wider">StageHand</span>
            </div>
          </button>

          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-oswald font-bold tracking-tight text-white mb-2">
                {isNew ? 'Create New Song' : name || 'Edit Song'}
              </h1>
              {!isNew && artist && (
                <p className="text-zinc-500 text-lg">{artist}</p>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                data-testid="save-song-btn"
                onClick={saveSong}
                className="btn-primary rounded-lg px-5 py-2.5 flex items-center gap-2 font-oswald uppercase tracking-wider text-sm"
              >
                <Save size={18} strokeWidth={2} />
                {isNew ? 'Create' : 'Save'}
              </button>
              {!isNew && (
                <button
                  data-testid="delete-song-btn"
                  onClick={deleteSong}
                  className="bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white rounded-lg px-4 py-2.5 flex items-center gap-2 font-oswald uppercase tracking-wider text-sm transition-all"
                >
                  <Trash2 size={18} strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-8">
          {/* Basic Info Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-oswald uppercase tracking-wider text-zinc-500 mb-5 flex items-center gap-2">
              <Music size={14} />
              Song Details
            </h2>
            
            <div className="space-y-5">
              {/* Song Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  Song Name <span className="text-amber-500">*</span>
                </label>
                <input
                  data-testid="song-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter song name"
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-3 text-white text-lg placeholder:text-zinc-600 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                />
              </div>

              {/* Artist */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  Artist
                </label>
                <input
                  data-testid="song-artist-input"
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Enter artist name"
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                />
              </div>

              {/* Key, Tempo, Duration */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">
                    Key
                  </label>
                  <input
                    data-testid="song-key-input"
                    type="text"
                    value={songKey}
                    onChange={(e) => setSongKey(e.target.value)}
                    placeholder="C, Am, F#"
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all text-center font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">
                    BPM
                  </label>
                  <input
                    data-testid="song-tempo-input"
                    type="text"
                    value={tempo}
                    onChange={(e) => setTempo(e.target.value)}
                    placeholder="120"
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all text-center font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">
                    Duration
                  </label>
                  <input
                    data-testid="song-duration-input"
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="3:45"
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all text-center font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-oswald uppercase tracking-wider text-zinc-500 mb-4">
              Performance Notes
            </h2>
            <textarea
              data-testid="song-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes, reminders, or special instructions for this song..."
              rows={3}
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Practice Track Card */}
          {!isNew && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-sm font-oswald uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
                <Music size={14} className="text-emerald-500" />
                Practice Track
              </h2>
              
              {audioFile ? (
                <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                        <Music size={20} className="text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm">Practice track ready</div>
                        <div className="text-xs text-zinc-500 font-mono truncate max-w-xs">{audioFile}</div>
                      </div>
                    </div>
                    <button
                      data-testid="delete-audio-btn"
                      onClick={handleDeleteAudio}
                      className="text-zinc-500 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
                      title="Remove audio"
                    >
                      <X size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                  <audio
                    controls
                    className="w-full h-10 rounded"
                    src={`${API}/audio/${audioFile}`}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              ) : (
                <div className="border-2 border-dashed border-zinc-800 rounded-lg p-8 text-center hover:border-zinc-700 transition-colors">
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
                    className={`cursor-pointer flex flex-col items-center gap-3 ${uploadingAudio ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    {uploadingAudio ? (
                      <>
                        <Loader2 size={32} className="text-amber-400 animate-spin" />
                        <span className="text-zinc-400 text-sm">Uploading & processing...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center">
                          <Upload size={24} className="text-zinc-500" />
                        </div>
                        <div>
                          <span className="text-zinc-300 text-sm block">Drop audio file or click to upload</span>
                          <span className="text-xs text-zinc-600">MP3, WAV, M4A, OGG, FLAC • Max 50MB</span>
                        </div>
                      </>
                    )}
                  </label>
                </div>
              )}
              <p className="text-xs text-zinc-600 mt-3">
                Audio will be available in Practice Mode during teleprompter playback
              </p>
            </div>
          )}

          {/* Lyrics Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-oswald uppercase tracking-wider text-zinc-500">
                Lyrics
              </h2>
              <button
                data-testid="format-lyrics-btn"
                onClick={() => setShowFormatter(true)}
                className="btn-secondary rounded-lg px-4 py-2 flex items-center gap-2 text-xs font-oswald uppercase tracking-wider"
              >
                <Wand2 size={14} strokeWidth={2} />
                Format
              </button>
            </div>
            <textarea
              data-testid="song-lyrics-input"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Paste or type lyrics here...

Use [Solo:8] for 8-bar pause markers
Use [Bridge:4] for 4-bar instrumental sections"
              rows={18}
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-4 text-white placeholder:text-zinc-600 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all resize-none"
            />
            <p className="text-xs text-zinc-600 mt-2">
              Tip: Add <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-amber-400">[Solo:8]</code> markers for instrumental sections (number = bars)
            </p>
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

      {/* Transcribe Confirmation Modal */}
      {showTranscribeConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border-2 border-green-500 rounded-none p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <Mic size={24} className="text-green-500" />
              <h3 className="text-2xl font-oswald font-bold uppercase text-green-400">
                Transcribe Lyrics?
              </h3>
            </div>
            <p className="text-zinc-400 mb-6">
              This song already has lyrics. Would you like to replace them with transcribed lyrics from the audio?
            </p>
            <div className="bg-zinc-950 border border-zinc-800 p-3 mb-6 text-sm">
              <div className="text-zinc-500">Current lyrics preview:</div>
              <div className="text-zinc-300 font-mono text-xs mt-2 max-h-20 overflow-hidden">
                {lyrics.substring(0, 200)}{lyrics.length > 200 ? '...' : ''}
              </div>
            </div>
            <div className="flex gap-4">
              <button
                data-testid="transcribe-yes"
                onClick={() => handleTranscribeConfirm(true)}
                disabled={uploadingAudio}
                className="flex-1 rounded-none font-oswald uppercase tracking-wider font-bold bg-green-600 text-white hover:bg-green-700 transition-all px-6 py-3 disabled:opacity-50"
              >
                {uploadingAudio ? 'Uploading...' : 'Yes, Transcribe'}
              </button>
              <button
                data-testid="transcribe-no"
                onClick={() => handleTranscribeConfirm(false)}
                disabled={uploadingAudio}
                className="flex-1 rounded-none font-oswald uppercase tracking-wider font-bold bg-zinc-800 text-white hover:bg-zinc-700 border-2 border-zinc-700 px-6 py-3 disabled:opacity-50"
              >
                {uploadingAudio ? 'Uploading...' : 'No, Keep Lyrics'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
