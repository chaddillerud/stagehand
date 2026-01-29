# StageHand - Set List Maker & Lyric Teleprompter

## Original Problem Statement
Build a set list maker and lyric teleprompter for live performances. The app should be scrollable, editable, support importing songs and setlists from .txt files, and feature a pop-out teleprompter with controls for prev/next/skip/start/stop, performance countdown timer, drag-and-drop song reordering, real-time clock, estimated set end time, and Bluetooth foot pedal support.

## Core Features (Implemented)

### Song Management
- [x] Create, edit, delete songs
- [x] Fields: name, artist, key, tempo, duration, notes, lyrics
- [x] Import songs from .txt files
- [x] Audio transcription via OpenAI Whisper
- [x] Lyric formatter tool (standardize spacing, handle chords)
- [x] Practice Link field (YouTube, Spotify, Bandcamp URLs)
- [x] **Practice Track upload (MP3, WAV, M4A, OGG, FLAC - max 50MB)**

### Setlist Management
- [x] Create, edit, delete setlists
- [x] Drag-and-drop song reordering
- [x] Total set time display
- [x] Double-click song to edit
- [x] Print-friendly view

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
- [x] **Practice Mode with audio playback**

### Practice Mode (NEW - Jan 29, 2026)
- [x] Upload MP3/audio files per song
- [x] Practice Mode toggle in teleprompter settings
- [x] Audio plays automatically when performance starts
- [x] Syncs with Play/Pause/Stop controls
- [x] Auto-advances to next song when audio ends
- [x] Mute toggle
- [x] Music icon indicator for songs with tracks
- [x] "Track loaded" / "No practice track" status messages

### Backup & Restore
- [x] Full database backup/restore

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Motor (async MongoDB)
- **Database**: MongoDB
- **Integrations**: OpenAI Whisper (via Emergent LLM Key)
- **Audio Storage**: Local file storage (/app/backend/audio_files/)

## API Endpoints
- `GET/POST /api/songs` - List/Create songs
- `GET/PUT/DELETE /api/songs/{id}` - Song CRUD
- `POST /api/songs/import` - Import .txt file
- `POST /api/songs/transcribe-audio` - Transcribe audio file
- `POST /api/songs/transcribe-url` - Transcribe from URL
- `POST /api/songs/{id}/audio` - Upload practice track
- `DELETE /api/songs/{id}/audio` - Delete practice track
- `GET /api/audio/{filename}` - Stream audio file
- `GET/POST /api/setlists` - List/Create setlists
- `GET/PUT/DELETE /api/setlists/{id}` - Setlist CRUD

## Database Schema
```
songs: {
  id, name, artist, key, tempo, duration, 
  notes, lyrics, link, audio_file,
  created_at, updated_at
}

setlists: {
  id, name, song_ids[],
  created_at, updated_at
}
```

## Known Issues
- Lyric Formatter "Chords Inline" mode has a visual bug (chords on new line instead of inline)

## Future/Backlog Tasks
- [ ] MIDI control integration
- [ ] Stage Notes Between Songs (transition notes)
- [ ] Song Tags/Filters
- [ ] Timestamp-Based Auto-Scroll (LRC-style sync)
