'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SignIn, SignUp } from '@clerk/nextjs';
import { useTheme } from 'next-themes';

type AuthMode = 'login' | 'signup';

type AuthScreenProps = {
  mode: AuthMode;
};

export function AuthScreen({ mode }: AuthScreenProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';
  const appearance = {
    variables: {
      colorPrimary: '#f97316',
      colorBackground: 'transparent',
      borderRadius: '16px',
      fontFamily: 'inherit',
    },
    elements: {
      card: 'shadow-none bg-transparent w-full',
      rootBox: 'w-full',
      headerTitle: 'hidden',
      headerSubtitle: 'hidden',
      socialButtonsBlockButton:
        'rounded-full border border-black/10 bg-white text-slate-700 text-sm font-semibold shadow-sm hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10',
      socialButtonsBlockButtonText: 'text-inherit',
      dividerText: 'text-slate-400 dark:text-white/50',
      dividerLine: 'bg-black/10 dark:bg-white/10',
      formButtonPrimary:
        'rounded-full bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold shadow-lg shadow-orange-500/30',
      footerActionLink: 'text-orange-500 hover:text-orange-400 dark:text-orange-200 dark:hover:text-orange-100',
      footer: 'hidden',
      footerAction: 'hidden',
      footerActionText: 'hidden',
      formFieldInput:
        'rounded-2xl border border-black/10 bg-white text-slate-900 placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-200/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-orange-500/30',
      formFieldLabel: 'text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-white/50',
      formFieldAction: 'text-orange-500 dark:text-orange-200',
      identityPreviewText: 'text-slate-900 dark:text-white',
    },
  } as const;

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-96px)] bg-[#fafafa] text-slate-900 dark:bg-[#0a0a0f] dark:text-white">
      <div className="relative h-full overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-40 left-1/4 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.2),_transparent_70%)]" />
          <div className="absolute -bottom-32 left-[-10%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.16),_transparent_70%)]" />
          <div className="absolute right-[-5%] top-[-10%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,_rgba(248,113,113,0.18),_transparent_70%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,250,252,0.94))] dark:bg-[linear-gradient(135deg,rgba(10,10,15,0.96),rgba(7,10,20,0.92))]" />
          <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(2,6,23,0.08)_1px,transparent_1px)] [background-size:26px_26px] dark:opacity-20 dark:[background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)]" />
        </div>

        <div className="relative mx-auto grid min-h-[calc(100vh-96px)] max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f97316] text-[12px] font-semibold text-white shadow-[0_12px_30px_-12px_rgba(249,115,22,0.4)]">
                <span className="text-[12px] font-semibold tracking-[0.16em]">RM</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Reddit Mastermind</p>
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500 dark:text-white/50">By Anirudh Manjesh</p>
              </div>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              {mode === 'signup' ? (
                <>
                  Plan Reddit threads with
                  <span className="text-[#f97316]"> human cadence</span>.
                </>
              ) : (
                <>
                  Welcome. Let’s ship a
                  <span className="text-[#f97316]"> clean week</span> of content!
                </>
              )}
            </h1>
            <p className="max-w-xl text-base text-slate-600 dark:text-white/70">
              {mode === 'signup'
                ? 'Multi-persona planning, cadence guardrails, and quality checks that keep every thread natural.'
                : 'Review drafts, adjust constraints, and keep the conversation tone consistent.'}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                <p className="text-slate-900 dark:text-white">Command palette</p>
                <p className="mt-2">Jump between weeks, threads, and exports with ⌘K.</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                <p className="text-slate-900 dark:text-white">Quality scoring</p>
                <p className="mt-2">Flag promo language before it ships.</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-white/50">This Week's Snapshot</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/10 bg-white p-4 text-xs uppercase tracking-[0.2em] text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  3 posts / week
                </div>
                <div className="rounded-2xl border border-black/10 bg-white p-4 text-xs uppercase tracking-[0.2em] text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  11 comments
                </div>
                <div className="rounded-2xl border border-black/10 bg-white p-4 text-xs uppercase tracking-[0.2em] text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                  8.6 quality
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white p-4 text-xs text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                <p className="text-slate-900 dark:text-white/90">Mon · r/Startups</p>
                <p className="mt-2 text-sm">“Anyone else struggling to keep decks consistent?”</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-4 text-xs text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                <p className="text-slate-900 dark:text-white/90">Wed · r/Productivity</p>
                <p className="mt-2 text-sm">“How do you ship slides faster without cutting corners?”</p>
              </div>
            </div>
            <div className="text-sm text-slate-500 dark:text-white/60" />
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[420px] space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400 dark:text-white/40">Access</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {mode === 'signup' ? 'Create your workspace' : 'Sign in to continue'}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-white/60">
                  {mode === 'signup'
                    ? 'Start planning in minutes. You can invite teammates later.'
                    : 'Use Google or email to pick up where you left off.'}
                </p>
              </div>
              <div>
                {mode === 'signup' ? (
                  <SignUp
                    routing="hash"
                    signInUrl="/login"
                    afterSignUpUrl="/"
                    appearance={appearance}
                  />
                ) : (
                  <SignIn
                    routing="hash"
                    signUpUrl="/signup"
                    afterSignInUrl="/"
                    appearance={appearance}
                  />
                )}
              </div>
              <div className="text-center text-xs text-slate-500 dark:text-white/50">
                {mode === 'signup' ? 'Already have an account?' : 'New to Reddit Mastermind?'}{' '}
                <Link
                  href={mode === 'signup' ? '/login' : '/signup'}
                  className="text-orange-500 underline decoration-orange-400/60 underline-offset-4 dark:text-orange-200"
                >
                  {mode === 'signup' ? 'Sign in' : 'Create one'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
