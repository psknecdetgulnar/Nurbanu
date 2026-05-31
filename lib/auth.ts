/**
 * All auth calls are centralised here.
 * Swap implementations (e.g. magic link) without touching callers.
 */
import { createClient } from './supabase/client';

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  const supabase = createClient();
  const result = await supabase.auth.signUp({ email, password });

  // Create profile row on successful registration
  if (result.data.user && !result.error) {
    await supabase.from('profiles').upsert(
      {
        id: result.data.user.id,
        email: result.data.user.email,
        plan: 'free',
      },
      { onConflict: 'id' }
    );
  }

  return result;
}

export async function signOut() {
  const supabase = createClient();
  return supabase.auth.signOut();
}

export async function getUser() {
  const supabase = createClient();
  return supabase.auth.getUser();
}
