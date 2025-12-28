'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/ThemeToggle';

const hiddenRoutes = new Set(['/login', '/signup']);

export function TopNav() {
  const pathname = usePathname();
  if (hiddenRoutes.has(pathname)) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#e5e5e5] bg-white dark:border-white/10 dark:bg-[#0a0a0a]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f97316] text-[12px] font-semibold text-white shadow-[0_12px_30px_-12px_rgba(249,115,22,0.4)]">
            <span className="text-[12px] font-semibold tracking-[0.16em]">RM</span>
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900 dark:text-white">Reddit Mastermind</p>
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500 dark:text-white/50">By Anirudh Manjesh</p>
          </div>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-slate-600 transition hover:text-slate-900 dark:text-white/70 dark:hover:text-white">
            Dashboard
          </Link>
          <ThemeToggle />
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-slate-600 transition hover:text-slate-900 dark:text-white/70 dark:hover:text-white">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-[#0a0a0f] dark:hover:bg-white/90">
                Get started
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <div className="ml-2">
              <UserButton afterSignOutUrl="/login" />
            </div>
          </SignedIn>
        </nav>
      </div>
    </header>
  );
}
