import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

const CREDENTIALS = {
  admin: 'bkkdevlogistics31975',
};

// Load profile from localStorage
function loadProfile(username) {
  try {
    const raw = localStorage.getItem(`bdl_profile_${username}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { username, display_name: username, avatar_url: null };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check persisted session
    const saved = localStorage.getItem('bdl_user_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const profile = loadProfile(parsed.username);
        setUser({ ...parsed, ...profile });
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const expected = CREDENTIALS[username];
    if (!expected) return { error: { message: 'ไม่พบบัญชีผู้ใช้นี้' } };
    if (password !== expected) return { error: { message: 'รหัสผ่านไม่ถูกต้อง' } };

    const profile = loadProfile(username);
    const session = { username, email: `${username}@bkkdev.com` };
    localStorage.setItem('bdl_user_session', JSON.stringify(session));
    localStorage.setItem('bdl_user_profile', JSON.stringify({ ...session, ...profile }));
    setUser({ ...session, ...profile });
    return { error: null };
  };

  const logout = () => {
    localStorage.removeItem('bdl_user_session');
    setUser(null);
  };

  const updateProfile = (updates) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    localStorage.setItem(`bdl_profile_${user.username}`, JSON.stringify(updated));
    localStorage.setItem('bdl_user_profile', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
