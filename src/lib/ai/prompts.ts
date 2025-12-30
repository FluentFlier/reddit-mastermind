import { 
  Persona, 
  Subreddit, 
  Keyword, 
  Company, 
  ThreadType,
  Post,
  Comment,
  GenerationPreferences,
} from '@/types';

// ============================================
// PROMPT TEMPLATES
// ============================================

/**
 * Builds a prompt for generating a Reddit post
 */
export function buildPostPrompt(config: {
  persona: Persona;
  subreddit: Subreddit;
  keywords: Keyword[];
  company: Company;
  threadType: ThreadType;
  preferences?: GenerationPreferences;
  weeklyGoals?: string[];
  riskTolerance?: 'low' | 'medium' | 'high';
}): string {
  const { persona, subreddit, keywords, company, threadType, preferences, weeklyGoals, riskTolerance } = config;
  
  const keywordList = keywords.map(k => k.keyword).join(', ');
  
  return `You are writing a Reddit post as "${persona.username}".

=== PERSONA ===
Username: ${persona.username}
Background: ${persona.bio}
Voice/Style: ${persona.voiceTraits}
Expertise: ${persona.expertise.join(', ')}
Posting Style: ${persona.postingStyle === 'asks_questions' ? 'Tends to ask questions and seek advice' : 
                 persona.postingStyle === 'gives_answers' ? 'Tends to share expertise and help others' : 
                 'Balanced - both asks and answers'}
${persona.accountAgeDays ? `Account age: ~${persona.accountAgeDays} days` : ''}
${persona.karma ? `Karma: ~${persona.karma}` : ''}

=== SUBREDDIT ===
Posting to: ${subreddit.name}
${subreddit.description ? `About: ${subreddit.description}` : ''}
${subreddit.sensitivity ? `Sensitivity: ${subreddit.sensitivity}` : ''}
${subreddit.rules?.allowsSelfPromotion === false ? 'Rule: self-promotion is not allowed' : ''}

=== TARGET TOPICS ===
Keywords to incorporate naturally: ${keywordList}

=== WEEKLY GOALS ===
${weeklyGoals?.length ? weeklyGoals.map(goal => `- ${goal}`).join('\n') : 'Not specified'}

=== RISK TOLERANCE ===
${riskTolerance || 'medium'} (lower = more conservative, higher = more experimental)

=== THREAD TYPE: ${threadType.toUpperCase()} ===
${getThreadTypeInstructions(threadType)}

=== COMPANY CONTEXT (for your awareness only) ===
${company.name}: ${company.description}
NOTE: Do NOT mention ${company.name} directly in the post. The goal is to create authentic discussion around topics that ${company.name} can help with.

=== CRITICAL RULES ===
1. Write as a real person, NOT a marketer
2. Match the persona's voice and expertise level
3. Keep it authentic to how this person would actually post
4. Use casual language appropriate for Reddit
5. Include minor imperfections (contractions, informal phrasing)
6. Title should be natural, not clickbait
7. Body should be 2-4 sentences max
8. NEVER mention the company name
9. Don't be too polished - Reddit users are suspicious of overly professional posts
${preferences?.minPostLength ? `10. Minimum post length: ${preferences.minPostLength} characters` : ''}
${preferences?.maxPostLength ? `11. Hard max: ${preferences.maxPostLength} characters (stop early).` : ''}
${preferences?.bannedPhrases?.length ? `12. Avoid these phrases: ${preferences.bannedPhrases.join(', ')}` : ''}
${preferences?.campaignBrief ? `13. Campaign brief (must follow exactly, do not expand or add extra context): ${preferences.campaignBrief}` : ''}
${preferences?.postGuidelines ? `14. Additional guidance: ${preferences.postGuidelines}` : ''}

=== OUTPUT FORMAT ===
Respond with JSON only:
{
  "title": "Your post title here",
  "body": "Your post body here"
}`;
}

/**
 * Gets instructions for each thread type
 */
