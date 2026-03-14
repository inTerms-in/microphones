"use client";

import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const Login = () => {
  const { session, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  if (session) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-indigo-600">SparkFlow</h1>
          <p className="text-slate-500 mt-2">Sign up or Sign in to continue</p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{ 
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#4f46e5',
                  brandAccent: '#4338ca',
                }
              }
            }
          }}
          theme="light"
          providers={[]}
          redirectTo={window.location.origin}
        />
        
        <p className="text-[10px] text-center text-slate-400 mt-6">
          Note: Password must be at least 6 characters.
        </p>
      </div>
    </div>
  );
};

export default Login;