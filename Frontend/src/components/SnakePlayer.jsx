// import React, { memo, useState, useEffect } from "react";
// import { motion } from "framer-motion";

// const SnakePlayer = ({ data, userId, onCollision, setSnakes, active }) => {
//   const flagUrl = `https://flagcdn.com/w160/${data.countryCode?.toLowerCase() || 'pk'}.png`;
//   const profilePic = data.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

//   const [pos, setPos] = useState({
//     x: Math.random() * 80 + 10,
//     y: Math.random() * 80 + 10,
//     angle: Math.random() * 360,
//   });

//   useEffect(() => {
//     if (!active) return;

//     let speed = 0.9; 
//     let currentAngle = pos.angle;
//     let currentX = pos.x;
//     let currentY = pos.y;
//     let lastCollisionTime = 0;

//     const moveSnake = setInterval(() => {
  
//       if (Math.random() > 0.98) { 
//         currentAngle += (Math.random() * 30 - 15);
//       }

//       let vx = Math.cos((currentAngle * Math.PI) / 180) * speed;
//       let vy = Math.sin((currentAngle * Math.PI) / 180) * speed;

//       currentX += vx;
//       currentY += vy;

  
//       if (currentX <= 3 || currentX >= 97) { 
//         currentAngle = 180 - currentAngle; 
//         currentX = currentX <= 3 ? 3.2 : 96.8; 
//       }
//       if (currentY <= 3 || currentY >= 97) { 
//         currentAngle = -currentAngle; 
//         currentY = currentY <= 3 ? 3.2 : 96.8; 
//       }

    
//       const now = Date.now();
//       if (now - lastCollisionTime > 600) {
//         const myElement = document.getElementById(`snake-${userId}`);
//         const allSnakes = document.querySelectorAll('[id^="snake-"]');
        
//         if (myElement) {
//           const rect1 = myElement.getBoundingClientRect();
//           const centerX1 = rect1.left + rect1.width / 2;
//           const centerY1 = rect1.top + rect1.height / 2;

//           allSnakes.forEach((other) => {
//             if (other.id !== `snake-${userId}`) {
//               const rect2 = other.getBoundingClientRect();
//               const centerX2 = rect2.left + rect2.width / 2;
//               const centerY2 = rect2.top + rect2.height / 2;
              
//               const dx = centerX1 - centerX2;
//               const dy = centerY1 - centerY2;
//               const distance = Math.sqrt(dx * dx + dy * dy);

            
//               if (distance < 40) {
//                 onCollision?.();
//                 lastCollisionTime = now;

              
//                 currentAngle = (currentAngle + 180 + (Math.random() * 20 - 10)) % 360;
                
               
//                 const pushDist = 3;
//                 currentX += (dx / distance) * pushDist;
//                 currentY += (dy / distance) * pushDist;

//                 setSnakes?.((prev) => {
//                   if (!prev[userId] || prev[userId].count <= 0) return prev;
//                   return {
//                     ...prev,
//                     [userId]: { ...prev[userId], count: prev[userId].count - 1 }
//                   };
//                 });
//               }
//             }
//           });
//         }
//       }

//       setPos({ x: currentX, y: currentY, angle: currentAngle });
//     }, 30);

//     return () => clearInterval(moveSnake);
//   }, [active, userId, onCollision, setSnakes]);

//   return (
//    <motion.div
//       id={`snake-${userId}`}
//       className="absolute flex flex-row-reverse items-center pointer-events-none z-40"
//       style={{
//         left: `${pos.x}%`,
//         top: `${pos.y}%`,
//         transform: `translate(-50%, -50%) rotate(${pos.angle}deg)`,
//         transformOrigin: "center center",
//       }}
//     >
  
//     <div className="relative z-50 flex items-center justify-center shrink-0">

//   <div 
//     className="absolute bottom-[110%] left-1/2 whitespace-nowrap z-[60]"
//     style={{ 

//       transform: `translateX(-50%) rotate(${-pos.angle}deg)`,
//       transformOrigin: "bottom center"
//     }}
//   >
//     <span className=" px-2 py-1 rounded-full text-[10px] font-bold text-white shadow-lg ">
//       @{data.username}
//     </span>
//   </div>
  
//   <img 
//     src={profilePic} 
//     className="w-10 h-10 rounded-full border-2 border-white shadow-xl object-cover bg-slate-800 relative z-50"
//     style={{ transform: `rotate(${-pos.angle}deg)` }}
//   />
// </div>

//       {/* Snake Body (Flags) */}
//       <div className="flex flex-row-reverse items-center -mr-2"> 
//         {[...Array(Math.max(0, data.count))].map((_, i) => (
//           <motion.img
//             key={`${userId}-flag-${i}`}
//             src={flagUrl}
//             animate={{ y: [0, 8, -8, 0] }}
//             transition={{
//               duration: 1,
//               repeat: Infinity,
//               ease: "easeInOut",
//               delay: i * 0.12 
//             }}
//             className="w-7 h-7 rounded-full border border-white/30 object-cover -ml-3 shadow-md"
//             style={{ zIndex: 10 - i }}
//           />
//         ))}
//       </div>
//     </motion.div>
//   );
// };