function getThreadTypeInstructions(threadType: ThreadType): string {
  const instructions: Record<ThreadType, string> = {
    question: `Write a genuine question seeking help, opinions, or recommendations.
- Frame it as a real problem or curiosity you have
- Be specific enough to get useful answers
- Show you've thought about it but need community input
- Examples: "What's the best...", "Has anyone tried...", "How do you handle..."`,
    
    advice: `Ask for recommendations or best practices on a specific topic.
- Describe your situation briefly
- Be clear about what kind of advice you need
- Show openness to different solutions
- Examples: "Looking for suggestions on...", "Need help deciding...", "Tips for..."`,
    
    story: `Share a brief personal experience or observation.
- Keep it conversational and relatable
- Include a specific detail that makes it feel real
- End with something that invites discussion
- Examples: "Just discovered...", "Finally figured out...", "Been using X and..."`,
    
    discussion: `Start an open-ended discussion on a relevant topic.
- Pose an interesting question or observation
- Invite multiple perspectives
- Be genuinely curious, not leading
- Examples: "What do you all think about...", "I've noticed that...", "Curious about..."`,
  };
  
  return instructions[threadType];
}

/**
 * Builds a prompt for generating a comment
 */
export function buildCommentPrompt(config: {
  post: Post;
  previousComments: Comment[];
  persona: Persona;
  company: Company;
  isFirstComment: boolean;
  shouldMentionProduct?: boolean;
  preferences?: GenerationPreferences;
  forceDisagreement?: boolean;
  weeklyGoals?: string[];
  riskTolerance?: 'low' | 'medium' | 'high';
}): string {
  const { post, previousComments, persona, company, isFirstComment, shouldMentionProduct = false, preferences, forceDisagreement, weeklyGoals, riskTolerance } = config;
  
  const previousContext = previousComments.length > 0
    ? `\n=== PREVIOUS COMMENTS ===\n${previousComments.map(c => 
        `${c.personaUsername}: "${c.content}"`
      ).join('\n')}`
    : '';
  
  return `You are "${persona.username}" commenting on a Reddit post.

=== YOUR PERSONA ===
Username: ${persona.username}
Background: ${persona.bio}
Voice/Style: ${persona.voiceTraits}
Expertise: ${persona.expertise.join(', ')}
Style: ${persona.postingStyle === 'gives_answers' ? 'You tend to provide helpful, substantive answers' : 
        persona.postingStyle === 'asks_questions' ? 'You relate to others and share your own experiences' : 
        'You engage naturally in discussions'}
${persona.accountAgeDays ? `Account age: ~${persona.accountAgeDays} days` : ''}
${persona.karma ? `Karma: ~${persona.karma}` : ''}

=== THE POST (by ${post.personaUsername}) ===
Title: ${post.title}
Body: ${post.body}
${previousContext}

=== WEEKLY GOALS ===
${weeklyGoals?.length ? weeklyGoals.map(goal => `- ${goal}`).join('\n') : 'Not specified'}

=== RISK TOLERANCE ===
${riskTolerance || 'medium'}

=== YOUR TASK ===
${isFirstComment 
  ? 'You are the first to respond. Provide a substantive answer or your perspective.'
  : 'Build on what others have said, add new information, or share a different angle.'}

${(shouldMentionProduct && preferences?.allowProductMention !== false)
  ? `If it fits naturally, you can mention ${company.name} as something you've used or heard about. But only if it genuinely fits the conversation - don't force it.`
  : `Do NOT mention ${company.name} in this comment.`}

=== COMMENT GUIDELINES ===
1. Sound like a real Reddit user, not a bot
2. Match your persona's voice and expertise
3. Keep it brief (1-3 sentences is typical for Reddit)
4. Add value - don't just agree, contribute something
5. Use casual language (contractions, abbreviations if fits persona)
6. Don't start with "Great question!" or similar platitudes
7. Reference something specific from the post or previous comments
8. Occasional light humor or personality is good
9. If you address someone, use their exact username from the post or comments (e.g., "${post.personaUsername}" or another listed commenter) or say "OP". Do NOT invent names.
${persona.postingStyle === 'gives_answers' 
  ? '10. Share practical advice or specific recommendations based on your expertise'
  : '10. Share your own experience or perspective on the topic'}
${forceDisagreement ? '11. Include a mild disagreement or nuance (e.g., "depends", "in my case", "but").' : ''}
${preferences?.minCommentLength ? `12. Minimum length: ${preferences.minCommentLength} characters` : ''}
${preferences?.maxCommentLength ? `13. Hard max: ${preferences.maxCommentLength} characters (stop early).` : ''}
${preferences?.bannedPhrases?.length ? `14. Avoid these phrases: ${preferences.bannedPhrases.join(', ')}` : ''}
${preferences?.campaignBrief ? `15. Campaign brief (must follow exactly, do not expand or add extra context): ${preferences.campaignBrief}` : ''}
${preferences?.commentGuidelines ? `16. Additional guidance: ${preferences.commentGuidelines}` : ''}

=== OUTPUT FORMAT ===
Respond with JSON only:
{
  "text": "Your comment here"
}`;
}

