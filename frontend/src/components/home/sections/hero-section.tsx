'use client';
import { siteConfig } from '@/lib/home';
import { ArrowRight, X, AlertCircle } from 'lucide-react';
import { CosmicParticles } from '@/components/home/ui/cosmic-particles';
import { useState, useEffect, useRef, FormEvent } from 'react';
import Link from 'next/link';
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
import GoogleSignIn from '@/components/GoogleSignIn';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from '@/components/ui/dialog';
import { BillingErrorAlert } from '@/components/billing/usage-limit-alert';
import { useBillingError } from '@/hooks/useBillingError';
import { useAccounts } from '@/hooks/use-accounts';
import { isLocalMode, config } from '@/lib/config';
import { toast } from 'sonner';
import { useModal } from '@/hooks/use-modal-store';

// Custom dialog overlay with blur effect
const BlurredDialogOverlay = () => (
  <DialogOverlay className="bg-black/60 backdrop-blur-md" />
);

// Constant for localStorage key to ensure consistency
const PENDING_PROMPT_KEY = 'pendingAgentPrompt';

export function HeroSection() {
  const { hero } = siteConfig;
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { billingError, handleBillingError, clearBillingError } = useBillingError();
  const { data: accounts } = useAccounts();
  const personalAccount = accounts?.find((account) => account.personal_account);
  const { onOpen } = useModal();

  // Auth dialog state
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Store the input value when auth dialog opens
  useEffect(() => {
    if (authDialogOpen && inputValue.trim()) {
      localStorage.setItem(PENDING_PROMPT_KEY, inputValue.trim());
    }
  }, [authDialogOpen, inputValue]);

  // Close dialog and redirect when user authenticates
  useEffect(() => {
    if (authDialogOpen && user && !isLoading) {
      setAuthDialogOpen(false);
      router.push('/dashboard');
    }
  }, [user, isLoading, authDialogOpen, router]);

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
        if (!isLocalMode() || isConnectionError) {
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

    // If user is not logged in, save prompt and show auth dialog
    if (!user && !isLoading) {
      localStorage.setItem(PENDING_PROMPT_KEY, inputValue.trim());
      setAuthDialogOpen(true);
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

  // Handle input focus/blur
  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
  };

  // Handle auth form submission
  const handleSignIn = async (prevState: any, formData: FormData) => {
    setAuthError(null);
    try {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      formData.append('returnUrl', '/dashboard');

      return { message: 'Invalid credentials' };
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthError(
        error instanceof Error ? error.message : 'An error occurred',
      );
      return { message: 'An error occurred during sign in' };
    }
  };

  return (
    <section className="relative w-full h-screen bg-black overflow-hidden">
      {/* Cosmic Particles Background */}
      <div className="absolute inset-0">
        <CosmicParticles 
          particleCount={800} 
          isInputFocused={isInputFocused}
          className="w-full h-full"
        />
      </div>

      {/* Top Navigation */}
      <div className="absolute top-0 right-0 p-6 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAuthDialogOpen(true)}
            className="px-6 py-2 rounded-full border border-gray-600 text-white hover:border-gray-400 transition-colors duration-200"
          >
            Sign in
          </button>
          <Link
            href="/auth?mode=signup"
            className="px-6 py-2 rounded-full bg-white text-black hover:bg-gray-200 transition-colors duration-200"
          >
            Sign up
          </Link>
        </div>
      </div>


      {/* Main Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{ marginTop: '-5vh' }}>
        <div className="text-center space-y-6 max-w-4xl mx-auto px-6">
          {/* Subtitle */}
          <p className="text-gray-400 text-lg mb-4">
            The Entity
          </p>
          
          {/* Main Title */}
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-12">
            THANUS
          </h1>

          {/* Input Section */}
          <div className="w-full max-w-2xl mx-auto mt-40">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Ask THANUS anything..."
                  className="w-full h-14 px-6 pr-16 rounded-full bg-transparent border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none backdrop-blur-sm transition-all duration-300"
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors duration-200 disabled:opacity-50"
                  disabled={!inputValue.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Auth Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <BlurredDialogOverlay />
        <DialogContent className="sm:max-w-md rounded-xl bg-gray-900 border border-gray-700">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-medium text-white">
                Sign in to continue
              </DialogTitle>
            </div>
            <DialogDescription className="text-gray-400">
              Sign in or create an account to talk with Thanus
            </DialogDescription>
          </DialogHeader>

          {/* Auth error message */}
          {authError && (
            <div className="mb-4 p-3 rounded-lg flex items-center gap-3 bg-red-900/20 border border-red-700/50 text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{authError}</span>
            </div>
          )}

          {/* Google Sign In */}
          <div className="w-full">
            <GoogleSignIn returnUrl="/dashboard" />
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">
                or continue with email
              </span>
            </div>
          </div>

          {/* Sign in form */}
          <form className="space-y-4">
            <div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Email address"
                className="h-12 rounded-full bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                required
              />
            </div>

            <div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                className="h-12 rounded-full bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                required
              />
            </div>

            <div className="space-y-4 pt-4">
              <SubmitButton
                formAction={handleSignIn}
                className="w-full h-12 rounded-full bg-white text-black hover:bg-gray-200 transition-all shadow-md"
                pendingText="Signing in..."
              >
                Sign in
              </SubmitButton>

              <Link
                href={`/auth?mode=signup&returnUrl=${encodeURIComponent('/dashboard')}`}
                className="flex h-12 items-center justify-center w-full text-center rounded-full border border-gray-700 bg-gray-800 hover:bg-gray-700 transition-all text-white"
                onClick={() => setAuthDialogOpen(false)}
              >
                Create new account
              </Link>
            </div>

            <div className="text-center pt-2">
              <Link
                href={`/auth?returnUrl=${encodeURIComponent('/dashboard')}`}
                className="text-sm text-gray-400 hover:text-white transition-colors"
                onClick={() => setAuthDialogOpen(false)}
              >
                More sign in options
              </Link>
            </div>
          </form>

          <div className="mt-4 text-center text-xs text-gray-500">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Billing Error Alert here */}
      <BillingErrorAlert
        message={billingError?.message}
        currentUsage={billingError?.currentUsage}
        limit={billingError?.limit}
        accountId={personalAccount?.account_id}
        onDismiss={clearBillingError}
        isOpen={!!billingError}
      />
    </section>
  );
}