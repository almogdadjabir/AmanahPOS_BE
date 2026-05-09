import { getCurrentUser } from '@/services/auth';
import { fetchBusiness } from '@/services/owner';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { BusinessType } from '@/types/api';
import AppShell from '@/components/layout/AppShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUser();

  if (!profile) {
    const cookieStore = await cookies();
    const hasToken    = !!cookieStore.get('auth_token')?.value;

    if (!hasToken) {
      redirect('/login');
    }

    // Token present but profile returned null → rate limited (429 was cached as null).
    // Do NOT redirect to login — that clears the cookie and triggers a fresh profile
    // call on the next login, burning another request against the throttled quota.
    return <RateLimitedScreen />;
  }

  const bizRes = await fetchBusiness();

  const business                               = bizRes?.data?.[0];
  const businessType: BusinessType | undefined = profile.is_staff ? undefined : business?.business_type;

  return <AppShell profile={profile} businessType={businessType}>{children}</AppShell>;
}

function RateLimitedScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p className="text-[17px] font-bold text-gray-900 mb-2">Too many requests</p>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          The server is temporarily rate-limiting requests. Wait a minute then refresh.
        </p>
        <a
          href="/api/auth/clear-session"
          className="inline-block text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Sign out and try again
        </a>
      </div>
    </div>
  );
}
