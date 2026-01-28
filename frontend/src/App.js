import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import SetListEditor from "./pages/SetListEditor";
import SongEditor from "./pages/SongEditor";
import Teleprompter from "./pages/Teleprompter";
import { Toaster } from "sonner";

function App() {
  return (
    <div className="App">
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/setlist/:id" element={<SetListEditor />} />
          <Route path="/song/:id" element={<SongEditor />} />
          <Route path="/prompter/:setlistId" element={<Teleprompter />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
