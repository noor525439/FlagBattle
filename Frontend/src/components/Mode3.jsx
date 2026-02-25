import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Volume2, VolumeX } from 'lucide-react';
import video from "../assets/video.mp4"
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";


countries.registerLocale(enLocale);
const socket = io('https://flagbattle-mvv4.onrender.com');
window.socket = socket;

const countryNames = {
    "PK": "Pakistan", "IN": "India", "US": "United States", "BR": "Brazil", 
    "TR": "Turkey"
};

const Mode3 = () => {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const flagsRef = useRef({});
    const speedRef = useRef(1);
    const audioMutedRef = useRef(false);

    const famousCountries = ["Pakistan", "India", "USA", "Brazil", "Turkey", "Japan"];
    const [displayText, setDisplayText] = useState("");
    const [countryIndex, setCountryIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [typingSpeed, setTypingSpeed] = useState(150);

    const [winner, setWinner] = useState(null);
    const [gameState, setGameState] = useState('COUNTDOWN'); 
    const [countdown, setCountdown] = useState(3); 
    const [comments, setComments] = useState([]);
    const [showBombWarning, setShowBombWarning] = useState(false);
    const [bomberName, setBomberName] = useState("");
    const [isShaking, setIsShaking] = useState(false);
    

    const [topLives, setTopLives] = useState([]);

    const [showMenu, setShowMenu] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [gameSpeed, setGameSpeed] = useState(1);

    const width = 390;
    const height = 550;
    const FLAG_RADIUS = 18;
    const CENTER_X = width / 2;
    const CENTER_Y = height / 2;
    const ARENA_RADIUS = 140; 
    const audioCtx = useRef(null);
    const soundBuffers = useRef({});

const getAudioContext = useCallback(() => {
    if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.current.state === 'suspended') {
        audioCtx.current.resume();
    }
    return audioCtx.current;
}, []);
    const getFullCountryName = (code) => {
    if (!code) return "Unknown";
 
    return countries.getName(code.toUpperCase(), "en") || code;
};

const playHitSound = useCallback(() => {
  if (isMuted) return;
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();

    if (context.state === 'suspended') {
      context.resume();
    }

    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = "sine"; 
    osc.frequency.setValueAtTime(800, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, context.currentTime + 0.05);

    gain.gain.setValueAtTime(0.05, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start();
    osc.stop(context.currentTime + 0.05);
  } catch (e) { console.log("Audio error", e); }
}, [isMuted]);

const playExplosionSound = useCallback(() => {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
 
    const bufferSize = ctx.sampleRate * 1.5; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

   
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, ctx.currentTime); 
    filter.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1.0);  

   
    const gainNode = ctx.createGain();
 
    gainNode.gain.setValueAtTime(0.8, ctx.currentTime); 
 
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start();
    noise.stop(ctx.currentTime + 1.5);

    
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.2);
    
    oscGain.gain.setValueAtTime(0.5, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);

  } catch (e) { console.log("Explosion audio error", e); }
}, [isMuted, getAudioContext]);

    useEffect(() => {
        const handleTyping = () => {
            const currentCountry = famousCountries[countryIndex];
            if (isDeleting) {
                setDisplayText(currentCountry.substring(0, displayText.length - 1));
                setTypingSpeed(50);
            } else {
                setDisplayText(currentCountry.substring(0, displayText.length + 1));
                setTypingSpeed(150);
            }

            if (!isDeleting && displayText === currentCountry) {
                setTimeout(() => setIsDeleting(true), 1500);
            } else if (isDeleting && displayText === "") {
                setIsDeleting(false);
                setCountryIndex((prev) => (prev + 1) % famousCountries.length);
            }
        };
        const timer = setTimeout(handleTyping, typingSpeed);
        return () => clearTimeout(timer);
    }, [displayText, isDeleting, countryIndex, typingSpeed]);

    useEffect(() => { speedRef.current = gameSpeed; }, [gameSpeed]);
    useEffect(() => { audioMutedRef.current = isMuted; }, [isMuted]);

    
const playSound = useCallback((name) => {
    if (isMuted) return; 
    if (name === 'hit') {
        playHitSound();
    } else if (name === 'bomb') {
        playExplosionSound();
    }
}, [isMuted, playHitSound, playExplosionSound]);

useEffect(() => {
    if (gameState === 'COUNTDOWN' && countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    } else if (countdown === 0) {
        setGameState('BATTLE');
    }
}, [countdown, gameState]);

