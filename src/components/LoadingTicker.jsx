import React, { useState, useEffect, useRef } from 'react';

export default function LoadingTicker({ lines = [], interval = 6000 }) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (lines && lines.length > 0) {
      return Math.floor(Math.random() * lines.length);
    }
    return 0;
  });
  const [isFading, setIsFading] = useState(false);

  const linesRef = useRef(lines);
  const hasInitialized = useRef(lines.length > 0);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  // Keep currentIndex in bounds or initialize if lines load later
  useEffect(() => {
    if (lines.length > 0) {
      if (!hasInitialized.current) {
        setCurrentIndex(Math.floor(Math.random() * lines.length));
        hasInitialized.current = true;
      } else if (currentIndex >= lines.length) {
        setCurrentIndex(0);
      }
    }
  }, [lines, currentIndex]);

  useEffect(() => {
    const timer = setInterval(() => {
      const currentLines = linesRef.current;
      if (!currentLines || currentLines.length <= 1) {
        return;
      }

      setIsFading(true);

      const fadeTimeout = setTimeout(() => {
        setCurrentIndex((prev) => {
          const length = currentLines.length;
          if (length <= 1) return 0;
          let newIndex;
          do {
            newIndex = Math.floor(Math.random() * length);
          } while (newIndex === prev);
          return newIndex;
        });
        setIsFading(false);
      }, 250); // wait for fade out transition (250ms)

      return () => clearTimeout(fadeTimeout);
    }, interval);

    return () => clearInterval(timer);
  }, []); // Empty dependency array: created only once per mount

  if (!lines || lines.length === 0) {
    return null;
  }

  const safeIndex = currentIndex >= lines.length ? 0 : currentIndex;
  const currentLine = lines[safeIndex] || '';

  return (
    <div className="loading-ticker-wrap">
      <span className="loading-ticker-label">DID YOU KNOW?</span>
      <div className={`loading-ticker ${isFading ? 'fade' : ''}`}>
        <span>{currentLine}</span>
      </div>
    </div>
  );
}
