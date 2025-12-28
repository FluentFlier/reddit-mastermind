import { supabase } from './client';
import {
  Company,
  Persona,
  Subreddit,
  Keyword,
  PlannerConstraints,
} from '@/types';

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

function mapCompany(row: any): Company {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    positioning: row.positioning || undefined,
    website: row.website || undefined,
    icpSegments: row.icp_segments || undefined,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    constraints: row.constraints || undefined,
    userId: row.user_id || undefined,
    userExternalId: row.user_external_id || undefined,
  };
}

function mapPersona(row: any): Persona {
  return {
    id: row.id,
    companyId: row.company_id,
    username: row.username,
    displayName: row.display_name || undefined,
    bio: row.bio,
    voiceTraits: row.voice_traits || '',
    expertise: row.expertise || [],
    postingStyle: row.posting_style,
    avatarColor: row.avatar_color || undefined,
  };
}

function mapSubreddit(row: any): Subreddit {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description || undefined,
    rules: row.rules || undefined,
    bestTimes: row.best_times || undefined,
  };
}

function mapKeyword(row: any): Keyword {
  return {
    id: row.id,
    companyId: row.company_id,
    keyword: row.keyword,
    category: row.category || undefined,
    priority: row.priority || undefined,
  };
}

export async function listCompanies(userExternalId: string): Promise<Company[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('companies')
    .select('*')
    .or(`user_external_id.eq.${userExternalId},user_external_id.is.null`)
    .order('created_at', { ascending: true });
  if (!error) return (data || []).map(mapCompany);
  if (error.code === 'PGRST204' && error.message?.includes('user_external_id')) {
    const fallback = await client.from('companies').select('*').order('created_at', { ascending: true });
    if (fallback.error) throw fallback.error;
    return (fallback.data || []).map(mapCompany);
  }
  throw error;
}

export async function findCompanyByName(name: string): Promise<Company | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('companies')
    .select('*')
    .eq('name', name)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCompany(data) : null;
}

export async function upsertCompany(
  company: Partial<Company> & { name: string },
  userExternalId: string
): Promise<Company> {
  const client = requireSupabase();
  const payload = {
    id: company.id,
    user_external_id: userExternalId,
    name: company.name,
    description: company.description || null,
    positioning: company.positioning || null,
    website: company.website || null,
    icp_segments: company.icpSegments || null,
    constraints: company.constraints || null,
  };
  const { data, error } = await client
    .from('companies')
    .upsert(payload)
    .select('*')
    .single();
  if (!error) return mapCompany(data);
  if (error.code === 'PGRST204' && error.message?.includes('user_external_id')) {
    const { user_external_id, ...fallbackPayload } = payload;
    const fallback = await client
      .from('companies')
      .upsert(fallbackPayload)
      .select('*')
      .single();
    if (fallback.error) throw fallback.error;
    return mapCompany(fallback.data);
  }
  throw error;
}

export async function upsertCompanyGlobal(
  company: Partial<Company> & { name: string }
): Promise<Company> {
  const client = requireSupabase();
  const payload = {
    id: company.id,
    name: company.name,
    description: company.description || null,
    positioning: company.positioning || null,
    website: company.website || null,
    icp_segments: company.icpSegments || null,
    constraints: company.constraints || null,
  };
  const { data, error } = await client
    .from('companies')
    .upsert({ ...payload, user_external_id: null })
    .select('*')
    .single();
  if (!error) return mapCompany(data);
  if (error.code === 'PGRST204' && error.message?.includes('user_external_id')) {
    const fallback = await client
      .from('companies')
      .upsert(payload)
      .select('*')
      .single();
    if (fallback.error) throw fallback.error;
    return mapCompany(fallback.data);
  }
  throw error;
}

export async function deleteCompany(companyId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('companies').delete().eq('id', companyId);
  if (error) throw error;
}

export async function listPersonas(companyId: string): Promise<Persona[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('personas')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapPersona);
}

export async function upsertPersona(persona: Partial<Persona> & { companyId: string; username: string; bio: string }): Promise<Persona> {
  const client = requireSupabase();
  const payload = {
    id: persona.id,
    company_id: persona.companyId,
    username: persona.username,
    display_name: persona.displayName || null,
    bio: persona.bio,
    voice_traits: persona.voiceTraits || null,
    expertise: persona.expertise || [],
    posting_style: persona.postingStyle || 'balanced',
    avatar_color: persona.avatarColor || null,
  };
  const { data, error } = await client
    .from('personas')
    .upsert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return mapPersona(data);
}

export async function deletePersona(personaId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('personas').delete().eq('id', personaId);
  if (error) throw error;
}

export async function listSubreddits(companyId: string): Promise<Subreddit[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('subreddits')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapSubreddit);
}

export async function upsertSubreddit(subreddit: Partial<Subreddit> & { companyId: string; name: string }): Promise<Subreddit> {
  const client = requireSupabase();
  const payload = {
    id: subreddit.id,
    company_id: subreddit.companyId,
    name: subreddit.name,
    description: subreddit.description || null,
    rules: subreddit.rules || null,
    best_times: subreddit.bestTimes || null,
  };
  const { data, error } = await client
    .from('subreddits')
    .upsert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return mapSubreddit(data);
}

export async function deleteSubreddit(subredditId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('subreddits').delete().eq('id', subredditId);
  if (error) throw error;
}

export async function listKeywords(companyId: string): Promise<Keyword[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('keywords')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapKeyword);
}

export async function upsertKeyword(keyword: Partial<Keyword> & { companyId: string; keyword: string }): Promise<Keyword> {
  const client = requireSupabase();
  const payload = {
    id: keyword.id,
    company_id: keyword.companyId,
    keyword: keyword.keyword,
    category: keyword.category || null,
    priority: keyword.priority || 0,
  };
  const { data, error } = await client
    .from('keywords')
    .upsert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return mapKeyword(data);
}

export async function deleteKeyword(keywordId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('keywords').delete().eq('id', keywordId);
  if (error) throw error;
}

export async function updateCompanyConstraints(
  companyId: string,
  constraints: PlannerConstraints
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('companies')
    .update({ constraints })
    .eq('id', companyId);
  if (error) throw error;
}
