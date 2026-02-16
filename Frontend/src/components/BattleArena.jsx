import React, { useEffect, useCallback, useRef } from "react";
import SnakePlayer from "./SnakePlayer";

const BattleArena = ({ snakes, setSnakes, active, onCollision }) => {

  const snakesRef = useRef(snakes);
  const activeRef = useRef(active);

  useEffect(() => {
    snakesRef.current = snakes;
    activeRef.current = active;
  }, [snakes, active]);

  const handleCollision = useCallback((idA, idB) => {
    if (!activeRef.current) return;

    if (onCollision) onCollision();

    setSnakes((prev) => {
      const snakeA = prev[idA];
      const snakeB = prev[idB];
      if (!snakeA || !snakeB) return prev;

      const newSnakes = { ...prev };
      if (newSnakes[idA].count > 0) {
        newSnakes[idA] = { ...newSnakes[idA], count: newSnakes[idA].count - 1 };
      }
      if (newSnakes[idB].count > 0) {
        newSnakes[idB] = { ...newSnakes[idB], count: newSnakes[idB].count - 1 };
      }
      return newSnakes;
    });
  }, [setSnakes, onCollision]);

  useEffect(() => {

    const interval = setInterval(() => {
      if (!activeRef.current) return;

      const currentSnakes = snakesRef.current;
      const snakeIds = Object.keys(currentSnakes);
      if (snakeIds.length < 2) return;

      for (let i = 0; i < snakeIds.length; i++) {
        for (let j = i + 1; j < snakeIds.length; j++) {
          const idA = snakeIds[i];
          const idB = snakeIds[j];

          const headA = document.getElementById(`snake-${idA}`)?.getBoundingClientRect();
          const headB = document.getElementById(`snake-${idB}`)?.getBoundingClientRect();

          if (headA && headB) {
            const dx = headA.left - headB.left;
            const dy = headA.top - headB.top;
            const distance = Math.sqrt(dx * dx + dy * dy);

      
            if (distance < 50) {
              handleCollision(idA, idB);
            }
          }
        }
      }
    }, 100); 

    return () => clearInterval(interval);
  }, [handleCollision]); 

  return (
    <div className="relative w-full h-full">
      {Object.entries(snakes).map(([id, data]) => (
        <SnakePlayer 
          key={id} 
          userId={id} 
          data={data} 
          active={active} 
        />
      ))}
    </div>
  );
};

export default BattleArena;