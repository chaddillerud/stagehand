# StageHand - Set List Maker & Lyric Teleprompter

## Original Problem Statement
Build a set list maker and lyric teleprompter for live performances. The app should be scrollable, editable, support importing songs and setlists from .txt files, and feature a pop-out teleprompter with controls for prev/next/skip/start/stop, performance countdown timer, drag-and-drop song reordering, real-time clock, estimated set end time, and Bluetooth foot pedal support.

## Core Features (Implemented)

### Song Management
- [x] Create, edit, delete songs
- [x] Fields: name, artist, key, tempo (BPM), duration, notes, lyrics
- [x] Import songs from .txt files
- [x] Lyric formatter tool (standardize spacing, handle chords)
- [x] **NEW: Create song from audio file** (auto-transcribes lyrics, extracts duration)
- [x] Practice Track upload (MP3, WAV, M4A, OGG, FLAC - max 50MB)
- [x] Auto-extract duration from uploaded audio files
- [x] Auto-transcribe lyrics from audio (via OpenAI Whisper)
- [x] Smart transcribe: asks before replacing existing lyrics

### Setlist Management
- [x] Create, edit, delete setlists
- [x] Drag-and-drop song reordering
- [x] Total set time display
- [x] Double-click song to edit
- [x] Print-friendly view
- [x] AUDIO badge for songs with practice tracks
- [x] Duplicate setlist functionality

### Dashboard (Quick Wins - Jan 2026)
- [x] StageHand logo with gradient icon (amber → violet)
- [x] Search bar for filtering songs by title or artist
- [x] Duplicate song button (appears on hover)
- [x] Duplicate setlist button (appears on hover)
- [x] Keyboard Shortcuts modal (? key or button)
- [x] Logo in Song/SetList Editor back navigation

### Teleprompter
- [x] Pop-out window
- [x] Controls: Start/Pause/Stop/Prev/Next
- [x] Performance countdown timer
- [x] Real-time clock
- [x] Estimated set end time
- [x] Auto-scroll based on song duration
- [x] Speed slider (50% - 300%)
- [x] Display themes (Default, High Contrast, Stage Red, Daylight)
- [x] Orientation toggle (Landscape/Portrait)
- [x] Font size controls
- [x] Bluetooth foot pedal support
- [x] Touch gestures (swipe for prev/next)
- [x] Keyboard shortcuts
- [x] Practice Mode with audio playback
- [x] Click Track (Metronome) with BPM sync
- [x] Count-In (None / 4 Beats / 8 Beats)

### Practice Mode
- [x] Upload MP3/audio files per song
- [x] Duration auto-extracted from audio file
- [x] Lyrics auto-transcribed on upload (asks if replacing existing)
- [x] Practice Mode toggle in teleprompter settings
- [x] Audio plays automatically when performance starts
- [x] Syncs with Play/Pause/Stop controls
- [x] Auto-advances to next song when audio ends
- [x] Mute toggle

### Click Track
- [x] Classic metronome tick sound (Web Audio API)
- [x] Syncs with song BPM
- [x] Works with or without practice audio
- [x] Count-In options: None, 4 Beats, 8 Beats
- [x] Large countdown overlay during count-in

### Backup & Restore
- [x] Full database backup/restore

## Song Creation Workflows

### Option A: From Audio (Recommended)
1. Dashboard → Click "FROM AUDIO" (green button)
2. Upload MP3/WAV file
3. System auto-transcribes lyrics + extracts duration
4. Redirects to Song Editor with pre-filled data
5. Add song name, artist, key, BPM, notes → Save

### Option B: Manual Entry
1. Dashboard → Click "NEW SONG" (yellow button)
2. Fill in song details manually
3. Optionally upload practice track later

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Motor (async MongoDB)
- **Database**: MongoDB
- **Audio Processing**: mutagen (duration extraction)
- **Transcription**: OpenAI Whisper (via Emergent LLM Key)
- **Audio Storage**: Local file storage (/app/backend/audio_files/)

## API Endpoints
- `GET/POST /api/songs` - List/Create songs
- `GET/PUT/DELETE /api/songs/{id}` - Song CRUD
- `POST /api/songs/import` - Import .txt file
- `POST /api/songs/from-audio` - Create song from audio (transcribe + extract duration)
- `POST /api/songs/{id}/audio?transcribe=true/false` - Upload practice track
- `DELETE /api/songs/{id}/audio` - Delete practice track
- `GET /api/audio/{filename}` - Stream audio file
- `GET/POST /api/setlists` - List/Create setlists
- `GET/PUT/DELETE /api/setlists/{id}` - Setlist CRUD
- `GET /api/backup` - Export all data
- `POST /api/restore` - Import backup

## Database Schema
```
songs: {
  id, name, artist, key, tempo, duration, 
  notes, lyrics, audio_file,
  scroll_speed, auto_scroll,
  created_at, updated_at
}

setlists: {
  id, name, song_ids[],
  created_at, updated_at
}
```

## Known Issues
- Lyric Formatter "Chords Inline" mode has a visual bug (chords on new line instead of inline)
- Audio transcription workflow may have issues (user reported, needs investigation)

## Completed (Jan 2026)
- [x] Dashboard Quick Wins UI overhaul (logo, search, duplicate, shortcuts modal)
- [x] Persistent per-song scroll settings
- [x] On-the-fly lyric editing in teleprompter
- [x] Automatic pause markers ([Solo:8] format based on bars)
- [x] Click track with count-in options

## Future/Backlog Tasks
- [ ] Stage Notes Between Songs (transition notes)
- [ ] Time signature support for click track (3/4, 6/8)
- [ ] MIDI control integration
- [ ] Song Tags/Filters
- [ ] Timestamp-Based Auto-Scroll (LRC-style sync)
- [ ] Per-song volume adjustment
- [ ] Folder organization for songs
- [ ] Setlist templates