/**
 * Builds a prompt for generating an OP follow-up comment
 */
export function buildOPFollowUpPrompt(config: {
  post: Post;
  comments: Comment[];
  persona: Persona;
  company: Company;
}): string {
  const { post, comments, persona, company } = config;
  
  const commentsContext = comments.map(c => 
    `${c.personaUsername}: "${c.content}"`
  ).join('\n');
  
  return `You are "${persona.username}" - you posted this thread and are now responding to the comments.

=== YOUR PERSONA ===
Username: ${persona.username}
Background: ${persona.bio}
Voice/Style: ${persona.voiceTraits}

=== YOUR ORIGINAL POST ===
Title: ${post.title}
Body: ${post.body}

=== COMMENTS YOU'RE RESPONDING TO ===
${commentsContext}

=== YOUR TASK ===
Write a brief follow-up comment as the OP. You might:
- Thank someone for helpful advice
- Ask a follow-up question
- Share that you'll try their suggestion
- Provide additional context based on what was asked

=== GUIDELINES ===
1. Sound grateful and engaged (you asked for help and got it)
2. Be specific - reference something someone said
3. Keep it brief (1-2 sentences)
4. Natural, casual tone
5. Don't overdo the thanks
6. If you address someone, use their exact username from the comment list. Do NOT invent names.
7. Keep it to 1-2 sentences; be concise.
8. Don't claim you already solved the problem or found a different tool; stay consistent with the post.
9. Don't introduce a new tool or solution in the OP follow-up.

=== OUTPUT FORMAT ===
Respond with JSON only:
{
  "text": "Your follow-up comment here"
}`;
}

/**
 * Builds a prompt for evaluating content quality
 */
export function buildEvaluationPrompt(config: {
  post: Post;
  comments: Comment[];
  company: Company;
}): string {
  const { post, comments, company } = config;
  
  const threadContent = `
POST (${post.personaUsername}):
Title: ${post.title}
Body: ${post.body}

COMMENTS:
${comments.map(c => `${c.personaUsername}: "${c.content}"`).join('\n')}`;
  
  return `Evaluate this Reddit thread for naturalness and quality.

=== THREAD ===
${threadContent}

=== COMPANY CONTEXT ===
This thread was generated for ${company.name}: ${company.description}

=== EVALUATION CRITERIA ===
Rate each on 0-10:

1. NATURALNESS: Do the posts sound like real Reddit users?
   - Check for overly polished language
   - Look for authentic imperfections
   - Verify voice consistency per persona

2. CONVERSATION FLOW: Does the thread feel organic?
   - Do comments build on each other?
   - Is there appropriate variety in responses?
   - Does it avoid feeling scripted?

3. PROMOTIONAL SENSITIVITY: Is it subtle enough?
   - Any overt product mentions?
   - Does it feel like marketing?
   - Would Reddit users be suspicious?

4. VALUE: Does it add value to the subreddit?
   - Is the question/topic interesting?
   - Are the answers helpful?
   - Would real users engage?

=== OUTPUT FORMAT ===
Respond with JSON only:
{
  "scores": {
    "naturalness": <0-10>,
    "conversationFlow": <0-10>,
    "promotionalSensitivity": <0-10>,
    "value": <0-10>
  },
  "overallScore": <0-10>,
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;
}

// ============================================
// HELPER PROMPTS
// ============================================

/**
 * Builds a prompt for generating variations of content
 */
export function buildVariationPrompt(
  original: string,
  instructions: string
): string {
  return `Take this Reddit content and create a variation:

ORIGINAL:
${original}

INSTRUCTIONS:
${instructions}

Keep the same intent but make it feel fresh and different. Follow any campaign brief or constraints exactly.

Respond with JSON only:
{
  "variation": "Your varied version here"
}`;
}

/**
 * Builds a prompt for checking if content is too promotional
 */
export function buildPromoCheckPrompt(
  content: string,
  companyName: string
): string {
  return `Analyze this Reddit content for promotional language:

CONTENT:
${content}

COMPANY: ${companyName}

Check for:
1. Direct mentions of the company
2. Overly positive language that sounds like marketing
3. Phrases that sound like advertising
4. Suspiciously perfect recommendations

Respond with JSON only:
{
  "isPromotional": <true/false>,
  "promoScore": <0-10, where 10 is very promotional>,
  "flaggedPhrases": ["phrase 1", "phrase 2"],
  "suggestion": "How to make it less promotional"
}`;
}
