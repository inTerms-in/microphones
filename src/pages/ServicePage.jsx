import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Wrench, Plus, Search, Filter, 
  ChevronRight, Clock, CheckCircle2, 
  AlertCircle, X, Smartphone, User, 
  Phone, Calendar,  IndianRupee, MoreVertical,
  ExternalLink, Edit2, Trash2, Printer, MessageSquare, Share2, FileText, Download
} from 'lucide-react';

const ServicePage = () => {
  const { profile, user, companyName } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchUsers, setBranchUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(null);
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const initialJobState = {
    branch_id: '',
    customer_name: '',
    customer_phone: '',
    device_model: '',
    problem_description: '',
    estimate_cost: '',
    advance_paid: '',
    entry_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: new Date().toISOString().split('T')[0], // Default to same day
    delivery_date: '',
    assigned_to: user?.id || '',
    status: 'pending',
    job_type: 'customer'
  };

  const [newJob, setNewJob] = useState(initialJobState);
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const statusColors = {
    'pending': '#ff9800',
    'in-progress': '#2196f3',
    'ready': '#4caf50',
    'delivered': '#9e9e9e',
    'cancelled': '#f44336'
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchJobs(), fetchBranches(), fetchBranchUsers()]);
    setLoading(false);
  };

  const fetchBranches = async () => {
    let query = supabase.from('branches').select('id, name').eq('is_active', true);
    if (profile?.role !== 'owner' && profile?.role !== 'partner') {
      const { data: ub } = await supabase.from('user_branches').select('branch_id').eq('user_id', user.id);
      query = query.in('id', ub?.map(x => x.branch_id) || []);
    }
    const { data } = await query;
    if (data) {
      setBranches(data);
      if (data.length > 0) setNewJob(prev => ({ ...prev, branch_id: data[0].id }));
    }
  };

  const fetchBranchUsers = async (branchId) => {
    if (!branchId) return;
    const { data } = await supabase
      .from('user_branches')
      .select('profiles(id, full_name, role, email)')
      .eq('branch_id', branchId);
    if (data) {
      // Filter out admin@micro.com from assigned list
      const users = data
        .map(x => x.profiles)
        .filter(u => u && u.email !== 'admin@micro.com');
      
      setBranchUsers(users);
      // If itemToEdit is null (new job), default assigned_to to current user if they are in this branch
      const currentUserExists = users.find(u => u.id === user.id);
      if (!itemToEdit && currentUserExists) {
        setNewJob(prev => ({ ...prev, assigned_to: user.id }));
      }
    }
  };

  const fetchJobs = async () => {
    const { data } = await supabase
      .from('service_jobs')
      .select('*, branches(name), assigned_user:profiles!service_jobs_assigned_to_fkey(full_name)')
      .order('created_at', { ascending: false });
    if (data) setJobs(data);
  };

  const openAddModal = () => {
    const defaultBranch = branches[0]?.id || '';
    setNewJob({ ...initialJobState, branch_id: defaultBranch });
    if (defaultBranch) fetchBranchUsers(defaultBranch);
    setItemToEdit(null);
    setShowAddModal(true);
  };

  const handleCreateOrUpdateJob = async (e) => {
    if (e) e.preventDefault();
    try {
      // Create a clean payload to avoid sending computed/nested fields
      const { branches, assigned_user, assigned_profile, ...cleanJob } = newJob;
      
      const payload = {
        ...cleanJob,
        estimate_cost: parseFloat(newJob.estimate_cost) || 0,
        advance_paid: parseFloat(newJob.advance_paid) || 0,
        created_by: user.id
      };

      if (itemToEdit) {
        const { error } = await supabase.from('service_jobs').update(payload).eq('id', itemToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('service_jobs').insert([payload]);
        if (error) throw error;
      }

      setShowAddModal(false);
      setItemToEdit(null);
      setNewJob(initialJobState);
      fetchJobs();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteJob = async (id) => {
    if (!confirm('Are you sure you want to delete this service job record?')) return;
    try {
      const { error } = await supabase.from('service_jobs').delete().eq('id', id);
      if (error) throw error;
      fetchJobs();
    } catch (err) {
      alert(err.message);
    }
  };

  const getJobMessage = (job) => {
    const est = parseFloat(job.estimate_cost) || 0;
    const adv = parseFloat(job.advance_paid) || 0;
    const bal = est - adv;
    return `*Service Job Confirmation - ${companyName}*\n\n` +
      `Hello ${job.customer_name},\n` +
      `Your job for *${job.device_model}* (${job.job_type === 'house' ? 'Internal' : 'Customer'}) has been registered.\n\n` +
      `*Job ID:* ${job.id.slice(0, 8).toUpperCase()}\n` +
      `*Problem:* ${job.problem_description || 'N/A'}\n` +
      `*Estimate:* ₹${est}\n` +
      `*Advance:* ₹${adv}\n` +
      `*Balance:* ₹${bal}\n` +
      `*Exp. Delivery:* ${job.expected_delivery_date ? new Date(job.expected_delivery_date).toLocaleDateString() : 'TBD'}\n\n` +
      `Thank you!`;
  };

  const sendWhatsAppMessage = (job) => {
    if (!job.customer_phone || job.customer_phone === 'N/A') {
      alert("Invalid phone number");
      return;
    }
    const msg = getJobMessage(job);
    const cleanPhone = job.customer_phone.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const downloadPDF = (job, preview = false) => {
    const element = document.getElementById('job-slip');
    const opt = {
      margin: 10,
      filename: `slip_${job.id.slice(0, 8)}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    if (preview) {
      window.html2pdf().from(element).set(opt).toPdf().outputPdf('bloburl').then(url => {
        window.open(url, '_blank');
      });
    } else {
      window.html2pdf().from(element).set(opt).save();
    }
  };

  const sharePDF = async (job) => {
    // Note: True PDF sharing via WA from browser requires the user to pick the file.
    // We will generate the PDF and suggest downloading it first, or send the text slip as fallback.
    alert("PDF generated. Please download and attach to WhatsApp.");
    downloadPDF(job);
  };

  const updateJobStatus = async (jobId, newStatus) => {
    try {
      const updateData = { status: newStatus };
      if (newStatus === 'delivered') updateData.delivery_date = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('service_jobs').update(updateData).eq('id', jobId);
      if (error) throw error;
      fetchJobs();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePhoneChange = async (val) => {
    setNewJob({ ...newJob, customer_phone: val });
    if (val.length >= 3) {
      const { data } = await supabase
        .from('service_jobs')
        .select('customer_name, customer_phone, device_model')
        .or(`customer_phone.ilike.%${val}%,customer_name.ilike.%${val}%`)
        .limit(5);
      if (data) {
        const uniqueData = Array.from(new Set(data.map(d => JSON.stringify(d)))).map(s => JSON.parse(s));
        setSuggestions(uniqueData);
        setActiveIndex(-1);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleKeyDown = (e) => {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      fillFromSuggestion(suggestions[activeIndex]);
    } else if (e.key === 'Tab') {
      setSuggestions([]);
    }
  };

  const fillFromSuggestion = (s) => {
    setNewJob({ ...newJob, customer_name: s.customer_name, customer_phone: s.customer_phone, device_model: s.device_model });
    setSuggestions([]);
    setActiveIndex(-1);
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      let matchesStatus = statusFilter === 'all';
      if (statusFilter === 'pending-delivery') {
        matchesStatus = ['pending', 'in-progress', 'ready'].includes(job.status);
      } else if (statusFilter !== 'all') {
        matchesStatus = job.status === statusFilter;
      }

      const matchesBranch = branchFilter === 'all' || job.branch_id === branchFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        job.customer_name.toLowerCase().includes(term) ||
        job.device_model.toLowerCase().includes(term) ||
        job.customer_phone?.includes(term) ||
        job.id.toLowerCase().includes(term) ||
        job.entry_date.includes(term) ||
        (job.delivery_date && job.delivery_date.includes(term));
      return matchesStatus && matchesBranch && matchesSearch;
    });
  }, [jobs, statusFilter, branchFilter, searchTerm]);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <header className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 800 }}>Mobile Service Jobs</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Track repairs and customer deliveries</p>
        </div>
        <button onClick={openAddModal} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
          <Plus size={18} /> <span className="desktop-only">New Job</span>
        </button>
      </header>

      {/* Filters Bar */}
      <div className="glass no-print" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            placeholder="Search ID, Customer, Model or Date..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px', width: '100%', fontSize: '0.9rem' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px' }}>
            <option value="all">All Status</option>
            <option value="pending-delivery">Pending on Delivery</option>
            {Object.keys(statusColors).map(s => <option key={s} value={s}>{s.replace('-', ' ').toUpperCase()}</option>)}
          </select>

          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px' }}>
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="no-print" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading jobs...</div>
      ) : (
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filteredJobs.length === 0 ? (
            <div className="glass" style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No jobs found.</div>
          ) : filteredJobs.map(job => (
            <div key={job.id} id={`job-${job.id}`} className="glass card-hover" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: `6px solid ${statusColors[job.status]}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                   <p style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>JOB #{job.id.slice(0, 8).toUpperCase()}</p>
                   <h3 style={{ fontWeight: 900, fontSize: '1.4rem', margin: '0 0 6px 0', lineHeight: 1.2, color: 'white' }}>{job.device_model}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <div style={{ padding: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex' }}><User size={14} /></div> 
                    <span style={{ fontWeight: 600 }}>{job.customer_name}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', padding: '5px 10px', borderRadius: '8px', background: `${statusColors[job.status]}20`, color: statusColors[job.status], border: `1px solid ${statusColors[job.status]}40` }}>{job.status.replace('-', ' ')}</span>
                   {job.assigned_user && <div style={{ fontSize: '0.65rem', marginTop: '8px', opacity: 0.7 }}>Assigned: <span style={{ fontWeight: 700 }}>{job.assigned_user.full_name}</span></div>}
                </div>
              </div>

              <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', minHeight: '40px', border: '1px solid var(--glass-border)', fontStyle: 'italic' }}>
                {job.problem_description || 'No description provided'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                   <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                      <Calendar size={14} color="var(--text-secondary)" /> Entry: {new Date(job.entry_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                   </div>
                   {job.expected_delivery_date && !job.delivery_date && (
                     <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#ff9800' }}>
                        <Clock size={14} /> Expct: {new Date(job.expected_delivery_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                     </div>
                   )}
                   {job.delivery_date && (
                     <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.85rem', fontWeight: 800, color: '#4caf50' }}>
                        <CheckCircle2 size={14} /> Delivery: {new Date(job.delivery_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                     </div>
                   )}
                </div>
                <div style={{ textAlign: 'right', fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>₹{job.estimate_cost}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <a href={`tel:${job.customer_phone}`} title="Call" className="btn-icon" style={{ padding: '7px' }}><Phone size={14} /></a>
                  <button onClick={() => sendWhatsAppMessage(job)} title="WhatsApp" className="btn-icon" style={{ padding: '7px', color: '#25D366' }}><MessageSquare size={14} /></button>
                  <button onClick={() => setShowPrintModal(job)} title="Print Slip" className="btn-icon" style={{ padding: '7px', color: 'var(--accent-color)' }}><Printer size={14} /></button>
                  <button onClick={() => { 
                    setItemToEdit(job); 
                    setNewJob({ ...job }); 
                    fetchBranchUsers(job.branch_id);
                    setShowAddModal(true); 
                  }} className="btn-icon" style={{ padding: '7px' }}><Edit2 size={14} /></button>
                  {profile?.role === 'owner' && <button onClick={() => handleDeleteJob(job.id)} className="btn-icon" style={{ padding: '7px', color: 'var(--error)' }}><Trash2 size={14} /></button>}
                </div>
                
                <div style={{ display: 'flex', gap: '4px' }}>
                  {job.status === 'pending' && (
                    <>
                      <button onClick={() => updateJobStatus(job.id, 'cancelled')} className="btn-secondary" style={{ fontSize: '0.65rem', padding: '5px 8px' }}>Cancel</button>
                      <button onClick={() => updateJobStatus(job.id, 'in-progress')} className="btn-secondary" style={{ fontSize: '0.65rem', padding: '5px 10px' }}>Start</button>
                    </>
                  )}
                  {job.status === 'in-progress' && <button onClick={() => updateJobStatus(job.id, 'ready')} className="btn-secondary" style={{ fontSize: '0.65rem', padding: '5px 10px', color: '#4caf50' }}>Ready</button>}
                  {job.status === 'ready' && <button onClick={() => updateJobStatus(job.id, 'delivered')} className="btn-primary" style={{ fontSize: '0.65rem', padding: '5px 10px' }}>Deliver</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Registration Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1rem', paddingTop: '3vh' }}>
          <div className="glass animate-fade-in no-scrollbar" style={{ width: '100%', maxWidth: '550px', padding: '1.5rem', maxHeight: '94vh', overflowY: 'auto', borderRadius: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{itemToEdit ? 'Update Service' : 'Register Service'}</h2>
              <button onClick={() => { setShowAddModal(false); setItemToEdit(null); }} className="btn-icon"><X size={22} /></button>
            </div>

            <form onSubmit={handleCreateOrUpdateJob} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <div className="form-group-standard" style={{ gridColumn: 'span 2', marginBottom: '5px' }}>
                <div 
                  onClick={() => {
                    const nextType = newJob.job_type === 'customer' ? 'house' : 'customer';
                    const updates = { job_type: nextType };
                    if (nextType === 'house') { updates.customer_name = 'IN-HOUSE / INTERNAL'; updates.customer_phone = 'N/A'; }
                    else { updates.customer_name = ''; updates.customer_phone = ''; }
                    setNewJob({...newJob, ...updates});
                  }}
                  style={{ display: 'flex', width: '100%', padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', cursor: 'pointer', position: 'relative', height: '36px', alignItems: 'center' }}
                >
                  <div style={{ position: 'absolute', left: newJob.job_type === 'customer' ? '4px' : '50%', width: 'calc(50% - 4px)', height: '28px', background: 'var(--accent-color)', borderRadius: '8px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 0 }}></div>
                  <div style={{ flex: 1, textAlign: 'center', zIndex: 1, fontSize: '0.75rem', fontWeight: 800, color: 'white' }}>CUSTOMER JOB</div>
                  <div style={{ flex: 1, textAlign: 'center', zIndex: 1, fontSize: '0.75rem', fontWeight: 800, color: 'white' }}>IN-HOUSE JOB</div>
                </div>
              </div>

              <div className="form-group-standard">
                <label>Branch</label>
                <select 
                  value={newJob.branch_id} 
                  onChange={e => {
                    const bid = e.target.value;
                    setNewJob({...newJob, branch_id: bid});
                    fetchBranchUsers(bid);
                  }} 
                  required
                >
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="form-group-standard">
                <label>Assigned To</label>
                <select value={newJob.assigned_to} onChange={e => setNewJob({...newJob, assigned_to: e.target.value})} required>
                  <option value="">Select Staff</option>
                  {branchUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>

              {newJob.job_type === 'customer' ? (
                <>
                  <div className="form-group-standard" style={{ position: 'relative' }}>
                    <label>Phone / Name Lookup</label>
                    <input value={newJob.customer_phone} 
                      onChange={e => handlePhoneChange(e.target.value)} 
                      onKeyDown={handleKeyDown}
                      onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                      placeholder="Search..." 
                    />
                    {suggestions.length > 0 && (
                      <div className="glass" style={{ position: 'absolute', top: '100%', left: 0, width: '100%', zIndex: 50, padding: '5px', marginTop: '4px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                        {suggestions.map((s, i) => (
                          <div key={i} onMouseEnter={() => setActiveIndex(i)} onClick={() => fillFromSuggestion(s)} 
                            style={{ padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', background: activeIndex === i ? 'rgba(0,210,255,0.1)' : 'transparent', color: activeIndex === i ? 'var(--accent-color)' : 'inherit' }}>
                            <span style={{ fontWeight: 800 }}>{s.customer_name}</span> ({s.customer_phone})
                            <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>{s.device_model}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group-standard">
                    <label>Customer Name</label>
                    <input value={newJob.customer_name} onChange={e => setNewJob({...newJob, customer_name: e.target.value})} required placeholder="John Doe" />
                  </div>
                </>
              ) : (
                <div className="form-group-standard" style={{ gridColumn: 'span 2' }}>
                  <label>Internal Purpose / Title</label>
                  <input value={newJob.device_model} onChange={e => setNewJob({...newJob, device_model: e.target.value})} required placeholder="e.g. Purchase Duties, Inventory Check..." />
                </div>
              )}

              {newJob.job_type === 'customer' && (
                <div className="form-group-standard" style={{ gridColumn: 'span 2' }}>
                  <label>Device Model</label>
                  <input value={newJob.device_model} onChange={e => setNewJob({...newJob, device_model: e.target.value})} required placeholder="e.g. iPhone 13 Pro" />
                </div>
              )}

              <div className="form-group-standard" style={{ gridColumn: 'span 2' }}>
                <label>Fault / Problem Description</label>
                <textarea value={newJob.problem_description} onChange={e => setNewJob({...newJob, problem_description: e.target.value})} placeholder="Describe the issue..." style={{ minHeight: '60px' }} />
              </div>

              <div className="form-group-standard">
                <label>Entry Date</label>
                <input type="date" value={newJob.entry_date} onChange={e => setNewJob({...newJob, entry_date: e.target.value})} required />
              </div>
              <div className="form-group-standard">
                <label>Exp. Delivery</label>
                <input type="date" value={newJob.expected_delivery_date} onChange={e => setNewJob({...newJob, expected_delivery_date: e.target.value})} />
              </div>

              <div className="form-group-standard">
                <label>Estimate (₹)</label>
                <input type="number" value={newJob.estimate_cost} onChange={e => setNewJob({...newJob, estimate_cost: e.target.value})} placeholder="0" />
              </div>
              <div className="form-group-standard">
                <label>Advance (₹)</label>
                <input type="number" value={newJob.advance_paid} onChange={e => setNewJob({...newJob, advance_paid: e.target.value})} placeholder="0" />
              </div>
              <div className="form-group-standard">
                <label>Delivery Date</label>
                <input type="date" value={newJob.delivery_date || ''} onChange={e => setNewJob({...newJob, delivery_date: e.target.value})} />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => { setShowAddModal(false); setItemToEdit(null); }} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 2 }}>{itemToEdit ? 'Save Changes' : 'Register Service'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Slip Modal */}
      {showPrintModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} className="no-print-overlay">
          <div style={{ background: 'white', color: 'black', width: '100%', maxWidth: '380px', borderRadius: '10px', boxShadow: '0 0 50px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', padding: '15px', background: '#eee', gap: '10px' }}>
               <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => downloadPDF(showPrintModal, true)} className="btn-primary" style={{ padding: '8px 12px', fontSize: '0.75rem' }}><Printer size={14} /> Preview</button>
                  <button onClick={() => downloadPDF(showPrintModal)} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#00d2ff' }}><Download size={14} /> PDF</button>
                  <button onClick={() => sharePDF(showPrintModal)} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#25D366' }}><Share2 size={14} /> WA PDF</button>
                  <button onClick={() => {
                    const msg = getJobMessage(showPrintModal);
                    const cleanPhone = showPrintModal.customer_phone.replace(/\D/g, '');
                    window.open(`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                  }} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#25D366' }}><MessageSquare size={14} /> WA Text</button>
               </div>
               <button onClick={() => setShowPrintModal(null)} className="btn-icon" style={{ color: 'black' }}><X size={20} /></button>
            </div>
             <div id="job-slip" style={{ padding: '40px 30px', background: 'white', width: '380px', margin: '0 auto', color: 'black' }}>
               <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                  <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase' }}>{companyName}</h1>
                  <p style={{ margin: '5px 0', fontSize: '0.8rem', fontWeight: 700, color: '#666' }}>SERVICE REPAIR SLIP</p>
               </div>
               <div style={{ borderBlock: '1.5px solid #000', padding: '15px 0', margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ fontWeight: 800 }}>JOB ID:</span> <span>{showPrintModal.id.slice(0, 8).toUpperCase()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ fontWeight: 800 }}>TYPE:</span> <span>{showPrintModal.job_type === 'house' ? 'IN-HOUSE' : 'CUSTOMER'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ fontWeight: 800 }}>DATE:</span> <span>{new Date(showPrintModal.entry_date).toLocaleDateString('en-GB')}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ fontWeight: 800 }}>BRANCH:</span> <span>{showPrintModal.branches?.name}</span></div>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
                  {showPrintModal.job_type === 'customer' ? (
                    <>
                      <div><label style={{ fontSize: '0.6rem', fontWeight: 800, color: '#777' }}>CUSTOMER DETAILS</label><p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{showPrintModal.customer_name}</p><p style={{ margin: 0, fontSize: '0.9rem' }}>{showPrintModal.customer_phone}</p></div>
                      <div><label style={{ fontSize: '0.6rem', fontWeight: 800, color: '#777' }}>DEVICE & FAULT</label><p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{showPrintModal.device_model}</p><p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic' }}>{showPrintModal.problem_description}</p></div>
                    </>
                  ) : (
                    <div><label style={{ fontSize: '0.6rem', fontWeight: 800, color: '#777' }}>INTERNAL PURPOSE</label><p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>{showPrintModal.device_model}</p><p style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}>{showPrintModal.problem_description}</p></div>
                  )}
                          <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #eee' }}>
                   <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#999', marginBottom: '2px', letterSpacing: '1px' }}>PAYMENT SUMMARY</div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}><span>Estimate Total:</span> <span style={{ fontWeight: 800 }}>₹{parseFloat(showPrintModal.estimate_cost) || 0}</span></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}><span>Advance Paid:</span> <span style={{ color: '#008000', fontWeight: 600 }}>-₹{parseFloat(showPrintModal.advance_paid) || 0}</span></div>
                   <div style={{ borderTop: '2px solid #000', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}><span style={{ fontWeight: 900 }}>BALANCE DUE:</span> <span style={{ fontWeight: 900 }}>₹{(parseFloat(showPrintModal.estimate_cost) || 0) - (parseFloat(showPrintModal.advance_paid) || 0)}</span></div>
                </div>
                <div style={{ marginTop: '40px', textAlign: 'center' }}>
                   <div style={{ borderBottom: '1px solid #000', width: '150px', margin: '0 auto 8px' }}></div>
                   <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#333' }}>Authorized Signature</p>
                </div>
                {showPrintModal.expected_delivery_date && <p style={{ fontSize: '0.85rem', textAlign: 'center', marginTop: '30px', fontWeight: 800, padding: '10px', background: '#eee', borderRadius: '5px' }}>Expected Delivery: {new Date(showPrintModal.expected_delivery_date).toLocaleDateString()}</p>}
               <p style={{ fontSize: '0.65rem', textAlign: 'center', marginTop: '25px', color: '#888' }}>Please provide this slip to collect your device.</p>
        </div>
      </div>
    </div>
  </div>
)}
</div>
  );
};

export default ServicePage;