const triggerBomb = useCallback((userName = "System") => {
    setBomberName(userName);
    setShowBombWarning(true);

  
    setTimeout(() => {
        playSound('bomb');
        setIsShaking(true); 
        
        Object.values(flagsRef.current).forEach(f => {
            f.hp -= 30;
            f.vx *= 1.4; f.vy *= 1.4;
        });
        
        setShowBombWarning(false);
        
  
        setTimeout(() => setIsShaking(false), 500);
    }, 1000);
}, [playSound]);


    window.triggerBomb = triggerBomb;

    const resetGame = useCallback(() => {
        flagsRef.current = {};
        const autoFlags = ['PK', 'IN', 'US', 'GB', 'BR', 'TR', 'AE', 'SA', 'JP', 'DE'];
        autoFlags.forEach(c => {
            flagsRef.current[c] = {
                id: c, x: Math.random() * (width - 60) + 30, y: Math.random() * (height - 60) + 30,
                vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                hp: 100, rotation: 0, radius: FLAG_RADIUS,
                img: `https://flagcdn.com/w80/${c.toLowerCase()}.png`
            };
        });
        setWinner(null); setGameState('COUNTDOWN'); setCountdown(3);
        setShowMenu(false);
    }, []);

const handleAction = useCallback((data) => {
    const user = data.user || 'Guest';
    const commentText = (data.comment || "").toLowerCase();
    let code = data.countryCode?.toUpperCase();
    const profile = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user}`;
    const newCommentId = Math.random();


    const fullName = getFullCountryName(code);

    setComments(prev => [
        { 
            id: newCommentId, 
            user, 
            text: data.comment || `Joined ${fullName}`,
            profile 
        }, 
        ...prev
    ].slice(0, 4));

    setTimeout(() => {
        setComments(prev => prev.filter(c => c.id !== newCommentId));
    }, 5000);



    if (commentText === 'bomb') {
        triggerBomb(user);
    } 
   
    else if (code) {
 
        if (countries.isValid(code)) { 
            if (flagsRef.current[code]) {
              
                flagsRef.current[code].hp = Math.min(flagsRef.current[code].hp + 30, 100);
            } else if (Object.keys(flagsRef.current).length < 25) {
             
                flagsRef.current[code] = {
                    id: code, 
                    x: Math.random() * (width - 60) + 30, 
                    y: Math.random() * (height - 60) + 30,
                    vx: (Math.random() - 0.5) * 8, 
                    vy: (Math.random() - 0.5) * 8,
                    hp: 100, 
                    rotation: Math.random() * Math.PI * 2, 
                    radius: FLAG_RADIUS,
                    img: `https://flagcdn.com/w80/${code.toLowerCase()}.png`
                };
            }
        }
    }
}, [triggerBomb, width, height, FLAG_RADIUS]);
window.handleAction = handleAction;

useEffect(() => {
    resetGame(); 
    socket.on('action:country', handleAction);
    return () => socket.off('action:country');
}, []);

