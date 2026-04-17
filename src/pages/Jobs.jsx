import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  Loader2, Plus, FileText, Edit2, Trash2, Briefcase,
  Building2, AlertTriangle, Banknote, X, Search,
  MessageSquare, Send, ChevronDown, ChevronUp, Image, TrendingUp
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../lib/utils';
import { logActivity } from '../lib/logger';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

// ── Badges ─────────────────────────────────────────────────────
const JobBadge = ({ status }) =>
  status === 'billed'
    ? <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-700">ออกบิลแล้ว</span>
    : <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700">รอออกบิล</span>;

const PAY_OPTS = [
  { value: 'unpaid',  label: 'ยังไม่ชำระ',   cls: 'bg-red-100 text-red-700' },
  { value: 'partial', label: 'บางส่วน',        cls: 'bg-orange-100 text-orange-700' },
  { value: 'paid',    label: 'ชำระครบ ✓',      cls: 'bg-green-100 text-green-700' },
];
const PayBadge = ({ status }) => {
  const o = PAY_OPTS.find(x => x.value === status) || PAY_OPTS[0];
  return <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${o.cls}`}>{o.label}</span>;
};

// ── Job Notes Panel ─────────────────────────────────────────────
function JobNotes({ jobId, initialNotes, onUpdate }) {
  const [notes, setNotes] = useState(Array.isArray(initialNotes) ? initialNotes : []);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [notes]);

  async function addNote() {
    if (!text.trim()) return;
    setSaving(true);
    const username = (() => { try { const p = localStorage.getItem('bdl_user_profile'); return JSON.parse(p)?.display_name || 'admin'; } catch { return 'admin'; } })();
    const newNote = { text: text.trim(), user: username, at: new Date().toISOString() };
    const updated = [...notes, newNote];
    // Use job_notes column (separate from job.notes to avoid schema clash)
    const { error } = await supabase.from('jobs').update({ job_notes: updated }).eq('id', jobId);
    if (!error) { setNotes(updated); setText(''); onUpdate && onUpdate(updated); }
    else alert('บันทึกหมายเหตุไม่สำเร็จ: ' + error.message);
    setSaving(false);
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50/60 px-6 py-4 space-y-3">
      <div className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" /> หมายเหตุ / บันทึกงาน
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
        {notes.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">ยังไม่มีหมายเหตุ — เพิ่มได้ด้านล่าง</p>
        ) : notes.map((n, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[9px] font-black text-white shrink-0">
                {n.user?.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-gray-700">{n.user}</span>
              <span className="text-[11px] text-gray-400 font-medium">
                {format(new Date(n.at), 'd MMM yy HH:mm', { locale: th })}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{n.text}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="พิมพ์หมายเหตุหรือบันทึก... (Enter เพื่อบันทึก)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addNote()}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
        />
        <button onClick={addNote} disabled={saving || !text.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-40 shadow-sm">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          บันทึก
        </button>
      </div>
    </div>
  );
}

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [paySlipFile, setPaySlipFile] = useState(null);
  const [slipViewUrl, setSlipViewUrl] = useState(null);
  const [payingSaving, setPayingSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [similarityWarning, setSimilarityWarning] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openPayPopover, setOpenPayPopover] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});
  // For editing payment status inside edit modal
  const [editPayStatus, setEditPayStatus] = useState(null); // holds invoice for editing job
  const navigate = useNavigate();

  const emptyForm = { title: '', description: '', cost: '', credit_days: '30', customer_id: '', c_company_name: '', c_address: '', c_tax_id: '', c_contact_name: '', c_phone: '' };
  const [formData, setFormData] = useState(emptyForm);
  const [editingInvoice, setEditingInvoice] = useState(null); // invoice associated with job being edited

  useEffect(() => { fetchJobs(); fetchCustomers(); }, []);

  async function fetchJobs() {
    setLoading(true); setDbError(null);
    const { data: jobsData, error: jobsErr } = await supabase
      .from('jobs').select('*, customer:customers(company_name)').order('created_at', { ascending: false });
    if (jobsErr) { setDbError('ไม่สามารถโหลดข้อมูล: ' + jobsErr.message); setLoading(false); return; }
    const { data: invData } = await supabase
      .from('invoices').select('id, job_id, invoice_number, total, status, payment_status, paid_amount, slip_url');
    const invMap = {};
    (invData || []).forEach(inv => { if (!invMap[inv.job_id]) invMap[inv.job_id] = inv; });
    setJobs((jobsData || []).map(j => ({ ...j, invoice: invMap[j.id] || null })));
    setLoading(false);
  }

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('*');
    if (data) setCustomers(data);
  }

  function handleCustomerSelect(cid) {
    if (!cid) { setFormData(f => ({ ...f, customer_id: '', c_company_name: '', c_address: '', c_tax_id: '', c_contact_name: '', c_phone: '' })); return; }
    const c = customers.find(x => x.id === cid);
    if (c) {
      const contact = Array.isArray(c.contacts) && c.contacts.length > 0 ? c.contacts[0] : {};
      setFormData(f => ({ ...f, customer_id: cid, c_company_name: c.company_name || '', c_address: c.address || '', c_tax_id: c.tax_id || '', c_contact_name: contact.name || '', c_phone: contact.phone || '' }));
    }
  }

  function checkSimilarity(s1, s2) {
    const a = s1.toLowerCase().replace(/[\W_]+/g, ''), b = s2.toLowerCase().replace(/[\W_]+/g, '');
    return a === b || (a.length > 4 && b.includes(a)) || (b.length > 4 && a.includes(b));
  }

  async function saveJob(overrideDuplicate = false) {
    let finalCustomerId = formData.customer_id;
    const snap = { company_name: formData.c_company_name, address: formData.c_address, tax_id: formData.c_tax_id, contact_name: formData.c_contact_name, phone: formData.c_phone };
    if (!formData.customer_id && formData.c_company_name.trim()) {
      if (!overrideDuplicate) {
        const similar = customers.find(c => checkSimilarity(c.company_name, formData.c_company_name));
        if (similar) { setSimilarityWarning(similar); return; }
      }
      const { data: nc } = await supabase.from('customers').insert([{ company_name: formData.c_company_name, address: formData.c_address, tax_id: formData.c_tax_id, contacts: [{ name: formData.c_contact_name, phone: formData.c_phone }] }]).select().single();
      if (nc) { finalCustomerId = nc.id; logActivity('เพิ่มลูกค้าใหม่', 'customer', formData.c_company_name); }
    } else if (formData.customer_id) {
      await supabase.from('customers').update({ company_name: formData.c_company_name, address: formData.c_address, tax_id: formData.c_tax_id }).eq('id', formData.customer_id);
    }
    const payload = { title: formData.title, description: formData.description, cost: parseFloat(formData.cost) || 0, credit_days: parseInt(formData.credit_days) || 30, customer_id: finalCustomerId || null, customer_snapshot: snap };
    if (editingId) {
      const { error } = await supabase.from('jobs').update(payload).eq('id', editingId);
      if (!error) {
        logActivity('แก้ไขงาน', 'job', formData.title);
        // Update payment status if invoice exists and status changed
        if (editingInvoice && editPayStatus && editPayStatus !== editingInvoice.payment_status) {
          await supabase.from('invoices').update({ payment_status: editPayStatus }).eq('id', editingInvoice.id);
        }
      } else { alert('แก้ไขไม่สำเร็จ: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('jobs').insert([{ ...payload, status: 'unbilled' }]);
      if (!error) logActivity('สร้างงานใหม่', 'job', formData.title);
      else { alert('บันทึกไม่สำเร็จ: ' + error.message); return; }
    }
    closeModal(); fetchJobs(); fetchCustomers();
  }

  async function handleDelete(id, title) {
    if (!confirm(`ลบงาน "${title}" และ Invoice ทั้งหมดที่ผูกอยู่?`)) return;
    await supabase.from('invoices').delete().eq('job_id', id);
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (!error) { logActivity('ลบงาน', 'job', title); fetchJobs(); }
    else alert('ลบไม่สำเร็จ: ' + error.message);
  }

  async function savePayment() {
    if (!payModal) return; setPayingSaving(true);
    const amount = parseFloat(payAmount) || 0;
    const newPaid = (payModal.paidAmount || 0) + amount;
    const newStatus = newPaid >= payModal.total ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
    // Upload slip if provided
    let slipUrl = payModal.existingSlipUrl || null;
    if (paySlipFile) {
      const ext = paySlipFile.name.split('.').pop();
      const filename = `slip_${payModal.invoiceId}_${Date.now()}.${ext}`;
      const { data: upData, error: upErr } = await supabase.storage
        .from('payment-slips').upload(filename, paySlipFile, { upsert: true });
      if (!upErr && upData) {
        const { data: { publicUrl } } = supabase.storage.from('payment-slips').getPublicUrl(filename);
        slipUrl = publicUrl;
      } else if (upErr) {
        console.warn('Slip upload failed (bucket may not exist), saving without slip:', upErr.message);
      }
    }
    const updateData = { payment_status: newStatus, paid_amount: newPaid, payment_note: payNote, slip_url: slipUrl };
    if (newStatus === 'paid') updateData.paid_at = new Date().toISOString();
    const { error } = await supabase.from('invoices').update(updateData).eq('id', payModal.invoiceId);
    if (!error) { logActivity('บันทึกรับชำระ', 'invoice', payModal.invoiceNo); setPayModal(null); setPayAmount(''); setPayNote(''); setPaySlipFile(null); fetchJobs(); }
    else alert('บันทึกไม่สำเร็จ: ' + error.message);
    setPayingSaving(false);
  }

  async function updatePaymentStatus(invoiceId, newStatus) {
    const { error } = await supabase.from('invoices').update({ payment_status: newStatus }).eq('id', invoiceId);
    if (!error) { setOpenPayPopover(null); fetchJobs(); }
    else alert('อัปเดตไม่สำเร็จ: ' + error.message);
  }

  function openNewModal() { setEditingId(null); setFormData(emptyForm); setEditingInvoice(null); setEditPayStatus(null); setIsModalOpen(true); }
  function openEditModal(job) {
    setEditingId(job.id);
    const snap = job.customer_snapshot || {};
    setFormData({ title: job.title, description: job.description || '', cost: job.cost || '', credit_days: job.credit_days || 30, customer_id: job.customer_id || '', c_company_name: snap.company_name || job.customer?.company_name || '', c_address: snap.address || '', c_tax_id: snap.tax_id || '', c_contact_name: snap.contact_name || '', c_phone: snap.phone || '' });
    setEditingInvoice(job.invoice || null);
    setEditPayStatus(job.invoice?.payment_status || null);
    setIsModalOpen(true);
  }
  function closeModal() { setIsModalOpen(false); setSimilarityWarning(null); setFormData(emptyForm); setEditingInvoice(null); setEditPayStatus(null); }

  const filtered = jobs.filter(j => {
    const q = searchQuery.toLowerCase();
    const matchQ = j.title.toLowerCase().includes(q) || (j.customer_snapshot?.company_name || '').toLowerCase().includes(q);
    const payStatus = j.invoice?.payment_status || 'unpaid';
    if (statusFilter === 'all') return matchQ;
    if (statusFilter === 'unbilled') return matchQ && j.status === 'unbilled';
    if (statusFilter === 'billed') return matchQ && j.status === 'billed';
    if (statusFilter === 'unpaid') return matchQ && j.status === 'billed' && payStatus === 'unpaid';
    if (statusFilter === 'paid') return matchQ && payStatus === 'paid';
    return matchQ;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Global pay popover */}
      {openPayPopover && (
        <PayPopover
          invoiceId={openPayPopover.invoiceId}
          currentStatus={openPayPopover.currentStatus}
          anchorEl={openPayPopover.anchorEl}
          onUpdate={updatePaymentStatus}
          onClose={() => setOpenPayPopover(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">จัดการงาน</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">บันทึกงาน ออกบิล และติดตามการชำระเงิน</p>
        </div>
        <button onClick={openNewModal}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-gray-700 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0">
          <Plus className="h-4 w-4" /> สร้างงานใหม่
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="ค้นหาชื่องาน หรือบริษัทลูกค้า..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['all','ทั้งหมด'], ['unbilled','รอออกบิล'], ['billed','ออกบิลแล้ว'], ['unpaid','ยังไม่ชำระ'], ['paid','ชำระแล้ว']].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${statusFilter === v ? 'bg-gray-900 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {dbError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <span className="text-sm font-semibold text-red-700">{dbError}</span>
        </div>
      )}

      {/* Jobs List */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-gray-300"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Briefcase className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">ไม่พบข้อมูล</p>
            <button onClick={openNewModal} className="mt-3 text-sm font-bold text-blue-600 hover:underline">+ สร้างงานใหม่</button>
          </div>
        ) : (
          filtered.map((job, idx) => {
            const inv = job.invoice;
            const payStatus = inv?.payment_status || (job.status === 'billed' ? 'unpaid' : null);
            const noteCount = Array.isArray(job.job_notes) ? job.job_notes.length : 0;
            const profit = inv ? (inv.total || 0) - (job.cost || 0) : null;
            const isLastRow = idx === filtered.length - 1;

            return (
              <div key={job.id} className={!isLastRow ? 'border-b border-gray-100' : ''}>
                {/* Main Row */}
                <div className="px-6 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-center gap-4">

                    {/* ① Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{job.title}</span>
                        <JobBadge status={job.status} />
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{job.customer_snapshot?.company_name || job.customer?.company_name || '\u2014'}</span>
                        {job.credit_days > 0 && <span className="text-gray-400">· เครดิต {job.credit_days} วัน</span>}
                      </div>
                    </div>

                    {/* ② Amount + Profit */}
                    <div className="text-right shrink-0 w-40">
                      <div className="text-xs text-gray-400 font-medium">ต้นทุน {formatCurrency(job.cost)}</div>
                      {inv && <div className="font-black text-gray-900 tabular-nums text-base">{formatCurrency(inv.total || 0)}</div>}
                      {profit !== null && (
                        <div className={`text-xs font-bold mt-0.5 ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {profit >= 0 ? '+' : ''}{formatCurrency(profit)} กำไร
                        </div>
                      )}
                      {!inv && <div className="font-black text-gray-500 tabular-nums">{formatCurrency(job.cost)}</div>}
                      {inv?.paid_amount > 0 && <div className="text-xs text-blue-600 font-semibold">รับแล้ว {formatCurrency(inv.paid_amount)}</div>}
                    </div>

                    {/* ③ Payment Status — static display, edit via แก้ไขงาน */}
                    <div className="shrink-0 w-36">
                      {inv ? <PayBadge status={payStatus} /> : <span className="text-gray-300 text-sm">—</span>}
                    </div>

                    {/* ④ Actions — clean single row */}
                    <div className="shrink-0 flex items-center gap-2">
                      {/* Notes toggle */}
                      <button
                        onClick={() => setExpandedNotes(p => ({ ...p, [job.id]: !p[job.id] }))}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${expandedNotes[job.id] ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
                        title="หมายเหตุงาน"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {noteCount > 0 && <span>{noteCount}</span>}
                        {expandedNotes[job.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      {/* Edit */}
                      <button onClick={() => openEditModal(job)} title="แก้ไข"
                        className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>

                      {/* Delete */}
                      <button onClick={() => handleDelete(job.id, job.title)} title="ลบ"
                        className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>

                      {/* Primary action */}
                      {job.status === 'unbilled' ? (
                        <button onClick={() => navigate(`/jobs/${job.id}/invoice`)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-colors shadow-sm">
                          <FileText className="h-3.5 w-3.5" /> ออกบิล
                        </button>
                      ) : (
                        <>
                          <Link to={`/jobs/${job.id}/invoice`}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100 border border-blue-200 transition-colors">
                            <FileText className="h-3.5 w-3.5" /> ดูบิล
                          </Link>
                          {inv && payStatus === 'paid' ? (
                            // Paid = green indicator (not a button)
                            <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-100 text-green-700 text-sm font-bold border border-green-200">
                              ✓ ชำระครบ
                            </span>
                          ) : inv ? (
                            // Unpaid/partial = red button
                            <button
                              onClick={() => { setPayModal({ invoiceId: inv.id, invoiceNo: inv.invoice_number, total: inv.total || job.cost, paidAmount: inv.paid_amount || 0, existingSlipUrl: inv.slip_url || null }); setPayAmount(''); setPayNote(''); setPaySlipFile(null); }}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors shadow-sm">
                              <Banknote className="h-3.5 w-3.5" /> รับชำระ
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes Drawer */}
                {expandedNotes[job.id] && (
                  <JobNotes
                    jobId={job.id}
                    initialNotes={job.job_notes || []}
                    onUpdate={updated => setJobs(prev => prev.map(j => j.id === job.id ? { ...j, job_notes: updated } : j))}
                  />
                )}
              </div>
            );
          })
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/60 text-xs text-gray-500 font-medium">
            {filtered.length} รายการ {(searchQuery || statusFilter !== 'all') ? `— จาก ${jobs.length} รายการ` : 'ทั้งหมด'}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-900 text-lg">บันทึกรับชำระเงิน</h3>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">{payModal.invoiceNo}</p>
              </div>
              <button onClick={() => setPayModal(null)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-7 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: 'ยอดรวม', v: payModal.total, c: 'bg-gray-50 border-gray-200 text-gray-900' },
                  { l: 'รับแล้ว', v: payModal.paidAmount, c: 'bg-green-50 border-green-200 text-green-800' },
                  { l: 'คงค้าง', v: Math.max(0, payModal.total - payModal.paidAmount), c: 'bg-red-50 border-red-200 text-red-700' },
                ].map(x => (
                  <div key={x.l} className={`p-3 border rounded-xl text-center ${x.c}`}>
                    <div className="text-[10px] font-black uppercase opacity-60 mb-1">{x.l}</div>
                    <div className="font-black text-sm">{formatCurrency(x.v)}</div>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">จำนวนที่รับครั้งนี้ (฿)</label>
                <input type="number" step="0.01" placeholder="0.00" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  className="w-full text-2xl font-black text-right border border-gray-200 rounded-xl px-5 py-4 bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map(pct => (
                    <button key={pct} onClick={() => setPayAmount(String(((payModal.total - payModal.paidAmount) * pct / 100).toFixed(2)))}   
                      className="flex-1 py-2 text-xs font-bold bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 rounded-xl border border-gray-200 transition-colors">{pct}%</button>
                  ))}
                </div>
              </div>
              {/* Slip Upload */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">แนบสลิปการโอน</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors">
                  <input type="file" id="slip-upload" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files[0]; if (f) setPaySlipFile(f); }} />
                  {paySlipFile ? (
                    <div className="space-y-2">
                      <img src={URL.createObjectURL(paySlipFile)} alt="slip preview" className="max-h-40 mx-auto rounded-lg object-contain" />
                      <p className="text-xs text-gray-500 font-medium">{paySlipFile.name}</p>
                      <button onClick={() => setPaySlipFile(null)} className="text-xs text-red-500 hover:underline">ลบรูป</button>
                    </div>
                  ) : payModal.existingSlipUrl ? (
                    <div className="space-y-2">
                      <img src={payModal.existingSlipUrl} alt="existing slip" className="max-h-32 mx-auto rounded-lg object-contain" />
                      <label htmlFor="slip-upload" className="block text-xs font-bold text-blue-600 cursor-pointer hover:underline">เปลี่ยนรูปสลิป</label>
                    </div>
                  ) : (
                    <label htmlFor="slip-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Image className="h-8 w-8" />
                        <span className="text-xs font-semibold">คลิกเพื่ออัปโหลดสลิป</span>
                        <span className="text-[10px]">JPG, PNG, WEBP</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">หมายเหตุเพิ่มเติม</label>
                <input type="text" placeholder="หมายเหตุ..." value={payNote} onChange={e => setPayNote(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:border-blue-400 outline-none" />
              </div>
            </div>
            <div className="px-7 pb-7 flex gap-3">
              <button onClick={() => setPayModal(null)} className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">ยกเลิก</button>
              <button onClick={savePayment} disabled={payingSaving || !payAmount}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm disabled:opacity-40">
                {payingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                บันทึกรับชำระ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-gray-900 text-lg">{editingId ? 'แก้ไขงาน' : 'สร้างงานใหม่'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">กรอกรายละเอียดงานและข้อมูลลูกค้า</p>
              </div>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-7 space-y-6 custom-scrollbar">
              <div>
                <div className="flex items-center gap-2 mb-4"><div className="h-5 w-1 rounded-full bg-blue-500" /><span className="text-xs font-black uppercase tracking-wider text-gray-500">ข้อมูลงาน</span></div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">ชื่องาน <span className="text-red-500">*</span></label>
                    <input type="text" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400" placeholder="เช่น ขนส่งสินค้า ABC สาขาชลบุรี" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">รายละเอียด</label>
                    <textarea rows="2" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none placeholder:text-gray-400" placeholder="รายละเอียดงาน..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">ราคา (฿) <span className="text-red-500">*</span></label>
                      <input type="number" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all" placeholder="0.00" value={formData.cost} onChange={e => setFormData({ ...formData, cost: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">เครดิต (วัน)</label>
                      <select className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold focus:bg-white focus:border-blue-400 outline-none" value={formData.credit_days} onChange={e => setFormData({ ...formData, credit_days: e.target.value })}>
                        {[['0','เงินสด'],['7','7 วัน'],['15','15 วัน'],['30','30 วัน'],['45','45 วัน'],['60','60 วัน'],['90','90 วัน']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              <div>
                <div className="flex items-center gap-2 mb-4"><div className="h-5 w-1 rounded-full bg-purple-500" /><span className="text-xs font-black uppercase tracking-wider text-gray-500">ข้อมูลลูกค้า</span></div>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">เลือกจากฐานข้อมูล</label>
                  <select className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 focus:bg-white focus:border-blue-400 outline-none" value={formData.customer_id} onChange={e => handleCustomerSelect(e.target.value)}>
                    <option value="">— กรอกข้อมูลลูกค้าใหม่ —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                  {!formData.customer_id && <p className="text-xs text-blue-500 mt-1 font-medium">• จะถูกบันทึกเป็นลูกค้าใหม่โดยอัตโนมัติ</p>}
                </div>
                <div className="grid grid-cols-2 gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">ชื่อบริษัท / ลูกค้า</label>
                    <input type="text" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 outline-none" value={formData.c_company_name} onChange={e => setFormData({ ...formData, c_company_name: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">ที่อยู่เรียกเก็บเงิน</label>
                    <textarea rows="2" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 outline-none resize-none" value={formData.c_address} onChange={e => setFormData({ ...formData, c_address: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Tax ID</label>
                    <input type="text" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 outline-none" value={formData.c_tax_id} onChange={e => setFormData({ ...formData, c_tax_id: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">ผู้ติดต่อ</label>
                    <input type="text" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 outline-none" value={formData.c_contact_name} onChange={e => setFormData({ ...formData, c_contact_name: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Payment Status section — only visible when editing a billed job */}
              {editingId && editingInvoice && (
                <>
                  <div className="h-px bg-gray-100" />
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-5 w-1 rounded-full bg-green-500" />
                      <span className="text-xs font-black uppercase tracking-wider text-gray-500">สถานะการชำระเงิน</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {PAY_OPTS.map(o => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setEditPayStatus(o.value)}
                          className={`py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all ${
                            editPayStatus === o.value
                              ? `${o.cls} border-current shadow-sm`
                              : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                          }`}
                        >
                          {editPayStatus === o.value && <span className="mr-1">✓</span>}
                          {o.label}
                        </button>
                      ))}
                    </div>
                    {editingInvoice.paid_amount > 0 && (
                      <p className="text-xs text-gray-400 font-medium mt-2">ยอดที่รับชำระแล้ว: {formatCurrency(editingInvoice.paid_amount)} / {formatCurrency(editingInvoice.total || 0)}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {similarityWarning && (
              <div className="px-7 py-4 bg-amber-50 border-t border-amber-200 shrink-0">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">ชื่อใกล้เคียงกับ "{similarityWarning.company_name}"</p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setSimilarityWarning(null)} className="text-xs font-bold px-3 py-2 bg-white border border-amber-200 text-amber-800 rounded-lg">ยกเลิก</button>
                      <button onClick={() => { handleCustomerSelect(similarityWarning.id); setSimilarityWarning(null); }} className="text-xs font-bold px-3 py-2 bg-blue-600 text-white rounded-lg">ใช้รายชื่อเดิม</button>
                      <button onClick={() => saveJob(true)} className="text-xs font-bold px-3 py-2 bg-amber-600 text-white rounded-lg">บันทึกใหม่</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="px-7 py-5 border-t border-gray-100 bg-gray-50/60 flex justify-end gap-3 shrink-0">
              <button onClick={closeModal} className="px-6 py-3 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">ยกเลิก</button>
              <button onClick={() => saveJob(false)} className="px-7 py-3 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-gray-700 shadow-sm transition-colors">
                {editingId ? 'บันทึกการแก้ไข' : 'สร้างงาน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
