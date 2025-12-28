import { NextResponse } from 'next/server';

export async function GET() {
  const provider = (process.env.LLM_PROVIDER || '').toLowerCase();
  const usingCerebras = provider === 'cerebras' || (!provider && process.env.CEREBRAS_API_KEY);
  const hasKey = usingCerebras
    ? Boolean(process.env.CEREBRAS_API_KEY)
    : Boolean(process.env.GEMINI_API_KEY);
  const model = usingCerebras
    ? process.env.CEREBRAS_MODEL || 'llama-3.3-70b'
    : process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  return NextResponse.json({
    mode: hasKey ? 'live' : 'error',
    model,
    provider: usingCerebras ? 'cerebras' : 'gemini',
  });
}
