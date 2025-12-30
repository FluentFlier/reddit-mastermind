import { 
  AssignedSlot, 
  Post, 
  Comment, 
  Thread, 
  Company,
  Persona,
  GenerationPreferences,
  PlannerConstraints,
} from '@/types';
import { 
  generateId, 
  generatePostId, 
  generateCommentId,
  addMinutes,
  calculateSimilarity,
} from '@/lib/utils';
import { generateCommentDelay, DEFAULT_CONSTRAINTS } from './constraints';
import { 
  generateWithAI, 
  isMockMode, 
  generateWithAIMock,
} from '@/lib/ai/openai';
import { 
  buildPostPrompt, 
  buildCommentPrompt, 
  buildOPFollowUpPrompt,
  buildVariationPrompt,
} from '@/lib/ai/prompts';

// ============================================
// THREAD GENERATOR
// ============================================

export interface ThreadGeneratorConfig {
  slots: AssignedSlot[];
  company: Company;
  personas: Persona[];
  weekNumber: number;
  preferences?: GenerationPreferences;
  constraints?: PlannerConstraints;
  weeklyGoals?: string[];
  riskTolerance?: 'low' | 'medium' | 'high';
}

export interface ThreadGeneratorResult {
  threads: Thread[];
  metadata: {
    totalPosts: number;
    totalComments: number;
    generationTime: number;
    errors: string[];
  };
}

/**
 * Generates content for all threads
 */
