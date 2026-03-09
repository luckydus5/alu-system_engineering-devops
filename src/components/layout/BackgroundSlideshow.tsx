import { useState, useEffect } from 'react';
import bgSlide1 from '@/assets/bg-slide-1.jpg';
import bgSlide2 from '@/assets/bg-slide-2.png';
import bgSlide3 from '@/assets/bg-slide-3.jpg';

const backgrounds = [bgSlide1, bgSlide2, bgSlide3];

export function BackgroundSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % backgrounds.length);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {backgrounds.map((bg, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.25), rgba(255,255,255,0.35)), url(${bg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ))}
    </div>
  );
}
