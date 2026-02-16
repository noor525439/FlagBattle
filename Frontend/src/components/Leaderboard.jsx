import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Leaderboard = ({ snakes }) => {
  const sortedSnakes = useMemo(() => {
    return Object.values(snakes)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [snakes]);

  return (
    <div className="absolute inset-x-1 top-16 z-50 flex flex-col gap-1 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {sortedSnakes.map((user, i) => (
          <motion.div
            layout
            key={user.username}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center justify-between h-14"
          >

            <div className="flex items-center gap-2 pl-2">
              <img 
                src={`https://flagcdn.com/w80/${user.countryCode?.toLowerCase()}.png`} 
                className="w-7 h-5 object-cover shadow-sm border border-white/10"
                alt=""
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white uppercase tracking-tighter font-semibold">
                  {user.countryCode}
                </span>
                <span className="text-[10px] text-white rounded-sm shadow-md border py-0.5 px-2 border-white/10 bg-black/40 font-bold">
                  {user.count}
                </span>
              </div>
            </div>

     
            <div className="flex items-center gap-2 pr-1">
       
              <div>
                <span className="text-[10px] text-white rounded-sm shadow-md border py-0.5 px-2 border-white/10 bg-black/40 font-bold">

                  {user.count}
                </span>
              </div>

    
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-white truncate max-w-[80px] uppercase tracking-tighter font-semibold">
                  {user.username}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <img 
                  src={`https://flagcdn.com/w80/${user.countryCode?.toLowerCase()}.png`} 
                  className="w-6 h-4 object-cover  shadow-sm border border-white/10"
                  alt=""
                />
                <img 
                  src={user.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                  className="w-8 h-8 rounded-full border-2 border-indigo-500 shadow-lg object-cover bg-slate-800"
                  alt=""
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Leaderboard;