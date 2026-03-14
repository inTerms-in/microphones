import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyName) {
      document.title = companyName;
    } else {
      document.title = 'Smart Sales Tracker';
    }
  }, [companyName]);

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUserChange(session?.user ?? null);
    });

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUserChange(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserChange = async (authUser) => {
    if (!authUser) {
      setUser(null);
      setProfile(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    setUser(authUser);
    
    // Fetch detailed profile and granular permissions
    try {
      const [profileRes, permRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', authUser.id).single(),
        supabase.from('page_permissions').select('*').eq('user_id', authUser.id)
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        const { data: companyData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', profileRes.data.company_id)
          .single();
        if (companyData) setCompanyName(companyData.name);
      }
      if (permRes.data) setPermissions(permRes.data);
    } catch (error) {
      console.error('Error fetching user metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = (pageName, action) => {
    if (profile?.role === 'owner') return true;
    
    const pagePerm = permissions.find(p => p.page_name === pageName);
    if (!pagePerm) return false;

    switch (action) {
      case 'view': return pagePerm.can_view;
      case 'insert': return pagePerm.can_insert;
      case 'update': return pagePerm.can_update;
      case 'delete': return pagePerm.can_delete;
      default: return false;
    }
  };

  const refreshCompanyName = async () => {
    if (profile?.company_id) {
       const { data } = await supabase.from('companies').select('name').eq('id', profile.company_id).single();
       if (data) setCompanyName(data.name);
    } else {
       // Fallback for login page: show first active company name
       const { data } = await supabase.from('companies').select('name').eq('is_active', true).limit(1).single();
       if (data) setCompanyName(data.name);
    }
  };

  useEffect(() => {
    if (!user) refreshCompanyName();
  }, [user]);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, permissions, companyName, refreshCompanyName, checkPermission, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
