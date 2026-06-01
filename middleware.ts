import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Korumalı rotalar: /app ve /araclar/* — giriş yoksa /login'e yönlendir
  const isProtected =
    pathname === '/app' ||
    pathname.startsWith('/app/') ||
    pathname === '/araclar' ||
    pathname.startsWith('/araclar/') ||
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/');

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Zaten giriş yapmış → /login'den uzaklaştır
  if (user && pathname === '/login') {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = '/araclar/takbis-okuyucu';
    return NextResponse.redirect(appUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/app', '/app/(.*)', '/araclar', '/araclar/(.*)', '/dashboard', '/dashboard/(.*)', '/login'],
};
