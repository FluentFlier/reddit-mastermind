'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallback() {
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession();
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900">Signing you in…</h2>
        <p className="text-sm text-gray-500 mt-2">You can close this tab once you return to the app.</p>
      </div>
    </div>
  );
}