export async function generateThreads(
  config: ThreadGeneratorConfig
): Promise<ThreadGeneratorResult> {
  const { slots, company, weekNumber } = config;
  const effectiveConstraints = config.constraints || DEFAULT_CONSTRAINTS;
  
  const startTime = Date.now();
  const threads: Thread[] = [];
  const errors: string[] = [];
  let totalComments = 0;
  
  for (const slot of slots) {
    try {
      const thread = await generateThread({
        slot,
        company,
        weekNumber,
        preferences: config.preferences,
        constraints: effectiveConstraints,
        weeklyGoals: config.weeklyGoals,
        riskTolerance: config.riskTolerance,
      });
      
      threads.push(thread);
      totalComments += thread.comments.length;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to generate thread for ${slot.subreddit.name}: ${errorMsg}`);
    }
  }
  
  return {
    threads,
    metadata: {
      totalPosts: threads.length,
      totalComments,
      generationTime: Date.now() - startTime,
      errors,
    },
  };
}

export async function regenerateThread(config: {
  slot: AssignedSlot;
  company: Company;
  weekNumber: number;
  preferences?: GenerationPreferences;
  constraints?: PlannerConstraints;
  weeklyGoals?: string[];
  riskTolerance?: 'low' | 'medium' | 'high';
}): Promise<Thread> {
  return generateThread(config);
}

/**
 * Generates a single thread (post + comments)
 */
async function generateThread(config: {
  slot: AssignedSlot;
  company: Company;
  weekNumber: number;
  preferences?: GenerationPreferences;
  constraints?: PlannerConstraints;
  weeklyGoals?: string[];
  riskTolerance?: 'low' | 'medium' | 'high';
}): Promise<Thread> {
  const { slot, company, weekNumber, preferences, constraints, weeklyGoals, riskTolerance } = config;
  
  // Generate the main post
  const post = await generatePost({
    slot,
    company,
    weekNumber,
    preferences,
    constraints,
    weeklyGoals,
    riskTolerance,
  });
  
  // Generate comments
  const comments = await generateComments({
    post,
    slot,
    company,
    preferences,
    constraints,
    weeklyGoals,
    riskTolerance,
  });
  
  return { post, comments, slot };
}

/**
 * Generates a post
 */
async function generatePost(config: {
  slot: AssignedSlot;
  company: Company;
  weekNumber: number;
  preferences?: GenerationPreferences;
  constraints?: PlannerConstraints;
  weeklyGoals?: string[];
  riskTolerance?: 'low' | 'medium' | 'high';
}): Promise<Post> {
  const { slot, company, weekNumber, preferences, weeklyGoals, riskTolerance } = config;
  
  const prompt = buildPostPrompt({
    persona: slot.opPersona,
    subreddit: slot.subreddit,
    keywords: slot.keywords,
    company,
    threadType: slot.threadType,
    preferences,
    weeklyGoals,
    riskTolerance,
  });
  
  let content: { title: string; body: string };
  
  if (isMockMode()) {
    const result = await generateWithAIMock<{ title: string; body: string }>(
      prompt,
      generateMockPost(slot)
    );
    content = result.data!;
  } else {
    const result = await generateWithAI<{ title: string; body: string }>(prompt);
    
    if (!result.success || !result.data || typeof result.data.title !== 'string' || typeof result.data.body !== 'string') {
      throw new Error(`AI post generation failed for ${slot.subreddit.name}: ${result.error || 'invalid response'}`);
    }
    content = result.data;
  }
  
  const sanitizedBody = await sanitizePostBody(
    content.body,
    company,
    preferences,
    slot.keywords.map((k) => k.keyword)
  );

  return {
    id: generatePostId(),
    companyId: company.id,
    weekNumber,
    subredditId: slot.subreddit.id,
    subredditName: slot.subreddit.name,
    personaId: slot.opPersona.id,
    personaUsername: slot.opPersona.username,
    title: sanitizePostTitle(content.title, company, preferences),
    body: sanitizedBody,
    scheduledAt: slot.date,
    keywordIds: slot.keywords.map(k => k.id),
    threadType: slot.threadType,
    status: 'draft',
  };
}

/**
 * Generates comments for a post
 */
async function generateComments(config: {
  post: Post;
  slot: AssignedSlot;
  company: Company;
  preferences?: GenerationPreferences;
  constraints?: PlannerConstraints;
  weeklyGoals?: string[];
  riskTolerance?: 'low' | 'medium' | 'high';
}): Promise<Comment[]> {
  const { post, slot, company, preferences, constraints, weeklyGoals, riskTolerance } = config;
  const effectiveConstraints = constraints || DEFAULT_CONSTRAINTS;
  
  const comments: Comment[] = [];
  const usedMockComments = new Set<string>();
  let lastTimestamp = post.scheduledAt;
  
  // Determine which comments (if any) should mention the product
  const subredditAllowsPromo = slot.subreddit.rules?.allowsSelfPromotion !== false;
  const allowProduct = preferences?.allowProductMention !== false && riskTolerance !== 'low' && subredditAllowsPromo;
  const mentionTargetCount = allowProduct
    ? Math.max(0, preferences?.productMentionCount ?? 0)
    : 0;
  const maxMentionCount = Math.min(mentionTargetCount, slot.commenterPersonas.length);
  const mentionIndices = new Set<number>();

  if (allowProduct && maxMentionCount > 0) {
    while (mentionIndices.size < maxMentionCount) {
      mentionIndices.add(Math.floor(Math.random() * slot.commenterPersonas.length));
    }
  }

  const forceProduct = allowProduct && maxMentionCount === 0 && shouldForceProductMention(post);
  const mentionProductIndex = allowProduct && maxMentionCount === 0
    ? (forceProduct ? 0 : (shouldMentionProduct(slot.commenterPersonas) ? Math.floor(Math.random() * slot.commenterPersonas.length) : -1))
    : -1;
  
  const disagreementIndex =
    preferences?.requireDisagreement && slot.commenterPersonas.length > 1
      ? Math.floor(Math.random() * slot.commenterPersonas.length)
      : -1;

  for (let i = 0; i < slot.commenterPersonas.length; i++) {
    const persona = slot.commenterPersonas[i];
    
    // Calculate delay
    const delayMinutes = generateCommentDelay(i, false, effectiveConstraints);
    const commentTime = addMinutes(lastTimestamp, delayMinutes);
    
    const prompt = buildCommentPrompt({
      post,
      previousComments: comments,
      persona,
      company,
      isFirstComment: i === 0,
      shouldMentionProduct: allowProduct && (mentionIndices.has(i) || i === mentionProductIndex),
      preferences,
      forceDisagreement: i === disagreementIndex,
      weeklyGoals,
      riskTolerance,
    });
    
    let content: { text: string };
    
    if (isMockMode()) {
      let mock = generateMockComment(persona, i === 0);
      let attempts = 0;
      while (usedMockComments.has(mock.text) && attempts < 5) {
        mock = generateMockComment(persona, i === 0);
        attempts += 1;
      }
      usedMockComments.add(mock.text);
      const result = await generateWithAIMock<{ text: string }>(prompt, mock);
      content = result.data!;
    } else {
      const result = await generateWithAI<{ text: string }>(prompt);
      
      if (!result.success || !result.data || typeof result.data.text !== 'string') {
        throw new Error(`AI comment generation failed for ${persona.username}: ${result.error || 'invalid response'}`);
      }
      content = result.data;
    }
    
    let finalText = content.text;

    if (!isMockMode()) {
      const similarToPrevious = comments.some((prev) =>
        calculateSimilarity(prev.content, finalText) > 0.5
      );

      if (similarToPrevious) {
        const revised = await regenerateComment(prompt, finalText, {
          ...preferences,
          commentGuidelines: [
            preferences?.commentGuidelines,
            'Avoid repeating previous comments; add a distinct angle.',
          ].filter(Boolean).join(' '),
        });
        if (revised) {
          finalText = revised;
        }
      }

      const stillTooSimilar = comments.some((prev) =>
        calculateSimilarity(prev.content, finalText) > 0.5
      );
      if (stillTooSimilar) {
        const forced = await regenerateComment(prompt, finalText, {
          ...preferences,
          commentGuidelines: [
            preferences?.commentGuidelines,
            'Make this comment clearly different in phrasing and viewpoint.',
          ].filter(Boolean).join(' '),
        });
        if (forced) {
          finalText = forced;
        }
      }
    }

    if (!isMockMode()) {
      const needsFix = isCommentLowQuality(
        finalText,
        company,
        preferences,
        mentionIndices.has(i) || i === mentionProductIndex
      );

      if (needsFix) {
        const revised = await regenerateComment(prompt, finalText, preferences);
        if (revised) {
          finalText = revised;
        }
      }
    }

    if (!isMockMode()) {
      const companyName = company.name.toLowerCase();
      const allowProduct = preferences?.allowProductMention !== false;
      if (!allowProduct && finalText.toLowerCase().includes(companyName) && i !== mentionProductIndex && !mentionIndices.has(i)) {
        const revised = await removeCompanyMention(finalText, company.name);
        if (revised) {
          finalText = revised;
        }
      }
    }

    if (!isMockMode()) {
      const tooShort = preferences?.minCommentLength && finalText.trim().length < preferences.minCommentLength;
      const tooLong = preferences?.maxCommentLength && finalText.trim().length > preferences.maxCommentLength;
      const stillTooSimilar = comments.some((prev) => calculateSimilarity(prev.content, finalText) > 0.5);
      if (tooShort || tooLong || stillTooSimilar) {
        const revised = await regenerateComment(prompt, finalText, {
          ...preferences,
          commentGuidelines: [
            preferences?.commentGuidelines,
            'Keep length natural and avoid repeating previous comments.',
          ].filter(Boolean).join(' '),
        });
        if (revised) finalText = revised;
      }
    }

    if (preferences?.maxCommentLength && finalText.length > preferences.maxCommentLength) {
      finalText = clampToLength(finalText, preferences.maxCommentLength);
    }

    comments.push({
      id: generateCommentId(),
      postId: post.id,
      parentCommentId: i === 0 ? null : comments[i - 1]?.id || null,
      personaId: persona.id,
      personaUsername: persona.username,
      content: finalText,
      scheduledAt: commentTime,
      delayMinutes,
      status: 'draft',
    });
    
    lastTimestamp = commentTime;
  }
  
  // Maybe add OP follow-up
  if (Math.random() > 0.5 && comments.length > 0) {
    const opFollowUp = await generateOPFollowUp({
      post,
      comments,
      slot,
      company,
      lastTimestamp,
      constraints,
    });
    
    if (opFollowUp) {
      comments.push(opFollowUp);
    }
  }

  if (allowProduct && (maxMentionCount > 0 || mentionProductIndex >= 0)) {
    const mentionNeeded = maxMentionCount > 0 ? maxMentionCount : 1;
    const mentionCount = comments.filter((c) =>
      c.content.toLowerCase().includes(company.name.toLowerCase())
    ).length;
    const missingCount = Math.max(0, mentionNeeded - mentionCount);

    if (missingCount > 0) {
      const targets = maxMentionCount > 0
        ? Array.from(mentionIndices)
        : [mentionProductIndex].filter((idx) => idx >= 0);

      for (const idx of targets.slice(0, missingCount)) {
        const persona = slot.commenterPersonas[Math.min(idx, slot.commenterPersonas.length - 1)];
        const forcePrompt = buildCommentPrompt({
          post,
          previousComments: comments,
          persona,
          company,
          isFirstComment: idx === 0,
          shouldMentionProduct: true,
          preferences: {
            ...preferences,
            commentGuidelines: [
              preferences?.commentGuidelines,
              `Mention ${company.name} once, naturally.`,
            ].filter(Boolean).join(' '),
          },
          forceDisagreement: idx === disagreementIndex,
        });
        const result = await generateWithAI<{ text: string }>(forcePrompt);
        if (result.success && result.data?.text) {
          const targetIndex = comments.findIndex((c) => c.personaId === persona.id);
          if (targetIndex >= 0) {
            comments[targetIndex].content = result.data.text;
          }
        }
      }
    }
  }
  
  return comments;
}

/**
 * Generates an OP follow-up comment
 */
async function generateOPFollowUp(config: {
  post: Post;
  comments: Comment[];
  slot: AssignedSlot;
  company: Company;
  lastTimestamp: Date;
  constraints?: PlannerConstraints;
}): Promise<Comment | null> {
  const { post, comments, slot, company, lastTimestamp, constraints } = config;
  const effectiveConstraints = constraints || DEFAULT_CONSTRAINTS;
  
  const prompt = buildOPFollowUpPrompt({
    post,
    comments,
    persona: slot.opPersona,
    company,
  });
  
  const delayMinutes = generateCommentDelay(0, true, effectiveConstraints);
  const commentTime = addMinutes(lastTimestamp, delayMinutes);
  
  let content: { text: string };
  
  if (isMockMode()) {
    const result = await generateWithAIMock<{ text: string }>(
      prompt,
      { text: "Thanks everyone, this is really helpful! I'll definitely check these out." }
    );
    content = result.data!;
  } else {
    const result = await generateWithAI<{ text: string }>(prompt);

    if (!result.success || !result.data || typeof result.data.text !== 'string') {
      throw new Error(`AI OP follow-up failed for ${slot.subreddit.name}: ${result.error || 'invalid response'}`);
    }
    content = result.data;
  }
  
  let finalText = content.text;
  if (!isMockMode() && finalText.toLowerCase().includes(company.name.toLowerCase())) {
    const revised = await removeCompanyMention(finalText, company.name);
    if (revised) finalText = revised;
  }

  return {
    id: generateCommentId(),
    postId: post.id,
    parentCommentId: comments[comments.length - 1]?.id || null,
    personaId: slot.opPersona.id,
    personaUsername: slot.opPersona.username,
    content: finalText,
    scheduledAt: commentTime,
    delayMinutes,
    status: 'draft',
  };
}

/**
 * Determines if any comment should mention the product
 */
function shouldMentionProduct(commenters: Persona[]): boolean {
  // Only mention product in ~30% of threads
  if (Math.random() > 0.3) {
    return false;
  }
  
  // Only if there's an "expert" persona who could naturally recommend it
  return commenters.some(p => p.postingStyle === 'gives_answers');
}

function shouldForceProductMention(post: Post): boolean {
  const text = `${post.title} ${post.body}`.toLowerCase();
  const triggers = ['recommend', 'tool', 'software', 'presentation', 'slides', 'deck', 'ai', 'template'];
  return triggers.some((t) => text.includes(t));
}

// ============================================
// MOCK DATA GENERATORS (for testing)
// ============================================

function generateMockPost(slot: AssignedSlot): { title: string; body: string } {
  const titles: Record<string, string[]> = {
    question: [
      `Best ${slot.keywords[0]?.keyword || 'tool'} for ${slot.subreddit.name.replace('r/', '')}?`,
      `What's everyone using for ${slot.keywords[0]?.keyword || 'this'}?`,
      `Looking for recommendations - ${slot.keywords[0]?.keyword || 'help needed'}`,
    ],
    advice: [
      `Need help with ${slot.keywords[0]?.keyword || 'something'}`,
      `Tips for ${slot.keywords[0]?.keyword || 'improving workflow'}?`,
      `How do you handle ${slot.keywords[0]?.keyword || 'this challenge'}?`,
    ],
    story: [
      `Just discovered ${slot.keywords[0]?.keyword || 'something cool'}`,
      `Finally figured out ${slot.keywords[0]?.keyword || 'a solution'}`,
      `My experience with ${slot.keywords[0]?.keyword || 'this approach'}`,
    ],
    discussion: [
      `What do you think about ${slot.keywords[0]?.keyword || 'this topic'}?`,
      `${slot.keywords[0]?.keyword || 'This topic'} - thoughts?`,
      `Anyone else noticed ${slot.keywords[0]?.keyword || 'this trend'}?`,
    ],
  };
  
  const bodies = [
    "Been looking into this for a while and curious what others think. Any recommendations?",
    "Title says it all. Would love to hear your experiences.",
    "I've tried a few things but nothing quite fits. What's worked for you?",
  ];
  
  const titleOptions = titles[slot.threadType] || titles.question;
  
  return {
    title: titleOptions[Math.floor(Math.random() * titleOptions.length)],
    body: bodies[Math.floor(Math.random() * bodies.length)],
  };
}

