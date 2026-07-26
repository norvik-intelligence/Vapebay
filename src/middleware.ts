import { NextResponse, type NextRequest } from 'next/server';

import { ADMIN_COOKIE, verifySession } from '@/lib/admin/auth';

/**
 * Gate for /admin and the admin API.
 *
 * This is the application-level check. The Caddy basic-auth block in front of
 * it is a second, independent layer — neither is a substitute for the other:
 * the proxy protects against anyone reaching Next.js at all, this protects
 * against a misconfigured or bypassed proxy.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // The login page and its endpoint must stay reachable, or there is no way in.
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  const authorised = await verifySession(request.cookies.get(ADMIN_COOKIE)?.value);
  if (authorised) return NextResponse.next();

  // API callers get a status code, not an HTML redirect they cannot follow.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const login = request.nextUrl.clone();
  login.pathname = '/admin/login';
  login.search = '';
  // Preserve where they were headed so login lands them there, not on a
  // generic dashboard.
  login.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
