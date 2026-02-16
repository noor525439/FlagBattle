import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const WinnerCard = ({ rank, data, color }) => {
  if (!data) return null;

  const medalIcon = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.2 }}
      className={`relative w-full p-4 rounded-2xl border-2 flex flex-col items-center gap-3 bg-[#0d1117]`}
      style={{ borderColor: color }}
    >
      <div className="absolute -top-4 bg-[#0d1117] px-2 text-xl">{medalIcon}</div>

      <div className="w-24 h-14 rounded-lg overflow-hidden border border-white/10 shadow-lg mt-2">
        <img 
          src={`https://flagcdn.com/w160/${data.countryCode?.toLowerCase() || 'pk'}.png`} 
          className="w-full h-full object-cover" 
          alt="flag"
        />
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-black text-white tracking-tight">{data.count} pts</h2>
        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em]">MVP HERO</p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <img 
          src={data.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`} 
          className="w-14 h-14 rounded-full border-2 border-indigo-500 bg-slate-800 object-cover" 
          alt="mvp"
        />
        <span className="text-[11px] font-black text-indigo-400 truncate max-w-[100px]">
          @{data.username}
        </span>
      </div>
    </motion.div>
  );
};

const EndScreen = ({ winners, onRestart }) => {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    const restartTimeout = setTimeout(() => {
      onRestart();
    }, 3000);

    return () => {
      clearInterval(timer);
      clearTimeout(restartTimeout);
    };
  }, [onRestart]);

  return (
    <div className="absolute inset-0 z-[300] bg-[#050505]/95 backdrop-blur-xl flex flex-col items-center justify-start p-6 pt-12">
      <h1 className="text-3xl font-black text-orange-400 italic mb-2 uppercase tracking-tighter">
        Heroes of the Round
      </h1>
      <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-8">
        🌍 Leading Countries & Their MVPS
      </p>

      <div className="grid grid-cols-3 gap-3 w-full max-w-md">
        <WinnerCard rank={2} data={winners[1]} color="#4a5568" />
        <WinnerCard rank={1} data={winners[0]} color="#fbbf24" />
        <WinnerCard rank={3} data={winners[2]} color="#92400e" />
      </div>

      <div className="mt-12 flex flex-col items-center gap-2">
        <p className="text-indigo-400 font-black text-sm uppercase tracking-widest">
          Restarting in
        </p>
        <div className="text-5xl font-black text-white animate-pulse">
          {countdown}
        </div>
      </div>
    </div>
  );
};

export default EndScreen;