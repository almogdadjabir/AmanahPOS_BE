import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET() {
  const jar = await cookies();
  jar.delete('auth_token');
  jar.delete('auth_refresh_token');
  jar.delete('user_profile');
  redirect('/ar/login');
}