const announceWinner = useCallback((countryName) => {
        if (isMuted) return;

    
        window.speechSynthesis.cancel();

        const message = new SpeechSynthesisUtterance();
        message.text = `Victory! ${countryName} is the winner!`;
        message.pitch = 1;
        message.rate = 0.9; 
        message.volume = 1;

   
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {

            message.voice = voices[0]; 
        }

        window.speechSynthesis.speak(message);
    }, [isMuted]);


    useEffect(() => {
        if (winner) {
            const countryName = getFullCountryName(winner.id);
            announceWinner(countryName);
        }
    }, [winner, announceWinner]);


    useEffect(() => {
        let frame;
        const update = () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);
            if (winner) return;
            const keys = Object.keys(flagsRef.current);

            const sorted = keys
                .map(id => flagsRef.current[id])
                .sort((a, b) => b.hp - a.hp)
                .slice(0, 3);
            setTopLives(sorted);

            const isCircleActive = keys.length <= 3 && keys.length > 0;
            if (isCircleActive) {
                ctx.beginPath(); ctx.arc(CENTER_X, CENTER_Y, ARENA_RADIUS, 0, Math.PI * 2);
                ctx.strokeStyle = 'red'; ctx.lineWidth = 4; ctx.stroke();
            }
            if (keys.length === 1 && gameState === 'BATTLE') {
                setWinner(flagsRef.current[keys[0]]);
                setTimeout(resetGame, 3000);
                return;
            }
            keys.forEach((id, index) => {
                const f = flagsRef.current[id];
                if (!f) return;
                if (gameState === 'BATTLE') {
                    f.x += (f.vx * speedRef.current); f.y += (f.vy * speedRef.current);
                    if (isCircleActive) {
                        const dx = f.x - CENTER_X; const dy = f.y - CENTER_Y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist > ARENA_RADIUS - f.radius) {
                            const angle = Math.atan2(dy, dx);
                            f.vx = -Math.cos(angle) * Math.abs(f.vx);
                            f.vy = -Math.sin(angle) * Math.abs(f.vy);
                            f.x = CENTER_X + (ARENA_RADIUS - f.radius) * Math.cos(angle);
                            f.y = CENTER_Y + (ARENA_RADIUS - f.radius) * Math.sin(angle);
                        }
                    } else {
                        if (f.x < f.radius || f.x > width - f.radius) f.vx *= -1;
                        if (f.y < f.radius || f.y > height - f.radius) f.vy *= -1;
                    }
                }

for (let j = index + 1; j < keys.length; j++) {
    const o = flagsRef.current[keys[j]];
    if (!o) continue;
    
    const dx = o.x - f.x;
    const dy = o.y - f.y;
    const distance = Math.hypot(dx, dy);
    const minDistance = f.radius + o.radius;

    if (distance < minDistance) {
        playSound('hit');

        
        const overlap = minDistance - distance;
        const nx = dx / distance;
        const ny = dy / distance;
        f.x -= nx * (overlap / 2);
        f.y -= ny * (overlap / 2);
        o.x += nx * (overlap / 2);
        o.y += ny * (overlap / 2);


        [f.vx, o.vx] = [o.vx, f.vx]; 
        [f.vy, o.vy] = [o.vy, f.vy];
        
        f.hp -= 15; o.hp -= 15;
    }
}
                f.rotation += 0.15;
                ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rotation);
                ctx.fillStyle = '#fff'; ctx.fillRect(10, -1.5, 25, 3); ctx.restore();
                ctx.save(); ctx.beginPath(); ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2); ctx.clip();
                const img = new Image(); img.src = f.img;
                ctx.drawImage(img, f.x - f.radius, f.y - f.radius, f.radius * 2, f.radius * 2); ctx.restore();
                ctx.fillStyle = f.hp > 50 ? '#22c55e' : '#ef4444';
                ctx.fillRect(f.x - 15, f.y - 25, (Math.max(0, Math.min(f.hp, 100)) / 100) * 30, 3);
                ctx.fillStyle = "white"; ctx.font = "bold 10px Arial"; ctx.textAlign = "center";
                const displayName = getFullCountryName(f.id);
