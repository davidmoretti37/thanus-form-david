'use client';

import { useState, Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mic } from 'lucide-react';
import { useVoiceAgent } from '@/hooks/use-voice-agent';
import { toast } from 'sonner';

// Dynamic import with SSR disabled for WebGL component
const Orb = dynamic(() => import('./Orb'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full">
      <Sparkles className="w-4 h-4 animate-pulse text-purple-400" />
    </div>
  )
});

export function OrbToggle() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const {
    isActive,
    isListening,
    isSpeaking,
    isConnected,
    error,
    startAgent,
    stopAgent,
  } = useVoiceAgent();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mostra erros via toast
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleOrbClick = async () => {
    // Se já está ativo, apenas expande
    if (isActive) {
      setIsExpanded(true);
      return;
    }

    // Se não está ativo, conecta
    setIsExpanded(true);
    try {
      await startAgent();
      toast.success('Assistente de voz ativada! Fale comigo.');
    } catch (err) {
      console.error('❌ Failed to start agent:', err);
      setIsExpanded(false);
    }
  };

  const handleBackdropClick = async () => {
    if (isActive) {
      await stopAgent();
      toast.info('Assistente de voz desativada');
    }
    setIsExpanded(false);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button className="relative w-8 h-8 rounded-full overflow-hidden cursor-pointer">
        <div className="w-full h-full flex items-center justify-center">
          <Sparkles className="w-4 h-4 animate-pulse text-blue-400" />
        </div>
      </button>
    );
  }

  return (
    <>
      {/* Small Orb button next to theme toggle */}
      <motion.button
        onClick={handleOrbClick}
        className="relative w-8 h-8 rounded-full overflow-hidden cursor-pointer"
        aria-label={isActive ? "Voice Assistant Active" : "Activate Voice Assistant"}
        animate={{
          scale: isListening ? [1, 1.1, 1] : isSpeaking ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: 1,
          repeat: (isListening || isSpeaking) ? Infinity : 0,
        }}
      >
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 animate-pulse text-purple-400" />
          </div>
        }>
          <div className="w-full h-full">
            <Orb 
              hue={0} 
              hoverIntensity={0.3} 
              rotateOnHover={false}
              forceHoverState={false}
            />
          </div>
        </Suspense>
        
        {/* Indicador de status */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-background"
          />
        )}
        
        {/* Mic indicator quando ouvindo */}
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center bg-blue-500/20 backdrop-blur-sm"
          >
            <Mic className="w-4 h-4 text-blue-400" />
          </motion.div>
        )}
      </motion.button>

      {/* Expanded fullscreen view - apenas a Orb sem fundo */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            onClick={handleBackdropClick}
          >
            {/* Orb container - apenas a animação sem background */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ 
                type: 'spring',
                damping: 25,
                stiffness: 300
              }}
              className="relative w-full h-full max-w-4xl max-h-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full h-full p-8 relative">
                <Suspense fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <Sparkles className="w-12 h-12 animate-pulse text-blue-400" />
                  </div>
                }>
                  <Orb 
                    hue={0} 
                    hoverIntensity={0.5} 
                    rotateOnHover={true}
                    forceHoverState={isListening || isSpeaking}
                  />
                </Suspense>
                
                {/* Status indicator overlay */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                  {isListening && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-500/30"
                    >
                      <Mic className="w-4 h-4 text-blue-400 animate-pulse" />
                      <span className="text-sm text-blue-400 font-medium">Ouvindo...</span>
                    </motion.div>
                  )}
                  
                  {isSpeaking && !isListening && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-500/30"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-purple-400"
                      />
                      <span className="text-sm text-purple-400 font-medium">Falando...</span>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