// export default memo(SnakePlayer);

import React, { memo, useState, useEffect } from "react";
import { motion } from "framer-motion";


const SnakePlayer = ({ data, snakeKey, onCollision, setSnakes, active }) => {
  const userId = data.userId || data.username || 'guest';
  const flagUrl = `https://flagcdn.com/w160/${data.countryCode?.toLowerCase() || 'pk'}.png`;
  const profilePic = data.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

  const [pos, setPos] = useState({
    x: Math.random() * 80 + 10,
    y: Math.random() * 80 + 10,
    angle: Math.random() * 360,
  });

  useEffect(() => {
    if (!active) return;

    let speed = 0.9; 
    let currentAngle = pos.angle;
    let currentX = pos.x;
    let currentY = pos.y;
    let lastCollisionTime = 0;

    const moveSnake = setInterval(() => {
  
      if (Math.random() > 0.98) { 
        currentAngle += (Math.random() * 30 - 15);
      }

      let vx = Math.cos((currentAngle * Math.PI) / 180) * speed;
      let vy = Math.sin((currentAngle * Math.PI) / 180) * speed;

      currentX += vx;
      currentY += vy;

      if (currentX <= 3 || currentX >= 97) { 
        currentAngle = 180 - currentAngle; 
        currentX = currentX <= 3 ? 3.2 : 96.8; 
      }
      if (currentY <= 3 || currentY >= 97) { 
        currentAngle = -currentAngle; 
        currentY = currentY <= 3 ? 3.2 : 96.8; 
      }

      const now = Date.now();
      if (now - lastCollisionTime > 600) {

        const myElement = document.getElementById(`snake-${snakeKey}`);
        const allSnakes = document.querySelectorAll('[id^="snake-"]');
        
        if (myElement) {
          const rect1 = myElement.getBoundingClientRect();
          const centerX1 = rect1.left + rect1.width / 2;
          const centerY1 = rect1.top + rect1.height / 2;

          allSnakes.forEach((other) => {
            if (other.id !== `snake-${snakeKey}`) {
              const rect2 = other.getBoundingClientRect();
              const centerX2 = rect2.left + rect2.width / 2;
              const centerY2 = rect2.top + rect2.height / 2;
              
              const dx = centerX1 - centerX2;
              const dy = centerY1 - centerY2;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < 40) {
                onCollision?.();
                lastCollisionTime = now;

                currentAngle = (currentAngle + 180 + (Math.random() * 20 - 10)) % 360;
                
                const pushDist = 3;
                currentX += (dx / distance) * pushDist;
                currentY += (dy / distance) * pushDist;

                setSnakes?.((prev) => {
            
                  if (!prev[snakeKey] || prev[snakeKey].count <= 0) return prev;
                  return {
                    ...prev,
                    [snakeKey]: { ...prev[snakeKey], count: prev[snakeKey].count - 1 }
                  };
                });
              }
            }
          });
        }
      }

      setPos({ x: currentX, y: currentY, angle: currentAngle });
    }, 30);

    return () => clearInterval(moveSnake);
  }, [active, snakeKey, onCollision, setSnakes]); 

  return (
    <motion.div
      id={`snake-${snakeKey}`}
      className="absolute flex flex-row-reverse items-center pointer-events-none z-40"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: `translate(-50%, -50%) rotate(${pos.angle}deg)`,
        transformOrigin: "center center",
      }}
    >
    
      <div className="relative z-50 flex items-center justify-center shrink-0">
        
        
        <div style={{ transform: `rotate(${-pos.angle}deg)` }}>
          
      
          <div 
            className="absolute z-[60] whitespace-nowrap"
            style={{ 

              transform: `translate(-50%, -45px)`, 
              left: '50%',
              top: '50%',
            }}
          >
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black text-white">
              @{data.username}
            </span>
          </div>

        
          <img 
            src={profilePic} 
            alt={data.username} 
            key={`pfp-${snakeKey}`} 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
            }}
            className="w-10 h-10 rounded-full border-2 border-white shadow-xl object-cover bg-slate-800 relative z-[100]"
            style={{ 
              display: 'block',
              backfaceVisibility: 'hidden', 
              WebkitBackfaceVisibility: 'hidden'
            }}
          />
        </div>
      </div>

    
      <div className="flex flex-row-reverse items-center -mr-2"> 
        {[...Array(Math.max(0, data.count))].map((_, i) => (
          <motion.img
            key={`${snakeKey}-flag-${i}`} 
            src={flagUrl}
            animate={{ y: [0, 8, -8, 0] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.12 
            }}
            className="w-7 h-7 rounded-full border border-white/30 object-cover -ml-3 shadow-md"
            style={{ zIndex: 10 - i }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default memo(SnakePlayer);