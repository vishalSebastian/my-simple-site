import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Center, Loader } from '@mantine/core';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  const loadProfile = useCallback(async (s) => {
    setSession(s);
    if (!s) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      setProfile(await api.getProfile(s.user.id));
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.getSession().then(loadProfile);
    return api.onAuthChange((s, reason) => {
      setExpired(!s && reason === 'expired');
      // Avoid calling Supabase inside its own auth callback
      setTimeout(() => loadProfile(s), 0);
    });
  }, [loadProfile]);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    expired,
    isHr: profile?.role === 'hr',
    signOut: () => api.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function PageLoader() {
  return (
    <Center h={240} data-testid="page-loader">
      <Loader />
    </Center>
  );
}

// Wrap a page that needs login. role="hr" or role="employee" restricts it further.
export function RequireAuth({ role, children }) {
  const { user, profile, loading, expired } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname, reason: expired ? 'expired' : undefined }} />;
  if (!profile) return <PageLoader />;
  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'hr' ? '/hr' : '/onboarding'} replace />;
  }
  return children;
}
