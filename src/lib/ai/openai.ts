// ============================================
// LLM PROVIDERS
// ============================================

type Provider = 'cerebras' | 'gemini' | 'ollama';

const isMockEnvEnabled = () => process.env.MOCK_AI === 'true';

function getProvider(): Provider {
  const env = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (env === 'cerebras' || env === 'gemini' || env === 'ollama') return env;
  if (process.env.CEREBRAS_API_KEY) return 'cerebras';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return 'gemini';
}

function getCerebrasConfig() {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    throw new Error('CEREBRAS_API_KEY environment variable is not set');
  }
  const model = process.env.CEREBRAS_MODEL || 'llama-3.3-70b';
  return { apiKey, model, baseUrl: 'https://api.cerebras.ai/v1' };
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  return { apiKey, model };
}

// ============================================
// GENERATION FUNCTIONS
// ============================================

export interface GenerationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function generateWithAI<T>(
  prompt: string,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<GenerationResult<T>> {
  const {
    temperature = 0.8,
    maxTokens = 1000,
  } = options;

  try {
    const provider = getProvider();
    let text: string | undefined;

    if (provider === 'ollama') {
      return { success: false, error: 'LLM_PROVIDER=ollama is not supported yet' };
    }

    if (provider === 'cerebras') {
      const { apiKey, model: defaultModel, baseUrl } = getCerebrasConfig();
      const model = options.model || defaultModel;
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: `You are a helpful assistant that generates natural Reddit content. Always respond with valid JSON.\n\n${prompt}`,
            },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: `Cerebras error: ${response.status} ${errText}` };
      }

      const data = await response.json();
      text = data?.choices?.[0]?.message?.content;
    } else {
      const { apiKey, model: defaultModel } = getGeminiConfig();
      const model = options.model || defaultModel;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `You are a helpful assistant that generates natural Reddit content. Always respond with valid JSON.\n\n${prompt}` }],
              },
            ],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: `Gemini error: ${response.status} ${errText}` };
      }

      const data = await response.json();
      text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!text) {
      return { success: false, error: 'No content in LLM response' };
    }

    const parsed = safeParseJSON<T>(text);
    if (!parsed) {
      return { success: false, error: `Failed to parse JSON response from ${provider}` };
    }

    return { success: true, data: parsed };
  } catch (error) {
    console.error('LLM generation error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function safeParseJSON<T>(content: string): T | null {
  const cleaned = content.replace(/```json/gi, '```').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ============================================
// BATCH GENERATION
// ============================================

export async function generateBatch<T>(
  prompts: string[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    concurrency?: number;
  } = {}
): Promise<GenerationResult<T>[]> {
  const { concurrency = 3 } = options;
  
  const results: GenerationResult<T>[] = [];
  
  // Process in batches
  for (let i = 0; i < prompts.length; i += concurrency) {
    const batch = prompts.slice(i, i + concurrency);
    
    const batchResults = await Promise.all(
      batch.map(prompt => generateWithAI<T>(prompt, options))
    );
    
    results.push(...batchResults);
    
    // Small delay between batches to avoid rate limiting
    if (i + concurrency < prompts.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

// ============================================
// MOCK MODE (for testing without API)
// ============================================

let mockMode = isMockEnvEnabled();

export function setMockMode(enabled: boolean): void {
  mockMode = enabled;
}

export function isMockMode(): boolean {
  return mockMode || isMockEnvEnabled();
}

export async function generateWithAIMock<T>(
  prompt: string,
  mockData: T
): Promise<GenerationResult<T>> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  
  return {
    success: true,
    data: mockData,
    usage: {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    },
};
}
