from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import aiohttp
import tempfile
from emergentintegrations.llm.openai import OpenAISpeechToText


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class Song(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    artist: str = ""
    key: str = ""
    tempo: str = ""
    duration: str = ""
    notes: str = ""
    lyrics: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SongCreate(BaseModel):
    name: str
    artist: Optional[str] = ""
    key: Optional[str] = ""
    tempo: Optional[str] = ""
    duration: Optional[str] = ""
    notes: Optional[str] = ""
    lyrics: Optional[str] = ""

class SongUpdate(BaseModel):
    name: Optional[str] = None
    artist: Optional[str] = None
    key: Optional[str] = None
    tempo: Optional[str] = None
    duration: Optional[str] = None
    notes: Optional[str] = None
    lyrics: Optional[str] = None

class SetList(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    song_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SetListCreate(BaseModel):
    name: str
    song_ids: Optional[List[str]] = []

class SetListUpdate(BaseModel):
    name: Optional[str] = None
    song_ids: Optional[List[str]] = None

class AudioTranscribeRequest(BaseModel):
    url: Optional[str] = None
    song_name: Optional[str] = None
    artist: Optional[str] = None


# Song Routes
@api_router.post("/songs", response_model=Song, status_code=201)
async def create_song(input: SongCreate):
    song_dict = input.model_dump()
    song_obj = Song(**song_dict)
    
    doc = song_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.songs.insert_one(doc)
    return song_obj

@api_router.get("/songs", response_model=List[Song])
async def get_songs():
    songs = await db.songs.find({}, {"_id": 0}).to_list(1000)
    
    for song in songs:
        if isinstance(song['created_at'], str):
            song['created_at'] = datetime.fromisoformat(song['created_at'])
        if isinstance(song['updated_at'], str):
            song['updated_at'] = datetime.fromisoformat(song['updated_at'])
    
    return songs

@api_router.get("/songs/{song_id}", response_model=Song)
async def get_song(song_id: str):
    song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    if isinstance(song['created_at'], str):
        song['created_at'] = datetime.fromisoformat(song['created_at'])
    if isinstance(song['updated_at'], str):
        song['updated_at'] = datetime.fromisoformat(song['updated_at'])
    
    return song

@api_router.put("/songs/{song_id}", response_model=Song)
async def update_song(song_id: str, input: SongUpdate):
    song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.songs.update_one({"id": song_id}, {"$set": update_data})
    
    updated_song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if isinstance(updated_song['created_at'], str):
        updated_song['created_at'] = datetime.fromisoformat(updated_song['created_at'])
    if isinstance(updated_song['updated_at'], str):
        updated_song['updated_at'] = datetime.fromisoformat(updated_song['updated_at'])
    
    return updated_song

@api_router.delete("/songs/{song_id}")
async def delete_song(song_id: str):
    result = await db.songs.delete_one({"id": song_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Remove from all setlists
    await db.setlists.update_many({}, {"$pull": {"song_ids": song_id}})
    
    return {"message": "Song deleted successfully"}

@api_router.post("/songs/import", status_code=201)
async def import_song(file: UploadFile = File(...)):
    if not file.filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="Only .txt files are supported")
    
    content = await file.read()
    text = content.decode('utf-8')
    
    lines = text.strip().split('\n')
    
    # Try to parse first line as "Title - Artist" or just "Title"
    if lines:
        first_line = lines[0].strip()
        if ' - ' in first_line:
            parts = first_line.split(' - ', 1)
            name = parts[0].strip()
            artist = parts[1].strip()
            lyrics = '\n'.join(lines[1:]).strip()
        else:
            name = first_line
            artist = ""
            lyrics = '\n'.join(lines[1:]).strip()
    else:
        raise HTTPException(status_code=400, detail="Empty file")
    
    song_data = SongCreate(name=name, artist=artist, lyrics=lyrics)
    return await create_song(song_data)

@api_router.post("/songs/transcribe-audio", status_code=201)
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio file (.mp3, .wav, etc.) to lyrics using OpenAI Whisper"""
    
    # Validate file type
    allowed_extensions = ['.mp3', '.wav', '.m4a', '.mp4', '.mpeg', '.mpga', '.webm']
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Check file size (25MB limit)
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size: 25MB")
    
    try:
        # Initialize OpenAI STT with Emergent key
        stt = OpenAISpeechToText(api_key=os.getenv("EMERGENT_LLM_KEY"))
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        # Transcribe
        with open(tmp_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="text"
            )
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        # Parse filename for song name (remove extension)
        song_name = os.path.splitext(file.filename)[0]
        
        # Create song with transcribed lyrics
        song_data = SongCreate(
            name=song_name,
            artist="",
            lyrics=response
        )
        
        return await create_song(song_data)
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@api_router.post("/songs/transcribe-url", status_code=201)
async def transcribe_audio_url(request: AudioTranscribeRequest):
    """Download audio from URL and transcribe to lyrics"""
    
    if not request.url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    try:
        # Download audio file
        async with aiohttp.ClientSession() as session:
            async with session.get(request.url) as resp:
                if resp.status != 200:
                    raise HTTPException(status_code=400, detail="Failed to download audio from URL")
                
                content = await resp.read()
                
                # Check file size
                if len(content) > 25 * 1024 * 1024:
                    raise HTTPException(status_code=400, detail="File too large. Maximum size: 25MB")
                
                # Determine file extension from URL or content-type
                content_type = resp.headers.get('content-type', '')
                if 'audio/mpeg' in content_type or 'audio/mp3' in content_type:
                    file_ext = '.mp3'
                elif 'audio/wav' in content_type:
                    file_ext = '.wav'
                elif 'audio/mp4' in content_type:
                    file_ext = '.m4a'
                else:
                    # Try to get from URL
                    url_ext = os.path.splitext(request.url)[1].lower()
                    file_ext = url_ext if url_ext in ['.mp3', '.wav', '.m4a', '.mp4', '.mpeg', '.mpga', '.webm'] else '.mp3'
        
        # Initialize OpenAI STT
        stt = OpenAISpeechToText(api_key=os.getenv("EMERGENT_LLM_KEY"))
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        # Transcribe
        with open(tmp_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="text"
            )
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        # Create song with transcribed lyrics
        song_data = SongCreate(
            name=request.song_name or "Transcribed Song",
            artist=request.artist or "",
            lyrics=response
        )
        
        return await create_song(song_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


# SetList Routes
@api_router.post("/setlists", response_model=SetList, status_code=201)
async def create_setlist(input: SetListCreate):
    setlist_dict = input.model_dump()
    setlist_obj = SetList(**setlist_dict)
    
    doc = setlist_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.setlists.insert_one(doc)
    return setlist_obj

@api_router.get("/setlists", response_model=List[SetList])
async def get_setlists():
    setlists = await db.setlists.find({}, {"_id": 0}).to_list(1000)
    
    for setlist in setlists:
        if isinstance(setlist['created_at'], str):
            setlist['created_at'] = datetime.fromisoformat(setlist['created_at'])
        if isinstance(setlist['updated_at'], str):
            setlist['updated_at'] = datetime.fromisoformat(setlist['updated_at'])
    
    return setlists

@api_router.get("/setlists/{setlist_id}", response_model=SetList)
async def get_setlist(setlist_id: str):
    setlist = await db.setlists.find_one({"id": setlist_id}, {"_id": 0})
    if not setlist:
        raise HTTPException(status_code=404, detail="SetList not found")
    
    if isinstance(setlist['created_at'], str):
        setlist['created_at'] = datetime.fromisoformat(setlist['created_at'])
    if isinstance(setlist['updated_at'], str):
        setlist['updated_at'] = datetime.fromisoformat(setlist['updated_at'])
    
    return setlist

@api_router.put("/setlists/{setlist_id}", response_model=SetList)
async def update_setlist(setlist_id: str, input: SetListUpdate):
    setlist = await db.setlists.find_one({"id": setlist_id}, {"_id": 0})
    if not setlist:
        raise HTTPException(status_code=404, detail="SetList not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.setlists.update_one({"id": setlist_id}, {"$set": update_data})
    
    updated_setlist = await db.setlists.find_one({"id": setlist_id}, {"_id": 0})
    if isinstance(updated_setlist['created_at'], str):
        updated_setlist['created_at'] = datetime.fromisoformat(updated_setlist['created_at'])
    if isinstance(updated_setlist['updated_at'], str):
        updated_setlist['updated_at'] = datetime.fromisoformat(updated_setlist['updated_at'])
    
    return updated_setlist

@api_router.delete("/setlists/{setlist_id}")
async def delete_setlist(setlist_id: str):
    result = await db.setlists.delete_one({"id": setlist_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="SetList not found")
    
    return {"message": "SetList deleted successfully"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
