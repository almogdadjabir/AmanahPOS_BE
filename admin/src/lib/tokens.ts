import { cookies } from 'next/headers';

const BASE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function getAccessToken() {
  return (await cookies()).get('auth_token')?.value;
}

export async function getRefreshToken() {
  return (await cookies()).get('auth_refresh_token')?.value;
}

export async function setAccessToken(token: string) {
  (await cookies()).set('auth_token', token, { ...BASE_OPTS, maxAge: 60 * 60 * 24 * 7 });
}

export async function setRefreshToken(token: string) {
  (await cookies()).set('auth_refresh_token', token, { ...BASE_OPTS, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearTokens() {
  const jar = await cookies();
  jar.delete('auth_token');
  jar.delete('auth_refresh_token');
}
