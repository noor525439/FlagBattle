import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Mode3 from './components/Mode3'; 
import Mode2 from './components/Mode2';

// Main Menu Component
const MainMenu = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0a0a0a] gap-6 p-6">
      <h1 className="text-white text-3xl font-black italic tracking-tighter mb-8 border-b-4 border-red-600 pb-2">
        GAME MODES
      </h1>

   
      <button 
        onClick={() => navigate('/Mode2')}
        className="w-full bg-zinc-900 border-2 border-zinc-800 hover:border-yellow-500 text-white py-6 rounded-2xl transition-all active:scale-95 group"
      >
        <span className="block text-2xl font-black italic group-hover:text-yellow-500">MODE 1</span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Choas Mode</span>
      </button>

      <button 
        onClick={() => navigate('/Mode3')}
        className="w-full bg-zinc-900 border-2 border-zinc-800 hover:border-red-600 text-white py-6 rounded-2xl transition-all active:scale-95 group"
      >
        <span className="block text-2xl font-black italic group-hover:text-red-600">MODE 2</span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Classic Falg Battle</span>
      </button>

      <p className="text-zinc-600 text-[10px] mt-10 font-bold uppercase tracking-tighter">
        Select a mode to start the stream
      </p>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">

        <div className="relative w-full max-w-[400px] aspect-[9/16] bg-black rounded-lg border- border-zinc-900 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          
          <Routes>
            <Route path="/" element={<MainMenu />} />
            <Route path="/Mode2" element={<Mode2 />} />
            <Route path="Mode3" element={<Mode3 />} /> {/* Yahan aap dusra mode component bhi daal sakte hain */}
          </Routes>

        </div>
      </div>
    </Router>
  );
};

export default App;