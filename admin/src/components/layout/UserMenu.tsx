'use client';

import {
  useActionState, useEffect, useRef, useState, useTransition,
} from 'react';
import {
  User, KeyRound, LogOut, ShieldCheck, Pencil, X,
  Eye, EyeOff, AlertCircle, CheckCircle2, Phone,
  Mail, Calendar, Clock, BadgeCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetBody,
} from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Avatar from '@/components/ui/Avatar';
import { logoutAction } from '@/actions/auth';
import {
  updateProfileAction, changePasswordAction,
  type UpdateProfileState, type ChangePasswordState,
} from '@/actions/profile';
import type { UserProfile } from '@/types/api';

interface Props {
  profile: UserProfile;
}

export default function UserMenu({ profile }: Props) {
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [passwordOpen,  setPasswordOpen]  = useState(false);
  const [isPending,     startLogout]      = useTransition();

  function handleLogout() {
    startLogout(async () => { await logoutAction(); });
  }

  return (
    <>
      {/* ── Dropdown trigger ──────────────────────────────────────────── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 -mx-2 hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring select-none"
            aria-label="Open user menu"
          >
            <Avatar name={profile.full_name || profile.phone} size={30} />
            <span className="hidden sm:block text-[13px] font-medium text-muted-foreground max-w-[140px] truncate">
              {profile.full_name || profile.phone}
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[240px]">
          {/* User info header */}
          <div className="px-3 py-3 mb-1">
            <div className="flex items-center gap-3">
              <Avatar name={profile.full_name || profile.phone} size={38} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-foreground truncate">
                  {profile.full_name || '—'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {profile.phone}
                </p>
                {profile.is_staff && (
                  <div className="flex items-center gap-1 mt-1">
                    <ShieldCheck size={10} className="text-primary shrink-0" />
                    <span className="text-[10px] font-semibold text-primary">Platform Admin</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setProfileOpen(true)}>
            <User size={14} className="text-muted-foreground shrink-0" />
            Profile
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
            <KeyRound size={14} className="text-muted-foreground shrink-0" />
            Change Password
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isPending}
            className="text-destructive focus:bg-destructive/5 focus:text-destructive"
          >
            <LogOut size={14} className="shrink-0" />
            {isPending ? 'Signing out…' : 'Sign out'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Profile sheet ─────────────────────────────────────────────── */}
      <ProfileSheet
        profile={profile}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {/* ── Change password dialog ─────────────────────────────────────── */}
      <ChangePasswordDialog
        hasPassword={profile.has_password}
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </>
  );
}

/* ── Profile sheet ──────────────────────────────────────────────────────── */

function ProfileSheet({
  profile,
  open,
  onClose,
}: {
  profile: UserProfile;
  open:    boolean;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  const [state, dispatch, isPending] = useActionState<UpdateProfileState, FormData>(
    updateProfileAction,
    null,
  );

  useEffect(() => {
    if (state && 'success' in state) {
      setEditing(false);
      router.refresh();
    }
  }, [state, router]);

  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);

  const error   = state && 'error'   in state ? state.error : null;
  const success = state && 'success' in state;

  const joined = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const lastLogin = profile.last_login_at
    ? new Date(profile.last_login_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="right">
        <SheetHeader
          title="My Profile"
          description="View and manage your account details."
          onClose={onClose}
        />
        <SheetBody>
          <div className="p-5 space-y-6">

            {/* Avatar + name block */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/60">
              <Avatar name={profile.full_name || profile.phone} size={52} />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-foreground truncate">
                  {profile.full_name || '—'}
                </p>
                <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                  {profile.phone}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {profile.is_staff && (
                    <Badge variant="primary" dot>Platform Admin</Badge>
                  )}
                  {profile.is_verified && (
                    <Badge variant="success" dot>Verified</Badge>
                  )}
                  {!profile.is_verified && (
                    <Badge variant="warning" dot>Unverified</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Success banner */}
            {success && !editing && (
              <div className="flex items-center gap-2.5 rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5">
                <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                <p className="text-[12.5px] font-semibold text-green-700">Profile updated successfully.</p>
              </div>
            )}

            {/* Edit form or read view */}
            {editing ? (
              <form action={dispatch} className="space-y-4">
                {error && (
                  <InlineError message={error} />
                )}
                <Input
                  label="Full name"
                  name="full_name"
                  defaultValue={profile.full_name ?? ''}
                  required
                  placeholder="Your name"
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  defaultValue={profile.email ?? ''}
                  placeholder="you@example.com"
                  hint="Optional — used for notifications."
                />
                <div className="flex gap-2 pt-1">
                  <Button size="sm" type="submit" disabled={isPending}>
                    {isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button size="sm" variant="secondary" type="button" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <>
                {/* Account info section */}
                <InfoSection title="Account" action={
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Pencil size={11} />
                    Edit
                  </button>
                }>
                  <InfoRow icon={<User size={13} />}      label="Name"  value={profile.full_name || '—'} />
                  <InfoRow icon={<Mail size={13} />}      label="Email" value={profile.email || '—'} />
                </InfoSection>

                {/* Identity section */}
                <InfoSection title="Identity">
                  <InfoRow icon={<Phone size={13} />}       label="Phone"    value={profile.phone} />
                  <InfoRow icon={<BadgeCheck size={13} />}  label="Role"     value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} />
                  <InfoRow
                    icon={<ShieldCheck size={13} />}
                    label="Status"
                    value={
                      <Badge variant={profile.is_verified ? 'success' : 'warning'} dot>
                        {profile.is_verified ? 'Verified' : 'Unverified'}
                      </Badge>
                    }
                  />
                </InfoSection>

                {/* Activity section */}
                <InfoSection title="Activity">
                  {joined && (
                    <InfoRow icon={<Calendar size={13} />} label="Joined"     value={joined} />
                  )}
                  {lastLogin && (
                    <InfoRow icon={<Clock size={13} />}    label="Last login" value={lastLogin} />
                  )}
                </InfoSection>
              </>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/* ── Change password dialog ─────────────────────────────────────────────── */

function ChangePasswordDialog({
  hasPassword,
  open,
  onClose,
}: {
  hasPassword: boolean;
  open:        boolean;
  onClose:     () => void;
}) {
  const [state, dispatch, isPending] = useActionState<ChangePasswordState, FormData>(
    changePasswordAction,
    null,
  );

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const success = state && 'success' in state;
  const error   = state && 'error'   in state ? state.error : null;

  useEffect(() => {
    if (success) {
      formRef.current?.reset();
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [success]);

  useEffect(() => {
    if (!open) {
      formRef.current?.reset();
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <KeyRound size={14} className="text-primary" />
            </span>
            Change Password
          </DialogTitle>
          <DialogDescription>
            {hasPassword
              ? 'Enter your current password then choose a new one.'
              : 'Set a password for your account.'}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={dispatch} className="space-y-4 mt-1">
          {/* Success */}
          {success && (
            <div className="flex items-center gap-2.5 rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5">
              <CheckCircle2 size={14} className="text-green-600 shrink-0" />
              <p className="text-[12.5px] font-semibold text-green-700">Password changed successfully.</p>
            </div>
          )}

          {/* Error */}
          {error && <InlineError message={error} />}

          {/* Current password — only if user already has one */}
          {hasPassword && (
            <Input
              label="Current password"
              name="current_password"
              type={showCurrent ? 'text' : 'password'}
              required
              placeholder="••••••••"
              autoComplete="current-password"
              iconRight={
                <button
                  type="button"
                  className="pointer-events-auto text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowCurrent(v => !v)}
                  tabIndex={-1}
                  aria-label={showCurrent ? 'Hide password' : 'Show password'}
                >
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
            />
          )}

          {/* New password */}
          <Input
            label="New password"
            name="password"
            type={showNew ? 'text' : 'password'}
            required
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            hint="At least 8 characters."
            iconRight={
              <button
                type="button"
                className="pointer-events-auto text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowNew(v => !v)}
                tabIndex={-1}
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />

          {/* Confirm password */}
          <Input
            label="Confirm new password"
            name="password_confirm"
            type={showConfirm ? 'text' : 'password'}
            required
            placeholder="••••••••"
            autoComplete="new-password"
            iconRight={
              <button
                type="button"
                className="pointer-events-auto text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowConfirm(v => !v)}
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />

          <DialogFooter className="mt-5">
            <Button variant="secondary" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={isPending || !!success}>
              {isPending ? 'Saving…' : success ? 'Done' : 'Change password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Shared helpers ─────────────────────────────────────────────────────── */

function InfoSection({
  title,
  action,
  children,
}: {
  title:    string;
  action?:  React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/70">
          {title}
        </p>
        {action}
      </div>
      <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon:   React.ReactNode;
  label:  string;
  value:  React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5">
      <span className="text-muted-foreground/60 shrink-0">{icon}</span>
      <span className="text-[12px] text-muted-foreground w-[72px] shrink-0">{label}</span>
      <span className="text-[12.5px] font-semibold text-foreground flex-1 min-w-0 truncate">
        {value}
      </span>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3">
      <AlertCircle size={13} className="text-destructive shrink-0 mt-0.5" />
      <p className="text-[12px] font-semibold text-destructive leading-relaxed">{message}</p>
    </div>
  );
}
