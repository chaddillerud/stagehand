import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PrintSetlist() {
  const { id } = useParams();
  const [setlist, setSetlist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSetList();
  }, [id]);

  const loadSetList = async () => {
    try {
      const [setlistRes, allSongsRes] = await Promise.all([
        axios.get(`${API}/setlists/${id}`),
        axios.get(`${API}/songs`)
      ]);
      
      setSetlist(setlistRes.data);
      const allSongs = allSongsRes.data;

      // Load songs in order
      const orderedSongs = [];
      for (const songId of setlistRes.data.song_ids) {
        const song = allSongs.find(s => s.id === songId);
        if (song) orderedSongs.push(song);
      }
      setSongs(orderedSongs);
      setLoading(false);

      // Auto-print after load
      setTimeout(() => {
        window.print();
      }, 500);
    } catch (error) {
      console.error("Error loading set list:", error);
      setLoading(false);
    }
  };

  const calculateTotalTime = () => {
    let totalSeconds = 0;
    songs.forEach(song => {
      if (song.duration) {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="print-container">
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 20px;
            font-family: 'Arial', sans-serif;
            color: #000;
            background: #fff;
          }
          
          .print-container {
            max-width: 100%;
          }
          
          .no-print {
            display: none !important;
          }
          
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
        
        @media screen {
          body {
            background: #f5f5f5;
          }
          
          .print-container {
            max-width: 8.5in;
            margin: 20px auto;
            padding: 40px;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #000;
          padding-bottom: 20px;
        }
        
        .header h1 {
          font-size: 32px;
          font-weight: bold;
          margin: 0 0 10px 0;
          text-transform: uppercase;
        }
        
        .header .meta {
          font-size: 14px;
          color: #666;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        
        th {
          background: #f0f0f0;
          font-weight: bold;
          text-align: left;
          padding: 10px;
          border: 1px solid #ddd;
          font-size: 12px;
          text-transform: uppercase;
        }
        
        td {
          padding: 10px;
          border: 1px solid #ddd;
          font-size: 14px;
        }
        
        tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        .song-number {
          font-weight: bold;
          text-align: center;
        }
        
        .song-name {
          font-weight: bold;
        }
        
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #ddd;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        
        .print-button {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 24px;
          background: #facc15;
          color: #000;
          border: none;
          border-radius: 4px;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
          text-transform: uppercase;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .print-button:hover {
          background: #eab308;
        }
      `}</style>

      <button className="print-button no-print" onClick={() => window.print()}>
        🖨️ Print
      </button>

      <div className="header">
        <h1>{setlist.name}</h1>
        <div className="meta">
          {songs.length} Songs • Total Time: {calculateTotalTime()} • Generated: {new Date().toLocaleDateString()}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style={{width: '40px'}}>#</th>
            <th>Song Title</th>
            <th>Artist</th>
            <th style={{width: '60px'}}>Key</th>
            <th style={{width: '70px'}}>Tempo</th>
            <th style={{width: '70px'}}>Duration</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {songs.map((song, index) => (
            <tr key={song.id}>
              <td className="song-number">{index + 1}</td>
              <td className="song-name">{song.name}</td>
              <td>{song.artist || '—'}</td>
              <td style={{textAlign: 'center'}}>{song.key || '—'}</td>
              <td style={{textAlign: 'center'}}>{song.tempo || '—'}</td>
              <td style={{textAlign: 'center'}}>{song.duration || '—'}</td>
              <td style={{fontSize: '12px'}}>{song.notes || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="footer">
        <p>StageHand • Set List & Lyric Teleprompter</p>
        <p>Keep this handy as a backup during your performance!</p>
      </div>
    </div>
  );
}
