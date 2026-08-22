import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserProfile, MandoubPermissions } from '@/lib/types';

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isMandoub: boolean;
  isStaff: boolean;
  onboardingComplete: boolean;
  permissions: MandoubPermissions | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [permissions, setPermissions] = useState<MandoubPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        (async () => {
          await loadProfile(newSession.user.id);
        })();
      } else {
        setProfile(null);
        setOnboardingComplete(false);
        setPermissions(null);
        setLoading(false);
      }
    });

    async function loadProfile(userId: string) {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .eq('id', userId)
        .maybeSingle();
      if (!mounted) return;
      if (error) {
        setProfile(null);
      } else {
        const p = data as UserProfile;
        setProfile(p);

        if (p?.role === 'mandoub') {
          // Check onboarding status
          const { data: mp } = await supabase
            .from('mandoub_profiles')
            .select('onboarding_complete')
            .eq('user_id', userId)
            .maybeSingle();
          setOnboardingComplete(mp?.onboarding_complete || false);

          // Load permissions
          const { data: perms } = await supabase
            .from('mandoub_permissions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
          setPermissions(perms as MandoubPermissions | null);
        } else {
          setOnboardingComplete(true);
          setPermissions(null);
        }
      }
      setLoading(false);
    }

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (session?.user?.id) {
      const { data } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .eq('id', session.user.id)
        .maybeSingle();
      if (data) {
        setProfile(data as UserProfile);
        if ((data as UserProfile).role === 'mandoub') {
          const { data: mp } = await supabase
            .from('mandoub_profiles')
            .select('onboarding_complete')
            .eq('user_id', session.user.id)
            .maybeSingle();
          setOnboardingComplete(mp?.onboarding_complete || false);
        }
      }
    }
  };

  const value: AuthState = {
    session,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isMandoub: profile?.role === 'mandoub',
    isStaff: profile?.role === 'admin' || profile?.role === 'mandoub',
    onboardingComplete,
    permissions,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? error.message : null };
    },
    async signOut() {
      await supabase.auth.signOut();
      setProfile(null);
      setOnboardingComplete(false);
      setPermissions(null);
    },
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
