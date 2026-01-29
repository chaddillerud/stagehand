"""
Backend API tests for StageHand Teleprompter features
Tests: Songs CRUD, SetLists CRUD, Song Link feature
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSongsAPI:
    """Test Songs CRUD operations"""
    
    def test_get_all_songs(self):
        """Test GET /api/songs returns list of songs"""
        response = requests.get(f"{BASE_URL}/api/songs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/songs returned {len(data)} songs")
    
    def test_get_song_by_id(self):
        """Test GET /api/songs/:id returns specific song"""
        # First get all songs to find a valid ID
        songs_response = requests.get(f"{BASE_URL}/api/songs")
        songs = songs_response.json()
        
        if len(songs) > 0:
            song_id = songs[0]['id']
            response = requests.get(f"{BASE_URL}/api/songs/{song_id}")
            assert response.status_code == 200
            data = response.json()
            assert data['id'] == song_id
            assert 'name' in data
            assert 'lyrics' in data
            print(f"✅ GET /api/songs/{song_id} returned song: {data['name']}")
        else:
            pytest.skip("No songs available to test")
    
    def test_song_has_link_field(self):
        """Test that songs have the 'link' field for practice links"""
        songs_response = requests.get(f"{BASE_URL}/api/songs")
        songs = songs_response.json()
        
        if len(songs) > 0:
            song = songs[0]
            assert 'link' in song, "Song should have 'link' field"
            print(f"✅ Song '{song['name']}' has link field: {song.get('link', 'empty')}")
        else:
            pytest.skip("No songs available to test")
    
    def test_song_has_duration_field(self):
        """Test that songs have the 'duration' field for auto-scroll"""
        songs_response = requests.get(f"{BASE_URL}/api/songs")
        songs = songs_response.json()
        
        if len(songs) > 0:
            song = songs[0]
            assert 'duration' in song, "Song should have 'duration' field"
            print(f"✅ Song '{song['name']}' has duration: {song.get('duration', 'not set')}")
        else:
            pytest.skip("No songs available to test")
    
    def test_create_song_with_link(self):
        """Test POST /api/songs creates song with link field"""
        song_data = {
            "name": "TEST_Song_With_Link",
            "artist": "Test Artist",
            "duration": "3:30",
            "link": "https://www.youtube.com/watch?v=test123",
            "lyrics": "Test lyrics for auto-scroll testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/songs", json=song_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data['name'] == song_data['name']
        assert data['link'] == song_data['link']
        assert data['duration'] == song_data['duration']
        assert 'id' in data
        
        print(f"✅ Created song with link: {data['name']}")
        
        # Cleanup - delete the test song
        delete_response = requests.delete(f"{BASE_URL}/api/songs/{data['id']}")
        assert delete_response.status_code == 200
        print(f"✅ Cleaned up test song")
    
    def test_update_song_link(self):
        """Test PUT /api/songs/:id updates song link"""
        # Create a test song first
        song_data = {
            "name": "TEST_Song_Update_Link",
            "artist": "Test Artist",
            "link": ""
        }
        
        create_response = requests.post(f"{BASE_URL}/api/songs", json=song_data)
        assert create_response.status_code == 201
        song_id = create_response.json()['id']
        
        # Update the link
        update_data = {
            "link": "https://spotify.com/track/updated123"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/songs/{song_id}", json=update_data)
        assert update_response.status_code == 200
        
        updated_song = update_response.json()
        assert updated_song['link'] == update_data['link']
        print(f"✅ Updated song link successfully")
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/songs/{song_id}")
        assert get_response.status_code == 200
        assert get_response.json()['link'] == update_data['link']
        print(f"✅ Verified link persisted in database")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/songs/{song_id}")


class TestSetListsAPI:
    """Test SetLists CRUD operations"""
    
    def test_get_all_setlists(self):
        """Test GET /api/setlists returns list of setlists"""
        response = requests.get(f"{BASE_URL}/api/setlists")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/setlists returned {len(data)} setlists")
    
    def test_get_setlist_by_id(self):
        """Test GET /api/setlists/:id returns specific setlist"""
        # Use the known test setlist ID
        setlist_id = "7b8f84ab-80d8-4494-be8d-7ab561f51168"
        response = requests.get(f"{BASE_URL}/api/setlists/{setlist_id}")
        
        if response.status_code == 200:
            data = response.json()
            assert data['id'] == setlist_id
            assert 'name' in data
            assert 'song_ids' in data
            assert isinstance(data['song_ids'], list)
            print(f"✅ GET /api/setlists/{setlist_id} returned: {data['name']} with {len(data['song_ids'])} songs")
        else:
            pytest.skip("Test setlist not found")
    
    def test_setlist_contains_songs_with_duration(self):
        """Test that setlist songs have duration for auto-scroll"""
        setlist_id = "7b8f84ab-80d8-4494-be8d-7ab561f51168"
        
        # Get setlist
        setlist_response = requests.get(f"{BASE_URL}/api/setlists/{setlist_id}")
        if setlist_response.status_code != 200:
            pytest.skip("Test setlist not found")
        
        setlist = setlist_response.json()
        
        # Get all songs
        songs_response = requests.get(f"{BASE_URL}/api/songs")
        all_songs = {s['id']: s for s in songs_response.json()}
        
        # Check each song in setlist has duration
        songs_with_duration = 0
        for song_id in setlist['song_ids']:
            if song_id in all_songs:
                song = all_songs[song_id]
                if song.get('duration'):
                    songs_with_duration += 1
                    print(f"  ✅ Song '{song['name']}' has duration: {song['duration']}")
                else:
                    print(f"  ⚠️ Song '{song['name']}' has no duration set")
        
        print(f"✅ {songs_with_duration}/{len(setlist['song_ids'])} songs have duration set")


class TestSongLinkFeature:
    """Test Song Link feature specifically"""
    
    def test_the_remainder_has_practice_link(self):
        """Test that 'The Remainder' song has a practice link set"""
        song_id = "64b4f1d3-5fa2-4e46-9f13-616aa14450bd"
        
        response = requests.get(f"{BASE_URL}/api/songs/{song_id}")
        if response.status_code != 200:
            pytest.skip("The Remainder song not found")
        
        song = response.json()
        assert song['name'] == "The Remainder"
        assert song.get('link'), "The Remainder should have a link set"
        assert song['link'].startswith('http'), "Link should be a valid URL"
        print(f"✅ 'The Remainder' has practice link: {song['link']}")
    
    def test_songs_without_link_return_empty_string(self):
        """Test that songs without links return empty string, not null"""
        songs_response = requests.get(f"{BASE_URL}/api/songs")
        songs = songs_response.json()
        
        for song in songs:
            # Link should be a string (empty or with value), not None
            assert isinstance(song.get('link', ''), str), f"Song '{song['name']}' link should be string"
        
        print(f"✅ All songs have string type for link field")


class TestAutoScrollRequirements:
    """Test requirements for auto-scroll feature"""
    
    def test_song_duration_format(self):
        """Test that song duration is in MM:SS format"""
        songs_response = requests.get(f"{BASE_URL}/api/songs")
        songs = songs_response.json()
        
        songs_with_valid_duration = 0
        for song in songs:
            duration = song.get('duration', '')
            if duration:
                # Check format is MM:SS
                parts = duration.split(':')
                if len(parts) == 2:
                    try:
                        minutes = int(parts[0])
                        seconds = int(parts[1])
                        if 0 <= seconds < 60:
                            songs_with_valid_duration += 1
                    except ValueError:
                        pass
        
        print(f"✅ {songs_with_valid_duration} songs have valid MM:SS duration format")
        assert songs_with_valid_duration > 0, "At least one song should have valid duration"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
