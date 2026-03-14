"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

const EntryForm = () => {
  const { profile } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    total_sales: '',
    service_amount: '',
    smartphone_count: '',
    sim_count: '',
    remarks: ''
  });

  useEffect(() => {
    const fetchBranches = async () => {
      if (!profile) return;
      
      let query = supabase.from('branches').select('*');
      
      if (profile.role !== 'owner') {
        query = query.eq('company_id', profile.company_id);
      }

      const { data } = await query;
      setBranches(data || []);
      if (data?.length === 1) setSelectedBranch(data[0].id);
    };

    fetchBranches();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return toast.error('Please select a branch');

    setLoading(true);
    const { error } = await supabase.from('daily_entries').insert({
      branch_id: selectedBranch,
      entry_date: format(new Date(), 'yyyy-MM-dd'),
      total_sales: parseFloat(formData.total_sales),
      service_amount: parseFloat(formData.service_amount),
      smartphone_count: parseInt(formData.smartphone_count),
      sim_count: parseInt(formData.sim_count),
      remarks: formData.remarks,
      created_by: profile?.id
    });

    setLoading(false);
    if (error) {
      if (error.code === '23505') toast.error('Entry already exists for today!');
      else toast.error('Error saving entry');
    } else {
      toast.success('Entry saved successfully!');
      setFormData({ total_sales: '', service_amount: '', smartphone_count: '', sim_count: '', remarks: '' });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-bold">Daily Entry</h2>
          <p className="text-slate-500 text-sm">{format(new Date(), 'PPPP')}</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-3xl shadow-sm">
          {branches.length > 1 && (
            <div className="space-y-2">
              <Label>Select Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Total Sales</Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={formData.total_sales}
                onChange={e => setFormData({...formData, total_sales: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Service Amt</Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={formData.service_amount}
                onChange={e => setFormData({...formData, service_amount: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Smartphones</Label>
              <Input 
                type="number" 
                placeholder="Qty" 
                value={formData.smartphone_count}
                onChange={e => setFormData({...formData, smartphone_count: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>SIM Cards</Label>
              <Input 
                type="number" 
                placeholder="Qty" 
                value={formData.sim_count}
                onChange={e => setFormData({...formData, sim_count: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea 
              placeholder="Any notes..." 
              value={formData.remarks}
              onChange={e => setFormData({...formData, remarks: e.target.value})}
            />
          </div>

          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl" disabled={loading}>
            {loading ? 'Saving...' : 'Submit Entry'}
          </Button>
        </form>
      </div>
    </Layout>
  );
};

export default EntryForm;