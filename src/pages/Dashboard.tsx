"use client";

import React from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Smartphone, CreditCard, Wrench, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard = () => {
  const { profile } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', profile?.company_id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('daily_entries')
        .select('*, branches(name, company_id)');
      
      // If not superadmin, filter by company
      if (profile?.role !== 'superadmin' && profile?.company_id) {
        // This logic assumes RLS handles the filtering, but we can be explicit
      }

      const { data, error } = await query.eq('entry_date', today);
      
      if (error) throw error;
      
      const totals = data.reduce((acc, curr) => ({
        sales: acc.sales + Number(curr.total_sales),
        phones: acc.phones + curr.smartphone_count,
        sims: acc.sims + curr.sim_count,
        service: acc.service + Number(curr.service_amount)
      }), { sales: 0, phones: 0, sims: 0, service: 0 });

      return { totals, entries: data };
    },
    enabled: !!profile
  });

  const statCards = [
    { label: 'Total Sales', value: `$${stats?.totals.sales || 0}`, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Phones Sold', value: stats?.totals.phones || 0, icon: Smartphone, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'SIM Cards', value: stats?.totals.sims || 0, icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Service Rev', value: `$${stats?.totals.service || 0}`, icon: Wrench, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  if (isLoading) return <Layout><div className="flex items-center justify-center h-64">Loading stats...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-gray-900">
            {profile?.role === 'superadmin' ? 'Global Overview' : (profile?.company_name || 'SparkFlow')}
          </h2>
          <p className="text-gray-500 text-sm">Welcome back, {profile?.full_name}</p>
        </section>

        <div className="grid grid-cols-2 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="border-none shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className={`${stat.bg} p-2 rounded-xl mb-2`}>
                  <stat.icon className={stat.color} size={20} />
                </div>
                <span className="text-xl font-bold text-gray-800">{stat.value}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{stat.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2">
                <Trophy className="text-amber-500" size={20} />
                Branch Performance
              </h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.entries || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="branches.name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="total_sales" radius={[4, 4, 0, 0]}>
                    {(stats?.entries || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#818cf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <section className="bg-white rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold mb-4">Entry Status</h3>
          <div className="space-y-4">
            {stats?.entries.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No entries for today yet.</p>
            ) : (
              stats?.entries.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium">{entry.branches?.name}</span>
                  </div>
                  <span className="text-xs text-slate-400">Submitted</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Dashboard;