function generateMockComment(persona: Persona, isFirst: boolean): { text: string } {
  const expertResponses = [
    "I've been using Slideforge for this - it handles the layout automatically so you can focus on content.",
    "Tried a few options. Slideforge was the one that actually saved me time.",
    "Yeah, this is a common issue. I'd recommend looking into tools that automate the formatting part.",
  ];
  
  const casualResponses = [
    "+1, interested in this too",
    "Same boat here. Following for recommendations.",
    "I've heard good things about a few tools, curious what others suggest.",
  ];
  
  const responses = persona.postingStyle === 'gives_answers' 
    ? expertResponses 
    : casualResponses;
  
  return {
    text: responses[Math.floor(Math.random() * responses.length)],
  };
}

function sanitizePostTitle(
  title: string,
  company: Company,
  preferences?: GenerationPreferences
): string {
  let next = title.trim();
  if (!next) {
    next = 'Thoughts on this?';
  }
  if (next.toLowerCase().includes(company.name.toLowerCase())) {
    next = next.replace(new RegExp(company.name, 'ig'), 'this tool');
  }
  if (preferences?.bannedPhrases?.length) {
    for (const phrase of preferences.bannedPhrases) {
      next = next.replace(new RegExp(phrase, 'ig'), '').trim();
    }
  }
  return next;
}

