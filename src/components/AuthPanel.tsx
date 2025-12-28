'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

type Mode = 'password' | 'magic';

export function AuthPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<Mode>('password');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : undefined;

  if (!supabase) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900">Supabase not configured</h2>
        <p className="text-sm text-gray-600 mt-2">
          Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
        </p>
      </div>
    );
  }

  const client = supabase;

  const handlePasswordAuth = async (isSignup: boolean) => {
    setIsLoading(true);
    setMessage(null);
    setError(null);
    try {
      if (isSignup) {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
        });
        if (error) throw error;
        if (data.session) {
          setMessage('Account created and signed in.');
        } else {
          setMessage('Check your email to confirm your account.');
        }
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setIsLoading(true);
    setMessage(null);
    setError(null);
    try {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });
      if (error) throw error;
      setMessage('Magic link sent. Check your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Magic link failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-xl shadow-sm p-6"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to Reddit Mastermind</h2>
        <p className="text-sm text-gray-500 mb-2">
          Use email/password or a magic link.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          If password login fails on localhost, enable Email/Password in Supabase Auth and add
          redirect URL: {typeof window !== 'undefined' ? redirectTo : 'http://localhost:3000/auth/callback'}
        </p>

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setMode('password')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              mode === 'password' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Email + Password
          </button>
          <button
            onClick={() => setMode('magic')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              mode === 'magic' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Magic Link
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="you@example.com"
            />
          </div>

          {mode === 'password' && (
            <div>
              <label className="text-sm text-gray-600">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder="••••••••"
              />
            </div>
          )}
        </div>

        {message && (
          <div className="mt-4 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-md p-2">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-md p-2">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-2">
          {mode === 'password' ? (
            <>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={isLoading}
                className="w-full py-2 bg-blue-600 text-white rounded-md font-medium"
                onClick={() => handlePasswordAuth(false)}
              >
                Sign In
              </motion.button>
              <button
                disabled={isLoading}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-md font-medium"
                onClick={() => handlePasswordAuth(true)}
              >
                Create Account
              </button>
              <button
                disabled={isLoading}
                className="w-full py-2 bg-white text-gray-500 rounded-md text-sm underline"
                onClick={handleMagicLink}
              >
                Create via Magic Link
              </button>
            </>
          ) : (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={isLoading}
              className="w-full py-2 bg-blue-600 text-white rounded-md font-medium"
              onClick={handleMagicLink}
            >
              Send Magic Link
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
