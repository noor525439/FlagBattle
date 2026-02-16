import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { RotateCcw, Volume2, VolumeX, LogOut, X, MoreVertical, Globe } from "lucide-react";
import BattleArena from "./BattleArena";
import Leaderboard from "./Leaderboard";
import EndScreen from "./EndScreen";

// --- YAHAN APNA RENDER KA URL DALEN ---
const SOCKET_URL = "https://your-backend-name.onrender.com"; 
const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: true
});

function Mode2() {
  const [snakes, setSnakes] = useState({});
  const [timer, setTimer] = useState(60); // Live stream ke liye 60s behtar hai
  const [active, setActive] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [gameModel, setGameModel] = useState(null); 
  const [comments, setComments] = useState([]); 
  const [isMuted, setIsMuted] = useState(false); 
  
  const winnerAnnounced = useRef(false);
  const lastSnakeAlerted = useRef(false);
  const voiceTimeoutRef = useRef(null);

  const getFlagUrl = (code) => `https://flagcdn.com/w160/${code.toLowerCase()}.png`;

  // --- SOUND & VOICE LOGIC ---
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

  // --- SOCKET DATA HANDLER ---
  const updateSnakeData = useCallback((data) => {
    if (!active) return;
    
    const commentId = Math.random();
    
    // UI par comment dikhane ke liye
    const newComment = { 
      id: commentId, 
      username: data.username,
      text: "joined the battle!", 
      flag: data.countryCode,
      profilePic: data.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`
    };

    setComments(prev => [newComment, ...prev].slice(0, 4)); 
    setTimeout(() => setComments(prev => prev.filter(c => c.id !== commentId)), 4000);

    // Arena mein snake add ya update karne ke liye
    setSnakes((prev) => {
      const existing = prev[data.userId] || { count: 0 };
      return { 
        ...prev, 
        [data.userId]: { ...data, count: existing.count + 1 } 
      };
    });

    playPopSound();
  }, [active, isMuted]);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    socket.on("connect", () => console.log("✅ Connected to Live Server"));
    
    // YouTube se aane wala naya comment
    socket.on("newComment", (data) => {
      updateSnakeData(data);
    });

    return () => {
      socket.off("newComment");
      socket.off("connect");
    };
  }, [updateSnakeData]);

  // --- GAME LOOP & TIMER ---
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
        speak(`The winner is ${finalSnakes[0].username} from ${finalSnakes[0].country || 'their country'}!`);
        winnerAnnounced.current = true;
      }
    }
    return () => clearInterval(countdown);
  }, [active, timer, snakes]);

  const handleRestart = () => {
    setSnakes({});
    setTimer(60);
    setActive(true);
    setComments([]);
    setShowMenu(false);
    winnerAnnounced.current = false;
    socket.emit("restartGame"); // Backend ko batane ke liye
  };

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-900 overflow-hidden font-sans">
      <div className="relative aspect-[9/16] h-[95vh] bg-black shadow-2xl overflow-hidden border-[8px] border-zinc-800 rounded-[3rem]">
        
        {/* Progress Bar (Timer) */}
        {active && (
          <div className="absolute top-0 left-0 w-full h-2 z-[60] bg-white/10">
            <motion.div 
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-600" 
              animate={{ width: `${(timer / 60) * 100}%` }} 
              transition={{ duration: 1, ease: "linear" }}
            />
          </div>
        )}

        {/* UI Controls */}
        <div className="absolute top-8 left-6 right-6 z-[700] flex justify-between items-center">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white">
                <MoreVertical size={20} />
            </button>
            <div className="px-4 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20">
                <span className={`font-mono text-xl font-black ${timer <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timer}s</span>
            </div>
        </div>

        {/* Menu Overlay */}
        <AnimatePresence>
          {showMenu && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 z-[800] flex items-center justify-center">
                <div className="flex flex-col gap-4 w-64">
                    <button onClick={handleRestart} className="flex items-center justify-center gap-3 bg-white text-black p-4 rounded-2xl font-bold"><RotateCcw size={20}/> RESTART</button>
                    <button onClick={() => setIsMuted(!isMuted)} className="flex items-center justify-center gap-3 bg-zinc-800 text-white p-4 rounded-2xl font-bold">{isMuted ? <VolumeX/> : <Volume2/>} {isMuted ? "UNMUTE" : "MUTE"}</button>
                    <button onClick={() => setShowMenu(false)} className="bg-red-500 text-white p-4 rounded-2xl font-bold">CLOSE</button>
                </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Chat Comments */}
        <div className="absolute bottom-32 left-4 z-[400] flex flex-col gap-2 pointer-events-none">
          <AnimatePresence>
            {comments.map((comment) => (
              <motion.div key={comment.id} initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.5 }} className="flex items-center gap-3 bg-black/40 backdrop-blur-sm p-2 rounded-xl border border-white/10">
                <img src={comment.profilePic} className="w-8 h-8 rounded-full border-2 border-cyan-400" alt="" />
                <div>
                    <p className="text-[10px] text-cyan-400 font-bold">@{comment.username}</p>
                    <p className="text-white text-[12px] font-medium">{comment.text}</p>
                </div>
                <img src={getFlagUrl(comment.flag)} className="w-6 h-4 object-cover rounded-sm ml-auto" alt="" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Battle Components */}
        <Leaderboard snakes={snakes} />
        <BattleArena snakes={snakes} setSnakes={setSnakes} active={active} onCollision={() => playPopSound()} />

        {/* End Screen */}
        {!active && (
            <EndScreen 
                winners={Object.values(snakes).sort((a,b) => b.count - a.count).slice(0,3)} 
                onRestart={handleRestart} 
            />
        )}

        {/* Announcements */}
        <AnimatePresence>
            {gameModel && (
                <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="absolute top-1/3 inset-x-0 flex justify-center z-[1000] pointer-events-none">
                    <div className="bg-gradient-to-b from-yellow-400 to-orange-600 p-[2px] rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.5)]">
                        <div className="bg-zinc-900 px-8 py-4 rounded-2xl flex flex-col items-center">
                            <span className="text-yellow-400 font-black tracking-tighter text-sm">BATTLE NOTICE</span>
                            <img src={getFlagUrl(gameModel.code)} className="w-24 h-14 object-cover my-2 rounded-lg" alt="" />
                            <p className="text-white font-bold text-center">{gameModel.text}</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default Mode2;