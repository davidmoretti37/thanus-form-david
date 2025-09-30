"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function WorkersCarousel() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const images = [
    "/workers/crianca-de-desenho-animado-a-posar-para-um-retrato (1).png",
    "/workers/crianca-de-desenho-animado-a-posar-para-um-retrato (2).png",
    "/workers/crianca-de-desenho-animado-a-posar-para-um-retrato.png",
    "/workers/personagem-de-troll-de-fantasia-em-um-ambiente-bonito.png",
    "/workers/renderizacao-3d-de-pessoa-assistindo-filme-com-pipoca.png"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentImageIndex + 1) % images.length;
      setNextImageIndex(nextIndex);
      setIsTransitioning(true);
      
      setTimeout(() => {
        setCurrentImageIndex(nextIndex);
        setIsTransitioning(false);
      }, 800); // Transition duration
      
    }, 4000); // 4 seconds per image

    return () => clearInterval(interval);
  }, [currentImageIndex, images.length]);

  return (
    <>
      <style jsx>{`
        @keyframes slideInFromRight {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOutToLeft {
          0% {
            transform: translateX(0);
            opacity: 1;
          }
          100% {
            transform: translateX(-100%);
            opacity: 0;
          }
        }
        
        .slide-in {
          animation: slideInFromRight 0.8s ease-in-out forwards;
        }
        
        .slide-out {
          animation: slideOutToLeft 0.8s ease-in-out forwards;
        }
      `}</style>
      
      <div className="relative w-full h-full overflow-hidden">
        {/* Workers Title */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Workers
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Seus primeiros funcionários virtuais
          </p>
        </div>

        {/* Image Container - Full Size */}
        <div className="relative w-full h-full overflow-hidden">
          {/* Current Image */}
          <div 
            className={`absolute inset-0 ${isTransitioning ? 'slide-out' : ''}`}
            key={`current-${currentImageIndex}`}
          >
            <div className="relative w-full h-full flex items-end justify-center pt-20">
              <div className="relative w-full h-[26rem]">
                <Image
                  src={images[currentImageIndex]}
                  alt={`Worker ${currentImageIndex + 1}`}
                  fill
                  className={`object-contain ${
                    images[currentImageIndex].includes('crianca-de-desenho-animado-a-posar-para-um-retrato (1)') || 
                    images[currentImageIndex].includes('ha-uma-boneca-pequena-com-olhos-grandes-e-um-casaco-rosa') 
                      ? 'scale-[1.03]' 
                      : ''
                  }`}
                  style={{
                    objectPosition: 'center bottom'
                  }}
                  priority
                />
              </div>
            </div>
          </div>

          {/* Next Image sliding in from right */}
          {isTransitioning && (
            <div 
              className="absolute inset-0 slide-in"
              key={`next-${nextImageIndex}`}
            >
              <div className="relative w-full h-full flex items-end justify-center pt-20">
                <div className="relative w-full h-[26rem]">
                  <Image
                    src={images[nextImageIndex]}
                    alt={`Worker ${nextImageIndex + 1}`}
                    fill
                    className={`object-contain ${
                      images[nextImageIndex].includes('crianca-de-desenho-animado-a-posar-para-um-retrato (1)') || 
                      images[nextImageIndex].includes('ha-uma-boneca-pequena-com-olhos-grandes-e-um-casaco-rosa') 
                        ? 'scale-[1.03]' 
                        : ''
                    }`}
                    style={{
                      objectPosition: 'center bottom'
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
