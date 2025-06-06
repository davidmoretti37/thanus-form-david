'use client';

import { useEffect, useState, FormEvent } from 'react';
import { CosmicParticles } from '@/components/home/cosmic-particles';
import { ModalProviders } from '@/providers/modal-providers';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  createProject,
  createThread,
  addUserMessage,
  startAgent,
  BillingError,
} from '@/lib/api';
import { generateThreadName } from '@/lib/actions/threads';
import { toast } from 'sonner';
import { useModal } from '@/hooks/use-modal-store';

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { onOpen } = useModal();

  // Create an agent with the provided prompt
  const createAgentWithPrompt = async () => {
    if (!inputValue.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Generate a name for the project using GPT
      const projectName = await generateThreadName(inputValue);

      // 1. Create a new project with the GPT-generated name
      const newAgent = await createProject({
        name: projectName,
        description: '',
      });

      // 2. Create a new thread for this project
      const thread = await createThread(newAgent.id);

      // 3. Add the user message to the thread
      await addUserMessage(thread.thread_id, inputValue.trim());

      // 4. Start the agent with the thread ID
      await startAgent(thread.thread_id, {
        stream: true,
      });

      // 5. Navigate to the new agent's thread page
      router.push(`/agents/${thread.thread_id}`);
      // Clear input on success
      setInputValue('');
    } catch (error: any) {
      console.error('Error creating agent:', error);

      // Check specifically for BillingError (402)
      if (error instanceof BillingError) {
        console.log('Handling BillingError from hero section:', error.detail);
        // Open the payment required dialog modal instead of showing the alert
        onOpen("paymentRequiredDialog");
        // Don't show toast for billing errors
      } else {
        // Handle other errors (e.g., network, other API errors)
        const isConnectionError =
          error instanceof TypeError &&
          error.message.includes('Failed to fetch');
        if (isConnectionError) {
          toast.error(
            error.message || 'Failed to create agent. Please try again.',
          );
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!inputValue.trim() || isSubmitting) return;

    // If user is not logged in, redirect to auth
    if (!user && !isLoading) {
      router.push('/auth');
      return;
    }

    // User is logged in, create the agent
    createAgentWithPrompt();
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    }
  };

  return (
    <>
      <ModalProviders />
      <main className="relative min-h-screen w-full bg-black overflow-hidden">
        {/* Cosmic Particles Background */}
        <CosmicParticles isFocused={isInputFocused} />
        
        {/* Top Navigation */}
        <nav className="relative z-10 flex items-center justify-end p-6">
          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/auth')}
              className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors border border-white/20 rounded-lg hover:border-white/40"
            >
              Sign in
            </button>
            <button
              onClick={() => router.push('/auth')}
              className="px-4 py-2 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              Sign up
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[64vh] px-6">
          {/* Beta Badge */}
          <div className="mb-6">
            <span className="px-3 py-1 text-xs text-white/60 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
              Beta
            </span>
          </div>

          {/* Main Title */}
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
              Discover the
            </h1>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              THANUS
            </h1>
            <p className="text-base text-white/60 max-w-md mx-auto">
              The Entity
            </p>
          </div>

          {/* Input Field */}
          <div className="w-full max-w-xl mt-20">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder="Ask THANUS anything..."
                  className="w-full h-14 px-6 pr-14 bg-white/5 border border-white/20 rounded-full text-white placeholder-white/40 focus:outline-none focus:border-white/40 backdrop-blur-sm transition-colors"
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                  disabled={!inputValue.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-white/60" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
