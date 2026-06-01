import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/auth/reset-password', origin));
      }
      // Email confirmation (signup, email_change, etc.)
      return NextResponse.redirect(new URL('/auth/confirmed', origin));
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_error', origin));
}
