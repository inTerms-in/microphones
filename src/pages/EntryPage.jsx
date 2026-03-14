import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Save, AlertCircle, CheckCircle2, Calendar as CalIcon, MapPin, Tablet, CreditCard as SimIcon, IndianRupee, Activity, Monitor } from 'lucide-react';

const EntryPage = () => {
  const { user, profile } = useAuth();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [formData, setFormData] = useState({
    total_sales: '',
    service_amount: '',
    smartphone_count: '',
    sim_count: '',
    remarks: ''
  });

  const [existingEntry, setExistingEntry] = useState(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      checkExistingEntry(selectedBranch.id, entryDate);
    }
  }, [selectedBranch, entryDate]);

  // Clear message when any input changes
  useEffect(() => {
    if (message) setMessage(null);
  }, [entryDate, selectedBranch, formData]);

  const fetchBranches = async () => {
    try {
      let query;
      if (profile?.role === 'owner' || profile?.role === 'partner') {
        query = supabase.from('branches').select('*').eq('is_active', true);
      } else {
        query = supabase
          .from('user_branches')
          .select('branches(*)')
          .eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const branchList = profile?.role === 'owner' || profile?.role === 'partner' 
        ? data 
        : data.map(item => item.branches).filter(b => b.is_active);
      
      setBranches(branchList);
      if (branchList.length > 0) {
        setSelectedBranch(branchList[0]);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingEntry = async (branchId, date) => {
    const { data } = await supabase
      .from('daily_entries')
      .select('*')
      .eq('branch_id', branchId)
      .eq('entry_date', date)
      .maybeSingle();

    if (data) {
      setExistingEntry(data);
      setFormData({
        total_sales: data.total_sales,
        service_amount: data.service_amount,
        smartphone_count: data.smartphone_count,
        sim_count: data.sim_count,
        remarks: data.remarks || ''
      });
    } else {
      setExistingEntry(null);
      setFormData({
        total_sales: '',
        service_amount: '',
        smartphone_count: '',
        sim_count: '',
        remarks: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBranch) return;

    setSubmitting(true);
    setMessage(null);

    const entryData = {
      branch_id: selectedBranch.id,
      entry_date: entryDate,
      created_by: user.id,
      total_sales: parseFloat(formData.total_sales) || 0,
      service_amount: parseFloat(formData.service_amount) || 0,
      smartphone_count: parseInt(formData.smartphone_count) || 0,
      sim_count: parseInt(formData.sim_count) || 0,
      remarks: formData.remarks
    };

    try {
      const { error } = existingEntry 
        ? await supabase.from('daily_entries').update(entryData).eq('id', existingEntry.id)
        : await supabase.from('daily_entries').insert([entryData]);

      if (error) throw error;

      setMessage({ type: 'success', text: existingEntry ? 'Entry updated successfully!' : 'Daily entry saved!' });
      checkExistingEntry(selectedBranch.id, entryDate);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null; // No flash of "Preparing..."

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.25rem', marginBottom: '0.1rem' }}>Daily Sales Record</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Precision entry for your branch</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="form-group-standard">
            <label style={{ fontSize: '0.65rem' }}>Date</label>
            <div style={{ position: 'relative' }}>
              <CalIcon size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-color)' }} />
              <input 
                type="date" 
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                style={{ paddingLeft: '30px !important', minWidth: '130px', padding: '6px 10px', fontSize: '0.8rem' }}
              />
            </div>
          </div>
          
          {branches.length > 1 && (
            <div className="form-group-standard">
              <label style={{ fontSize: '0.65rem' }}>Branch</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-color)' }} />
                <select 
                  value={selectedBranch?.id} 
                  onChange={(e) => setSelectedBranch(branches.find(b => b.id === e.target.value))}
                  style={{ paddingLeft: '30px !important', minWidth: '150px', padding: '6px 10px', fontSize: '0.8rem' }}
                >
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      </header>

      <form onSubmit={handleSubmit} className="glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem' }}>
        {existingEntry && !message && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,210,255,0.08)', borderLeft: '4px solid var(--accent-color)', borderRadius: '4px', color: 'var(--accent-color)', fontSize: '0.8rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <CheckCircle2 size={16} />
            <span>Entry for this date already exists. Modifying record for <strong>{selectedBranch?.name}</strong>.</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group-standard">
            <label style={{ fontSize: '0.65rem' }}>Sales Revenue</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="number" step="0.01" placeholder="0.00"
                value={formData.total_sales}
                onChange={(e) => setFormData({...formData, total_sales: e.target.value})}
                required
                style={{ padding: '6px 10px', fontSize: '0.9rem' }}
              />
            </div>
          </div>
          <div className="form-group-standard">
            <label style={{ fontSize: '0.65rem' }}>Service Amt</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="number" step="0.01" placeholder="0.00"
                value={formData.service_amount}
                onChange={(e) => setFormData({...formData, service_amount: e.target.value})}
                required
                style={{ padding: '6px 10px', fontSize: '0.9rem' }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group-standard">
            <label style={{ fontSize: '0.65rem' }}>Smartphones</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="number" placeholder="0"
                value={formData.smartphone_count}
                onChange={(e) => setFormData({...formData, smartphone_count: e.target.value})}
                required
                style={{ padding: '6px 10px', fontSize: '0.9rem' }}
              />
            </div>
          </div>
          <div className="form-group-standard">
            <label style={{ fontSize: '0.65rem' }}>SIM Cards</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="number" placeholder="0"
                value={formData.sim_count}
                onChange={(e) => setFormData({...formData, sim_count: e.target.value})}
                required
                style={{ padding: '6px 10px', fontSize: '0.9rem' }}
              />
            </div>
          </div>
        </div>

        <div className="form-group-standard" style={{ marginBottom: '0.5rem' }}>
          <label style={{ fontSize: '0.65rem' }}>Remarks</label>
          <textarea 
            placeholder="Notes..."
            value={formData.remarks}
            onChange={(e) => setFormData({...formData, remarks: e.target.value})}
            style={{ minHeight: '35px', padding: '6px 10px', fontSize: '0.8rem' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ flex: 1 }}>
            {message && (
              <div className="animate-fade-in" style={{ display: 'flex', gap: '6px', alignItems: 'center', color: message.type === 'success' ? 'var(--success)' : 'var(--error)', fontSize: '0.75rem', fontWeight: 600 }}>
                {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {message.text}
              </div>
            )}
          </div>
          <button type="submit" className="btn-primary" disabled={submitting || !selectedBranch} style={{ padding: '8px 30px', fontSize: '0.9rem' }}>
            <Save size={16} style={{ marginRight: '6px' }} />
            {submitting ? '...' : existingEntry ? 'Update' : 'Post'}
          </button>
        </div>
      </form>

      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; }
      `}</style>
    </div>
  );
};

export default EntryPage;
