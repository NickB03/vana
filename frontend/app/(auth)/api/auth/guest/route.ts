import { signIn } from '@/app/(auth)/auth';
import { isDevelopmentEnvironment } from '@/lib/constants';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const redirectParam = searchParams.get('redirectUrl');
  let redirectUrl = '/';
  try {
    if (redirectParam) {
      const u = new URL(redirectParam, origin);
      // allow only same-origin and relative paths
      if (u.origin === origin) {
        redirectUrl = u.pathname + u.search + u.hash;
      }
    }
  } catch {
    redirectUrl = '/';
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (token) {
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return signIn('guest', { redirect: true, redirectTo: redirectUrl });
}
