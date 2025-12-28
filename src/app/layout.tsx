import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { TopNav } from '@/components/TopNav';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

const sora = Sora({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Reddit Mastermind',
  description: 'AI-powered Reddit content calendar planner with multi-persona support',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={sora.className}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <div className="min-h-screen bg-[#f5f5f5] text-[#171717] dark:bg-[#0a0a0a] dark:text-[#fafafa]">
              <TopNav />
              <main className="mx-auto max-w-7xl px-4 py-6">
                {children}
              </main>
            </div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