async function sanitizePostBody(
  body: string,
  company: Company,
  preferences?: GenerationPreferences,
  keywords: string[] = []
): Promise<string> {
  let next = body.trim();
  const lower = next.toLowerCase();

  const tooShort = preferences?.minPostLength && next.length < preferences.minPostLength;
  const tooLong = preferences?.maxPostLength && next.length > preferences.maxPostLength;
  const hasCompany = lower.includes(company.name.toLowerCase());
  const hasBanned = preferences?.bannedPhrases?.some((phrase) => lower.includes(phrase.toLowerCase()));

  if (isMockMode()) {
    return next;
  }

  const missingKeyword = keywords.length > 0
    ? !keywords.some((kw) => lower.includes(kw.toLowerCase()))
    : false;

  if (tooShort || tooLong || hasCompany || hasBanned || missingKeyword) {
    const instructions = `Rewrite to be natural and concise. Avoid mentioning ${company.name}.`;
    const prompt = buildVariationPrompt(next, instructions);
    const result = await generateWithAI<{ variation: string }>(prompt, {
      temperature: 0.7,
      maxTokens: 400,
    });
    if (result.success && result.data?.variation) {
      next = result.data.variation;
    }
  }

  if (!isMockMode() && next.toLowerCase().includes(company.name.toLowerCase())) {
    const revised = await removeCompanyMention(next, company.name);
    if (revised) next = revised;
  }

  if (preferences?.maxPostLength && next.length > preferences.maxPostLength) {
    next = clampToLength(next, preferences.maxPostLength);
  }

  return next;
}

