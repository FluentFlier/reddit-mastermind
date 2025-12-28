import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
vi.stubEnv('OPENAI_API_KEY', 'test-key');
vi.stubEnv('MOCK_AI', 'true');

// Global test utilities
export const TEST_COMPANY = {
  id: 'test-company',
  name: 'Test Company',
  description: 'A test company for unit tests',
};

export const TEST_PERSONAS = [
  {
    id: 'persona-1',
    companyId: 'test-company',
    username: 'test_user_1',
    bio: 'First test persona',
    voiceTraits: 'casual',
    expertise: ['testing'],
    postingStyle: 'asks_questions' as const,
  },
  {
    id: 'persona-2',
    companyId: 'test-company',
    username: 'test_user_2',
    bio: 'Second test persona',
    voiceTraits: 'professional',
    expertise: ['testing'],
    postingStyle: 'gives_answers' as const,
  },
  {
    id: 'persona-3',
    companyId: 'test-company',
    username: 'test_user_3',
    bio: 'Third test persona',
    voiceTraits: 'balanced',
    expertise: ['testing'],
    postingStyle: 'balanced' as const,
  },
];

export const TEST_SUBREDDITS = [
  {
    id: 'sub-1',
    companyId: 'test-company',
    name: 'r/test1',
    description: 'First test subreddit',
  },
  {
    id: 'sub-2',
    companyId: 'test-company',
    name: 'r/test2',
    description: 'Second test subreddit',
  },
];

export const TEST_KEYWORDS = [
  {
    id: 'kw-1',
    companyId: 'test-company',
    keyword: 'test keyword 1',
    category: 'discovery',
  },
  {
    id: 'kw-2',
    companyId: 'test-company',
    keyword: 'test keyword 2',
    category: 'comparison',
  },
];
