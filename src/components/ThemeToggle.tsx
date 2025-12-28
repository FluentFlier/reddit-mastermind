'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = (resolvedTheme || theme) === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm transition dark:border-white/10 dark:bg-[#18181b]"
      aria-label="Toggle theme"
    >
      <motion.span
        initial={false}
        animate={{ rotate: isDark ? 180 : 0, scale: isDark ? 0.9 : 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        className="absolute"
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-white" />
        ) : (
          <Sun className="h-4 w-4 text-slate-700" />
        )}
      </motion.span>
    </button>
  );
}
