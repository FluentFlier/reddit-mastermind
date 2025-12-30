import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyCalendar, setMockMode } from '@/lib/planner';
import { GenerateCalendarRequest, PlannerInput } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const provider = (process.env.LLM_PROVIDER || '').toLowerCase();
    const mockMode = process.env.MOCK_AI === 'true';

    if (provider && !['cerebras', 'gemini', 'ollama'].includes(provider)) {
      return NextResponse.json(
        { success: false, error: `Unsupported LLM_PROVIDER: ${process.env.LLM_PROVIDER}` },
        { status: 400 }
      );
    }

    if (provider === 'ollama') {
      return NextResponse.json(
        { success: false, error: 'LLM_PROVIDER=ollama is not supported yet' },
        { status: 400 }
      );
    }

    const usingCerebras = provider === 'cerebras' || (!provider && process.env.CEREBRAS_API_KEY);
    const resolvedProvider = usingCerebras ? 'cerebras' : 'gemini';

    if (!mockMode) {
      if (usingCerebras && !process.env.CEREBRAS_API_KEY) {
        return NextResponse.json(
          { success: false, error: 'CEREBRAS_API_KEY is not configured' },
          { status: 500 }
        );
      }
      if (!usingCerebras && !process.env.GEMINI_API_KEY) {
        return NextResponse.json(
          { success: false, error: 'GEMINI_API_KEY is not configured' },
          { status: 500 }
        );
      }
    }
    const body: GenerateCalendarRequest = await request.json();
    
    // Validate required fields
    if (!body.company || !body.personas || !body.subreddits || !body.keywords) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (body.personas.length < 2) {
      return NextResponse.json(
        { success: false, error: 'At least 2 personas are required' },
        { status: 400 }
      );
    }
    
    // Allow mock mode for local/dev flows
    setMockMode(mockMode);
    
    // Parse week start date
    const weekStartDate = new Date(body.weekStartDate);
    if (isNaN(weekStartDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid week start date' },
        { status: 400 }
      );
    }
    
    // Build planner input
    const input: PlannerInput = {
      company: body.company,
      personas: body.personas,
      subreddits: body.subreddits,
      keywords: body.keywords,
      postsPerWeek: body.postsPerWeek || 3,
      weekStartDate,
      weekNumber: body.weekNumber || getWeekNumber(weekStartDate),
      preferences: body.preferences,
      constraints: body.constraints || body.company?.constraints,
      weeklyGoals: body.weeklyGoals,
      riskTolerance: body.riskTolerance,
    };
    
    // Generate calendar
    const result = await generateWeeklyCalendar(input);
    
    return NextResponse.json({
      success: true,
      data: {
        posts: result.posts,
        comments: result.comments,
        qualityReport: result.qualityReport,
        debug: result.debug,
        weekNumber: result.weekNumber,
        generatedAt: result.generatedAt.toISOString(),
        meta: {
          mode: mockMode ? 'mock' : 'live',
          provider: resolvedProvider,
          model: usingCerebras
            ? process.env.CEREBRAS_MODEL || 'llama-3.3-70b'
            : process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        },
      },
    });
    
  } catch (error) {
    console.error('Calendar generation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Generation failed' 
      },
      { status: 500 }
    );
  }
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}
