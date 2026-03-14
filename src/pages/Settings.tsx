"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, Users, Shield, MapPin, UserPlus, Plus } from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const { profile } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Company
      if (profile?.company_id) {
        const { data: comp } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
        setCompany(comp);
      }

      // Fetch Users
      const { data: usr } = await supabase.from('profiles').select('*').eq('company_id', profile?.company_id);
      setUsers(usr || []);

      // Fetch Branches
      const { data: br } = await supabase.from('branches').select('*').eq('company_id', profile?.company_id);
      setBranches(br || []);
    } catch (error) {
      console.error('Error fetching settings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = async () => {
    const name = prompt('Enter branch name:');
    const location = prompt('Enter branch location:');
    if (!name || !profile?.company_id) return;

    const { error } = await supabase.from('branches').insert({
      name,
      location,
      company_id: profile.company_id
    });

    if (error) toast.error('Error adding branch');
    else {
      toast.success('Branch added');
      fetchData();
    }
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64">Loading settings...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
          <p className="text-slate-500 text-sm">Manage your business configuration</p>
        </header>

        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-slate-100 p-1 h-12">
            <TabsTrigger value="company" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">
              <Building size={14} className="mr-1.5" /> Company
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">
              <Users size={14} className="mr-1.5" /> Users
            </TabsTrigger>
            <TabsTrigger value="branches" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">
              <MapPin size={14} className="mr-1.5" /> Branches
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="mt-6 space-y-4">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-sm font-bold">Company Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</Label>
                  <Input defaultValue={company?.name} className="rounded-xl border-slate-200 focus:ring-indigo-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Financial Year Start</Label>
                  <Select defaultValue="4">
                    <SelectTrigger className="rounded-xl border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">January</SelectItem>
                      <SelectItem value="4">April</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl h-12 font-bold shadow-lg shadow-indigo-100">
                  Update Company
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6 space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-bold text-slate-900">Team Management</h3>
              <Button size="sm" className="rounded-xl gap-1.5 bg-indigo-600 h-9 px-4 font-bold text-xs">
                <UserPlus size={14} /> Add User
              </Button>
            </div>
            <div className="space-y-3">
              {users.map(user => (
                <Card key={user.id} className="border-none shadow-sm rounded-2xl">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center font-bold text-indigo-600">
                        {user.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{user.full_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.role}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-50">
                      <Shield size={16} className="text-slate-400" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="branches" className="mt-6 space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-bold text-slate-900">Branch Locations</h3>
              <Button onClick={handleAddBranch} size="sm" className="rounded-xl gap-1.5 bg-indigo-600 h-9 px-4 font-bold text-xs">
                <Plus size={14} /> New Branch
              </Button>
            </div>
            <div className="grid gap-3">
              {branches.map(branch => (
                <Card key={branch.id} className="border-none shadow-sm rounded-2xl">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center">
                        <MapPin size={18} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{branch.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{branch.location || 'No location set'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
