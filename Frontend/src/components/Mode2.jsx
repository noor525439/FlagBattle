import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { RotateCcw, Volume2, VolumeX, LogOut, X, MoreVertical, Globe } from "lucide-react";
import BattleArena from "./BattleArena";
import Leaderboard from "./Leaderboard";
import EndScreen from "./EndScreen";

const socket = io("http://localhost:5000");

function Mode2() {
  const [snakes, setSnakes] = useState({});
  const [timer, setTimer] = useState(30);
  const [active, setActive] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [gameModel, setGameModel] = useState(null); 
  const [comments, setComments] = useState([]); 
  const [isMuted, setIsMuted] = useState(false); 
  
  const winnerAnnounced = useRef(false);
  const lastSnakeAlerted = useRef(false);
  const voiceTimeoutRef = useRef(null);

  const getFlagUrl = (code) => `https://flagcdn.com/w160/${code.toLowerCase()}.png`;

  // --- SOUND LOGIC ---
  const playPopSound = () => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) { console.log("Audio error"); }
  };


  const speak = (text) => {
    if ('speechSynthesis' in window && !isMuted) {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const triggerModel = useCallback((text, countryCode) => {
    setGameModel({ text, code: countryCode });
    speak(text);
    setTimeout(() => setGameModel(null), 3000);
  }, [isMuted]);

  const onCollision = useCallback(() => {
    if (active) playPopSound();
  }, [active, isMuted]);

  useEffect(() => {
    let countdown;
    if (active && timer > 0) {
      countdown = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer <= 0 && active) {
      setActive(false);
      const finalSnakes = Object.values(snakes).sort((a, b) => (b.count || 0) - (a.count || 0));
      if (finalSnakes.length > 0 && !winnerAnnounced.current) {
        speak(`The winner is ${finalSnakes[0].country}!`);
        winnerAnnounced.current = true;
      }
    }
    return () => clearInterval(countdown);
  }, [active, timer, snakes, isMuted]);

 
  useEffect(() => {
    if (!active) {
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      return;
    }
    
    const uniqueCountries = [...new Set(Object.values(snakes).map(s => s.countryCode))];
    
    if (uniqueCountries.length === 1 && !lastSnakeAlerted.current) {
      lastSnakeAlerted.current = true;
      
      voiceTimeoutRef.current = setTimeout(() => {
        const countryData = Object.values(snakes).find(s => s.countryCode === uniqueCountries[0]);
        if (active && countryData) {
          speak(`Wait! Only ${countryData.country} is left in the arena! Challengers, where are you?`);
        }
      }, 10000); 
    } 
    else if (uniqueCountries.length > 1) {
      lastSnakeAlerted.current = false;
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    }
  }, [snakes, active, isMuted]);


  useEffect(() => {
    if (!active) return;
    if (timer === 25) triggerModel("Type your Country Name in the chat to spawn!", "un");
    if (timer === 12) {
      const topSnakes = Object.values(snakes).sort((a,b) => b.count - a.count);
      if (topSnakes.length > 0) triggerModel(`Support your country ${topSnakes[0].country}!`, topSnakes[0].countryCode);
    }
  }, [timer, active, triggerModel]);

 const updateSnakeData = useCallback((data) => {
  if (!active) return;
  const commentId = Math.random();
  
  const newComment = { 
    id: commentId, 
    username: data.username,
    text: "joined the battle!", 
    flag: data.countryCode,
    profilePic: data.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`
  };

  setComments(prev => [newComment, ...prev].slice(0, 4)); 
  setTimeout(() => setComments(prev => prev.filter(c => c.id !== commentId)), 4000);

  setSnakes((prev) => {
    const existing = prev[data.username] || { count: 0 };
    return { 
      ...prev, 
      [data.username]: { ...data, count: existing.count + 1 } 
    };
  });
}, [active]);

  const handleRestart = () => {
    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    setSnakes({});
    setTimer(30);
    setActive(true);
    setComments([]);
    setShowMenu(false);
    winnerAnnounced.current = false;
    lastSnakeAlerted.current = false;
  };

  const handleExit = () => {
    if(window.confirm("Do you want to exit the game?")) {
        window.location.reload();
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-white overflow-hidden font-sans">
      <div className="relative aspect-[9/16] h-[95vh] bg-white py-6 shadow-[0_0_50px_rgba(0,0,0,0.1)] overflow-hidden">
        <div className="relative w-full h-full bg-[#050505] rounded-3xl overflow-hidden border-4 border-black">
          
          {active && (
            <>
             
              <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5 z-[60]">
                <motion.div 
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" 
                  animate={{ width: `${(timer / 30) * 100}%` }} 
                  transition={{ duration: 1, ease: "linear" }}
                />
              </div>

        
              <div className="absolute top-6 left-6 right-6 z-[700] flex justify-between items-start">
                <div className="relative">
                  <button 
                    onClick={() => setShowMenu(!showMenu)} 
                    className="p-2 opacity-30 text-gray-500 hover:text-white transition-all active:scale-90"
                  >  🌎
                
                  </button>

                  <AnimatePresence>
                    {showMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, y: -10, scale: 0.95 }} 
                        className="absolute top-12 left-0 w-48 bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[800]"
                      >
                        <button onClick={handleRestart} className="w-full px-4 py-3.5 flex items-center gap-3 text-white text-[11px] font-bold hover:bg-white/5 border-b border-white/5 transition-colors group">
                          <RotateCcw size={16} className="text-indigo-400 group-hover:rotate-[-45deg] transition-transform" />
                          <span className="tracking-widest">RESTART GAME</span>
                        </button>
                        <button onClick={() => setIsMuted(!isMuted)} className="w-full px-4 py-3.5 flex items-center gap-3 text-white text-[11px] font-bold hover:bg-white/5 border-b border-white/5 transition-colors">
                          {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-green-400" />}
                          <span className="tracking-widest">{isMuted ? "UNMUTE AUDIO" : "MUTE AUDIO"}</span>
                        </button>
                        <button onClick={handleExit} className="w-full px-4 py-3.5 flex items-center gap-3 text-white text-[11px] font-bold hover:bg-white/5 transition-colors group">
                          <LogOut size={16} className="group-hover:translate-x-1 text-red-500 transition-transform" />
                          <span className="tracking-widest">EXIT ARENA</span>
                        </button>
                   
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="px-3 py-1.5 rounded-2xl border-2 border-white/10 bg-black/60 backdrop-blur-md">
                  <span className={`font-mono text-xl font-black ${timer <= 10 ? 'text-red-500 animate-pulse' : 'text-indigo-400'}`}>{timer}s</span>
                </div>
              </div>

           
              <div className="absolute bottom-6 right-6 z-[300] flex flex-col gap-1.5 items-end">
                <button onClick={() => updateSnakeData({ username: 'PK_PLAYER', country: 'Pakistan', countryCode: 'pk' })} className="px-3 py-1.5 bg-green-600/30 border border-green-500/50 text-[9px] text-white font-black rounded-lg w-24">🇵🇰 PAKISTAN</button>
                <button onClick={() => updateSnakeData({ username: 'IN_PLAYER', country: 'India', countryCode: 'in' })} className="px-3 py-1.5 bg-orange-600/30 border border-orange-500/50 text-[9px] text-white font-black rounded-lg w-24">🇮🇳 INDIA</button>
                <button onClick={() => updateSnakeData({ username: 'BR_PLAYER', country: 'Brazil', countryCode: 'br' })} className="px-3 py-1.5 bg-yellow-600/30 border border-yellow-500/50 text-[9px] text-white font-black rounded-lg w-24">🇧🇷 BRAZIL</button>
              </div>
            </>
          )}
          <div className="absolute bottom-24 left-4 z-[400] flex flex-col gap-3 pointer-events-none">
  <AnimatePresence mode="popLayout">
    {comments.map((comment) => (
      <motion.div 
        key={comment.id} 
        initial={{ opacity: 0, x: -30, scale: 0.8 }} 
        animate={{ opacity: 1, x: 0, scale: 1 }} 
        exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }} 
        className="flex items-center gap-2  max-w-[280px]"
      >
  
        <div className="relative">
          <img 
            src={comment.profilePic} 
            alt="" 
            className="w-8 h-8 rounded-full border border-indigo-500 bg-slate-800 object-cover" 
          />
        
        </div>
        <div className="flex flex-col">
          <span className="text-indigo-400 font-black text-[10px] leading-tight">
            @{comment.username.toLowerCase()}
          </span>
          <span className="text-white font-bold text-[11px] leading-tight line-clamp-1">
            {comment.text}
          </span>
        </div>
      </motion.div>
    ))}
  </AnimatePresence>
</div>

      
          <AnimatePresence>
            {gameModel && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute inset-0 z-[1000] flex items-center justify-center px-8 pointer-events-none">
                <div className="bg-[#0a0f1e] rounded-[5px] border-[2px] border-[#f0b429] px-8 py-1 flex flex-col items-center shadow-[0_0_50px_rgba(240,180,41,0.3)]">
                  <h2 className="text-white font-black text-lg mb-2">🚀 BATTLE ALERT</h2>
                  <img src={getFlagUrl(gameModel.code || 'pk')} alt="" className="w-40 h-20 object-cover rounded-sm mb-4 shadow-lg" />
                  <p className="text-[#f0b429] font-semibold text-center text-sm">{gameModel.text}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Leaderboard snakes={snakes} />
          <BattleArena snakes={snakes} setSnakes={setSnakes} active={active} onCollision={onCollision} />

          {!active && <EndScreen winners={Object.values(snakes).sort((a,b)=>b.count-a.count).slice(0,3)} onRestart={handleRestart} />}
        </div>
      </div>
    </div>
  );
}

export default Mode2;