ctx.fillText(displayName, f.x, f.y + 35);
                if (f.hp <= 0) delete flagsRef.current[id];
            });
            frame = requestAnimationFrame(update);
        };
        update();
        return () => cancelAnimationFrame(frame);
    }, [gameState, winner, resetGame, playSound]);

    return (
       <div className="flex items-center justify-center min-h-screen bg-black text-slate-200">
    <div className="flex flex-col items-center">
 
        <div className="flex items-center gap-1 mb-2 w-full max-w-[400px] shadow-2xl">
           
            <div className="w-[140px] h-24 relative overflow-hidden rounded-xl border border-white/10 flex-shrink-0">
                <video autoPlay loop muted playsInline className="w-full h-full object-cover scale-[1.6]">
                    <source src={video} type="video/mp4" />
                </video>
            </div>
            
   
            <div className="flex-1 flex flex-col justify-center pl-4">
                <h3 className="text-white text-lg font-black tracking-tighter uppercase italic leading-none">
                    <span className="text-white">{displayText}</span>
                    <span className="animate-pulse border-white"></span>
                </h3>
            </div>

            <div className="flex flex-col gap-2 min-w-[100px]">
                <span className="text-zinc-500 text-[1px] uppercase font-black mb-1 text-center">Top Countries</span>
                {topLives.map((flag) => (
                    <div key={flag.id} className="flex items-center gap-3 bg-black/60 px-2 py-1 rounded-md border border-white/5">
                        <img src={flag.img} className="w-6 h-4 rounded-sm shadow-md" alt="" />
                        <span className={`text-[11px] font-black ${flag.hp > 50 ? 'text-white' : 'text-white'}`}>
                            {Math.max(0, Math.floor(flag.hp))}%
                        </span>
                    </div>
                ))}
            </div>
        </div>

     
        <div className="w-full max-w-[500px] overflow-hidden mb-2">
            <p className="whitespace-nowrap animate-marquee text-yellow-500 font-bold text-lg uppercase italic">
                DROP A BOMB BY TYPING BOMB   |    <span>   CHAT COUNTRY NAME TO HEAL</span>
            </p>
        </div>
        <h2 className="text-red-600 font-black text-lg mb-4 tracking-wider uppercase">
            BOMB READY: <span className="text-red-600">TYPE BOMB TO DROP!</span>
        </h2>

 
        <motion.div 
            className="relative border-2 border-zinc-800 rounded-lg bg-black overflow-hidden shadow-2xl" 
            style={{ width, height }}
            animate={isShaking ? {
                x: [0, -10, 10, -10, 10, 0],
                y: [0, 5, -5, 5, -5, 0],
            } : { x: 0, y: 0 }}
            transition={{ duration: 0.4 }}
        >
     
            <AnimatePresence>
                {showBombWarning && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[1000] flex flex-col items-center justify-center backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-center"
                        >
                            <h2 className="text-red-500 text-7xl font-black tracking-tighter mb-2">BOMB!</h2>
                            <p className="text-white font-bold uppercase tracking-widest text-sm bg-black/40 px-4 py-1 rounded-full">
                               
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

       
            {gameState === 'COUNTDOWN' && (
                <div className="absolute inset-0 z-[900] flex items-center justify-center bg-black/60">
                    <h1 className="text-white text-9xl font-black italic">{countdown}</h1>
                </div>
            )}

            <div className="absolute top-6 left-6 right-6 z-[700] flex justify-between items-start">
                <div className="relative">
                    <button onClick={() => setShowMenu(!showMenu)} className="p-2 opacity-10 text-gray-500 hover:text-white transition-all active:scale-90"> 🌎 </button>
                    <AnimatePresence>
                        {showMenu && (
                            <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute top-12 left-0 w-48 bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[800]">
                                <button onClick={resetGame} className="w-full px-4 py-3.5 flex items-center gap-3 text-white text-[11px] font-bold hover:bg-white/5 border-b border-white/5 transition-colors group">
                                    <RotateCcw size={16} className="text-indigo-400 group-hover:rotate-[-45deg] transition-transform" />
                                    <span className="tracking-widest">RESTART GAME</span>
                                </button>
                                <button onClick={() => setIsMuted(!isMuted)} className="w-full px-4 py-3.5 flex items-center gap-3 text-white text-[11px] font-bold hover:bg-white/5 border-b border-white/5 transition-colors">
                                    {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-green-400" />}
                                    <span className="tracking-widest">{isMuted ? "UNMUTE" : "MUTE"}</span>
                                </button>
                                
                                <div className="px-4 py-3 border-t border-white/5 bg-white/5">
                                    <div className="flex justify-between text-[9px] text-zinc-500 font-black mb-2 uppercase">
                                        <span>Speed</span>
                                        <span className="text-yellow-500">{gameSpeed}x</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0.5" 
                                        max="3" 
                                        step="0.1" 
                                        value={gameSpeed} 
                                        onChange={(e) => setGameSpeed(parseFloat(e.target.value))} 
                                        className="w-full accent-white h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer mb-4" 
                                    />
                                    <button 
                                        onClick={() => navigate('/')} 
                                        className="w-full py-3 flex items-center gap-3 text-white text-[11px] font-bold hover:bg-red-500/10 transition-colors group border-t border-white/5 mt-2"
                                    >
                                        <LogOut size={16} className="group-hover:translate-x-1 text-red-500 transition-transform" />
                                        <span className="tracking-widest">EXIT ARENA</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="absolute bottom-6 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence initial={false}>
                    {comments.map((comment) => (
                        <motion.div key={comment.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} className="flex items-center gap-2 w-fit max-w-full shadow-lg">
                            <img src={comment.profile} className="w-6 h-6 rounded-full border border-white/10" alt="" />
                            <div className="flex flex-row gap-2">
                                <div className="text-[12px] font-black text-white leading-none">{comment.user}</div>
                                <div className="text-[12px] text-white ">{comment.text}</div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <canvas ref={canvasRef} width={width} height={height} className="bg-[#050505]" />

            {winner && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[150] animate-in zoom-in duration-500">
                    <h1 className="text-white text-5xl font-black uppercase mb-2">VICTORY</h1>
                    <img src={winner.img} className="w-56 h-32 border-black mb-4 shadow-[0_0_50px_rgba(255,255,255,0.2)]" alt="winner" />
                    <h2 className="text-white text-3xl text-center font-bold uppercase tracking-widest">
                        {getFullCountryName(winner.id)}
                    </h2>
                    <p className="text-yellow-500 mt-4 animate-bounce font-bold">CHAMPION!</p>
                </div>
            )}
        </motion.div>
    </div>

    <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .animate-marquee { display: inline-block; animation: marquee 10s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
    ` }} />
</div>
    );
};

export default Mode3;