function isCommentLowQuality(
  text: string,
  company: Company,
  preferences?: GenerationPreferences,
  allowProductMention?: boolean
): boolean {
  const trimmed = text.trim();
  if (preferences?.minCommentLength && trimmed.length < preferences.minCommentLength) {
    return true;
  }
  if (preferences?.maxCommentLength && trimmed.length > preferences.maxCommentLength) {
    return true;
  }
  if (preferences?.bannedPhrases?.some((phrase) => trimmed.toLowerCase().includes(phrase.toLowerCase()))) {
    return true;
  }
  if (!allowProductMention && trimmed.toLowerCase().includes(company.name.toLowerCase())) {
    return true;
  }
  return false;
}

function clampToLength(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  let result = '';
  for (const sentence of sentences) {
    const next = result ? `${result} ${sentence}` : sentence;
    if (next.length > maxLen) break;
    result = next;
  }
  if (result && result.length <= maxLen) return result;
  let sliced = trimmed.slice(0, maxLen).trim();
  const lastPunct = Math.max(sliced.lastIndexOf('.'), sliced.lastIndexOf('!'), sliced.lastIndexOf('?'));
  if (lastPunct > Math.max(30, Math.floor(maxLen * 0.5))) {
    sliced = sliced.slice(0, lastPunct + 1);
  }
  return sliced.trim();
}

async function removeCompanyMention(text: string, companyName: string): Promise<string | null> {
  const prompt = buildVariationPrompt(
    text,
    `Rewrite to remove any mention of ${companyName} and keep it natural.`
  );
  const result = await generateWithAI<{ variation: string }>(prompt, {
    temperature: 0.7,
    maxTokens: 200,
  });
  if (!result.success || !result.data?.variation) return null;
  return result.data.variation;
}

async function regenerateComment(
  originalPrompt: string,
  originalText: string,
  preferences?: GenerationPreferences
): Promise<string | null> {
  const extraRules = preferences?.commentGuidelines
    ? `\nExtra guidance: ${preferences.commentGuidelines}`
    : '';

  const variationPrompt = buildVariationPrompt(
    originalText,
    `Rewrite to be natural, specific, and on-topic. Avoid banned phrases. Keep it concise.${extraRules}`
  );

  const result = await generateWithAI<{ variation: string }>(variationPrompt, {
    temperature: 0.7,
    maxTokens: 300,
  });

  if (!result.success || !result.data?.variation) {
    return null;
  }

  return result.data.variation;
}
