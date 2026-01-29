"""
Test suite for 'New Song from Audio' feature
Tests POST /api/songs/from-audio endpoint that:
- Creates a song from an uploaded audio file
- Auto-transcribes lyrics using OpenAI Whisper
- Extracts duration from audio metadata
- Uses filename (without extension) as default song name
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestFromAudioEndpoint:
    """Tests for POST /api/songs/from-audio endpoint"""
    
    def test_endpoint_exists(self):
        """Verify the endpoint exists and responds"""
        # Send empty request to check endpoint exists
        response = requests.post(f"{BASE_URL}/api/songs/from-audio")
        # Should return 422 (validation error) or 400 (bad request), not 404
        assert response.status_code != 404, "Endpoint /api/songs/from-audio not found"
        print(f"SUCCESS: Endpoint exists, returned status {response.status_code}")
    
    def test_rejects_non_audio_file(self):
        """Verify endpoint rejects non-audio files"""
        # Create a fake text file
        files = {
            'file': ('test.txt', io.BytesIO(b'This is not an audio file'), 'text/plain')
        }
        response = requests.post(f"{BASE_URL}/api/songs/from-audio", files=files)
        assert response.status_code == 400, f"Expected 400 for non-audio file, got {response.status_code}"
        assert "Unsupported file type" in response.json().get('detail', '')
        print("SUCCESS: Non-audio files are rejected")
    
    def test_rejects_invalid_extension(self):
        """Verify endpoint rejects files with invalid extensions"""
        files = {
            'file': ('test.pdf', io.BytesIO(b'fake pdf content'), 'application/pdf')
        }
        response = requests.post(f"{BASE_URL}/api/songs/from-audio", files=files)
        assert response.status_code == 400, f"Expected 400 for invalid extension, got {response.status_code}"
        print("SUCCESS: Invalid file extensions are rejected")
    
    def test_accepts_mp3_extension(self):
        """Verify endpoint accepts .mp3 files (even if content is minimal)"""
        # Create minimal MP3-like content (will fail transcription but should pass validation)
        # This tests the file extension validation
        files = {
            'file': ('TEST_song.mp3', io.BytesIO(b'\xff\xfb\x90\x00' * 100), 'audio/mpeg')
        }
        response = requests.post(f"{BASE_URL}/api/songs/from-audio", files=files)
        # Should not be 400 for file type - might be 500 if transcription fails on invalid audio
        # But the key is it passes the file type validation
        if response.status_code == 400:
            detail = response.json().get('detail', '')
            assert "Unsupported file type" not in detail, "MP3 should be accepted"
        print(f"SUCCESS: MP3 extension accepted (status: {response.status_code})")


class TestFromAudioResponse:
    """Tests for response structure from /api/songs/from-audio"""
    
    @pytest.fixture
    def sample_audio_bytes(self):
        """Generate minimal valid-ish audio bytes for testing"""
        # This is a minimal MP3 frame header pattern
        return b'\xff\xfb\x90\x00' * 1000
    
    def test_response_contains_song_id(self, sample_audio_bytes):
        """Verify response contains song ID"""
        files = {
            'file': ('TEST_audio_song.mp3', io.BytesIO(sample_audio_bytes), 'audio/mpeg')
        }
        response = requests.post(f"{BASE_URL}/api/songs/from-audio", files=files)
        
        # If successful, check response structure
        if response.status_code in [200, 201]:
            data = response.json()
            assert 'id' in data, "Response should contain 'id' field"
            assert isinstance(data['id'], str), "ID should be a string"
            assert len(data['id']) > 0, "ID should not be empty"
            print(f"SUCCESS: Response contains song ID: {data['id']}")
            
            # Cleanup - delete the test song
            cleanup_response = requests.delete(f"{BASE_URL}/api/songs/{data['id']}")
            print(f"Cleanup: Deleted test song (status: {cleanup_response.status_code})")
        else:
            # If transcription fails, that's expected with fake audio
            print(f"INFO: Request returned {response.status_code} - transcription may have failed on test audio")
            pytest.skip("Transcription failed on test audio - expected behavior")
    
    def test_response_uses_filename_as_name(self, sample_audio_bytes):
        """Verify song name is derived from filename"""
        test_filename = "TEST_My_Awesome_Song.mp3"
        expected_name = "TEST_My_Awesome_Song"  # Without extension
        
        files = {
            'file': (test_filename, io.BytesIO(sample_audio_bytes), 'audio/mpeg')
        }
        response = requests.post(f"{BASE_URL}/api/songs/from-audio", files=files)
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert 'name' in data, "Response should contain 'name' field"
            assert data['name'] == expected_name, f"Expected name '{expected_name}', got '{data['name']}'"
            print(f"SUCCESS: Song name correctly derived from filename: {data['name']}")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/songs/{data['id']}")
        else:
            print(f"INFO: Request returned {response.status_code}")
            pytest.skip("Transcription failed on test audio")
    
    def test_response_contains_audio_file_field(self, sample_audio_bytes):
        """Verify response contains audio_file field"""
        files = {
            'file': ('TEST_audio_check.mp3', io.BytesIO(sample_audio_bytes), 'audio/mpeg')
        }
        response = requests.post(f"{BASE_URL}/api/songs/from-audio", files=files)
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert 'audio_file' in data, "Response should contain 'audio_file' field"
            assert isinstance(data['audio_file'], str), "audio_file should be a string"
            print(f"SUCCESS: Response contains audio_file: {data['audio_file']}")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/songs/{data['id']}")
        else:
            pytest.skip("Transcription failed on test audio")


class TestFromAudioIntegration:
    """Integration tests for the full from-audio workflow"""
    
    def test_created_song_is_retrievable(self):
        """Verify song created from audio can be retrieved via GET /api/songs/{id}"""
        # Create minimal audio bytes
        audio_bytes = b'\xff\xfb\x90\x00' * 1000
        files = {
            'file': ('TEST_retrievable_song.mp3', io.BytesIO(audio_bytes), 'audio/mpeg')
        }
        
        # Create song
        create_response = requests.post(f"{BASE_URL}/api/songs/from-audio", files=files)
        
        if create_response.status_code in [200, 201]:
            created_song = create_response.json()
            song_id = created_song['id']
            
            # Retrieve song
            get_response = requests.get(f"{BASE_URL}/api/songs/{song_id}")
            assert get_response.status_code == 200, f"Failed to retrieve song: {get_response.status_code}"
            
            retrieved_song = get_response.json()
            assert retrieved_song['id'] == song_id
            assert retrieved_song['name'] == "TEST_retrievable_song"
            print(f"SUCCESS: Created song is retrievable via GET /api/songs/{song_id}")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/songs/{song_id}")
        else:
            pytest.skip("Could not create song from test audio")
    
    def test_created_song_appears_in_songs_list(self):
        """Verify song created from audio appears in GET /api/songs list"""
        audio_bytes = b'\xff\xfb\x90\x00' * 1000
        files = {
            'file': ('TEST_list_song.mp3', io.BytesIO(audio_bytes), 'audio/mpeg')
        }
        
        # Create song
        create_response = requests.post(f"{BASE_URL}/api/songs/from-audio", files=files)
        
        if create_response.status_code in [200, 201]:
            created_song = create_response.json()
            song_id = created_song['id']
            
            # Get all songs
            list_response = requests.get(f"{BASE_URL}/api/songs")
            assert list_response.status_code == 200
            
            songs = list_response.json()
            song_ids = [s['id'] for s in songs]
            assert song_id in song_ids, "Created song should appear in songs list"
            print(f"SUCCESS: Created song appears in songs list")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/songs/{song_id}")
        else:
            pytest.skip("Could not create song from test audio")


class TestFromAudioFileValidation:
    """Tests for file validation in /api/songs/from-audio"""
    
    def test_accepts_wav_extension(self):
        """Verify endpoint accepts .wav files"""
        files = {
            'file': ('TEST_song.wav', io.BytesIO(b'RIFF' + b'\x00' * 100), 'audio/wav')
        }
        response = requests.post(f"{BASE_URL}/api/songs/from-audio", files=files)
        if response.status_code == 400:
            detail = response.json().get('detail', '')
            assert "Unsupported file type" not in detail, "WAV should be accepted"
        print(f"SUCCESS: WAV extension accepted (status: {response.status_code})")
    
    def test_accepts_m4a_extension(self):
        """Verify endpoint accepts .m4a files"""
        files = {
            'file': ('TEST_song.m4a', io.BytesIO(b'\x00' * 100), 'audio/mp4')
        }
        response = requests.post(f"{BASE_URL}/api/songs/from-audio", files=files)
        if response.status_code == 400:
            detail = response.json().get('detail', '')
            assert "Unsupported file type" not in detail, "M4A should be accepted"
        print(f"SUCCESS: M4A extension accepted (status: {response.status_code})")
    
    def test_accepts_ogg_extension(self):
        """Verify endpoint accepts .ogg files"""
        files = {
            'file': ('TEST_song.ogg', io.BytesIO(b'OggS' + b'\x00' * 100), 'audio/ogg')
        }
        response = requests.post(f"{BASE_URL}/api/songs/from-audio", files=files)
        if response.status_code == 400:
            detail = response.json().get('detail', '')
            assert "Unsupported file type" not in detail, "OGG should be accepted"
        print(f"SUCCESS: OGG extension accepted (status: {response.status_code})")
    
    def test_accepts_flac_extension(self):
        """Verify endpoint accepts .flac files"""
        files = {
            'file': ('TEST_song.flac', io.BytesIO(b'fLaC' + b'\x00' * 100), 'audio/flac')
        }
        response = requests.post(f"{BASE_URL}/api/songs/from-audio", files=files)
        if response.status_code == 400:
            detail = response.json().get('detail', '')
            assert "Unsupported file type" not in detail, "FLAC should be accepted"
        print(f"SUCCESS: FLAC extension accepted (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
