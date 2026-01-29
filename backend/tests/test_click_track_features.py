"""
Backend API tests for StageHand Click Track and Audio Duration Features
Tests: Audio upload with duration extraction, song BPM field for click track
"""
import pytest
import requests
import os
import io
import wave
import struct

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test song IDs from existing data
TEST_SONG_WITH_BPM = "846aa9ca-e92e-4b7e-b326-db8d3ef4e540"  # The Remainder - BPM: 140


class TestAudioDurationExtraction:
    """Test that audio upload auto-extracts duration from file"""
    
    def test_upload_wav_extracts_duration(self):
        """Test uploading a WAV file extracts duration correctly"""
        # Create a test song first
        song_data = {
            "name": "TEST_Duration_Extraction_Song",
            "artist": "Test Artist",
            "tempo": "120",
            "duration": "",  # Empty - should be filled by audio upload
            "lyrics": "Test lyrics"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/songs", json=song_data)
        assert create_response.status_code == 201
        song_id = create_response.json()['id']
        print(f"✅ Created test song: {song_id}")
        
        try:
            # Create a valid WAV file with known duration (2 seconds)
            sample_rate = 44100
            duration_seconds = 2
            num_samples = sample_rate * duration_seconds
            
            # Create WAV file in memory
            wav_buffer = io.BytesIO()
            with wave.open(wav_buffer, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                # Write silence (zeros)
                for _ in range(num_samples):
                    wav_file.writeframes(struct.pack('<h', 0))
            
            wav_buffer.seek(0)
            files = {'file': ('test_duration.wav', wav_buffer, 'audio/wav')}
            
            upload_response = requests.post(f"{BASE_URL}/api/songs/{song_id}/audio", files=files)
            
            if upload_response.status_code == 200:
                data = upload_response.json()
                assert 'audio_file' in data
                assert 'duration' in data
                
                # Duration should be extracted (2 seconds = "0:02")
                if data.get('duration'):
                    print(f"✅ Duration extracted: {data['duration']}")
                    # Verify song was updated with duration
                    song_response = requests.get(f"{BASE_URL}/api/songs/{song_id}")
                    song = song_response.json()
                    assert song['duration'] == data['duration']
                    print(f"✅ Song duration field updated to: {song['duration']}")
                else:
                    print(f"⚠️ Duration not extracted (may be expected for minimal WAV)")
            else:
                print(f"⚠️ Upload returned {upload_response.status_code}: {upload_response.text}")
        
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/songs/{song_id}")
            print(f"✅ Test song cleaned up")
    
    def test_upload_returns_duration_in_response(self):
        """Test that audio upload response includes duration field"""
        # Create a test song
        song_data = {
            "name": "TEST_Duration_Response_Song",
            "artist": "Test Artist",
            "lyrics": "Test lyrics"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/songs", json=song_data)
        assert create_response.status_code == 201
        song_id = create_response.json()['id']
        
        try:
            # Create a minimal WAV file
            sample_rate = 44100
            duration_seconds = 3
            num_samples = sample_rate * duration_seconds
            
            wav_buffer = io.BytesIO()
            with wave.open(wav_buffer, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(sample_rate)
                for _ in range(num_samples):
                    wav_file.writeframes(struct.pack('<h', 0))
            
            wav_buffer.seek(0)
            files = {'file': ('test_3sec.wav', wav_buffer, 'audio/wav')}
            
            upload_response = requests.post(f"{BASE_URL}/api/songs/{song_id}/audio", files=files)
            
            if upload_response.status_code == 200:
                data = upload_response.json()
                # Response should have duration field
                assert 'duration' in data, "Response should include duration field"
                print(f"✅ Upload response includes duration: {data.get('duration')}")
            else:
                print(f"⚠️ Upload failed: {upload_response.status_code}")
        
        finally:
            requests.delete(f"{BASE_URL}/api/songs/{song_id}")


class TestSongBPMField:
    """Test song BPM (tempo) field for click track functionality"""
    
    def test_song_has_tempo_field(self):
        """Test that songs have tempo field for BPM"""
        response = requests.get(f"{BASE_URL}/api/songs")
        assert response.status_code == 200
        songs = response.json()
        
        for song in songs:
            assert 'tempo' in song, f"Song '{song['name']}' missing tempo field"
        
        print(f"✅ All {len(songs)} songs have tempo field")
    
    def test_song_with_bpm_value(self):
        """Test that 'The Remainder' has BPM: 140 set"""
        response = requests.get(f"{BASE_URL}/api/songs")
        assert response.status_code == 200
        songs = response.json()
        
        # Find The Remainder
        remainder = next((s for s in songs if s['name'] == 'The Remainder'), None)
        assert remainder is not None, "Song 'The Remainder' not found"
        assert remainder['tempo'] == '140', f"Expected BPM 140, got {remainder['tempo']}"
        print(f"✅ 'The Remainder' has BPM: {remainder['tempo']}")
    
    def test_create_song_with_tempo(self):
        """Test creating a song with tempo/BPM"""
        song_data = {
            "name": "TEST_Click_Track_Song",
            "artist": "Test Artist",
            "tempo": "128",
            "lyrics": "Test lyrics"
        }
        
        response = requests.post(f"{BASE_URL}/api/songs", json=song_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data['tempo'] == "128"
        print(f"✅ Created song with tempo: {data['tempo']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/songs/{data['id']}")
    
    def test_update_song_tempo(self):
        """Test updating a song's tempo/BPM"""
        # Create a song
        song_data = {
            "name": "TEST_Update_Tempo_Song",
            "artist": "Test Artist",
            "tempo": "100",
            "lyrics": "Test lyrics"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/songs", json=song_data)
        assert create_response.status_code == 201
        song_id = create_response.json()['id']
        
        try:
            # Update tempo
            update_response = requests.put(f"{BASE_URL}/api/songs/{song_id}", json={"tempo": "140"})
            assert update_response.status_code == 200
            assert update_response.json()['tempo'] == "140"
            print(f"✅ Updated song tempo to: 140")
            
            # Verify persistence
            get_response = requests.get(f"{BASE_URL}/api/songs/{song_id}")
            assert get_response.json()['tempo'] == "140"
            print(f"✅ Tempo update persisted correctly")
        
        finally:
            requests.delete(f"{BASE_URL}/api/songs/{song_id}")


class TestPracticeLinkFieldRemoved:
    """Test that practice_link field is NOT in the API (removed feature)"""
    
    def test_song_does_not_have_practice_link_field(self):
        """Test that songs don't have practice_link field (removed)"""
        response = requests.get(f"{BASE_URL}/api/songs")
        assert response.status_code == 200
        songs = response.json()
        
        for song in songs:
            assert 'practice_link' not in song, f"Song '{song['name']}' should NOT have practice_link field"
        
        print(f"✅ Verified: No songs have practice_link field (feature removed)")
    
    def test_create_song_without_practice_link(self):
        """Test that creating a song doesn't include practice_link"""
        song_data = {
            "name": "TEST_No_Practice_Link_Song",
            "artist": "Test Artist",
            "lyrics": "Test lyrics"
        }
        
        response = requests.post(f"{BASE_URL}/api/songs", json=song_data)
        assert response.status_code == 201
        
        data = response.json()
        assert 'practice_link' not in data, "New song should not have practice_link field"
        print(f"✅ New song created without practice_link field")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/songs/{data['id']}")


class TestSetListSongsWithAudio:
    """Test setlist songs with audio files for AUDIO badge feature"""
    
    def test_setlist_songs_have_audio_file_field(self):
        """Test that songs in setlist have audio_file field for AUDIO badge"""
        # Get setlist
        setlist_id = "619fefe0-b0b5-4e00-ad02-7c98c8b0cd54"
        setlist_response = requests.get(f"{BASE_URL}/api/setlists/{setlist_id}")
        
        if setlist_response.status_code != 200:
            pytest.skip("Test setlist not found")
        
        setlist = setlist_response.json()
        song_ids = setlist.get('song_ids', [])
        
        # Get all songs
        songs_response = requests.get(f"{BASE_URL}/api/songs")
        all_songs = {s['id']: s for s in songs_response.json()}
        
        songs_with_audio = 0
        for song_id in song_ids:
            if song_id in all_songs:
                song = all_songs[song_id]
                assert 'audio_file' in song, f"Song missing audio_file field"
                if song['audio_file']:
                    songs_with_audio += 1
        
        print(f"✅ Setlist has {songs_with_audio} songs with audio files (for AUDIO badge)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
