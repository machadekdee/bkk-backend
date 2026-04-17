import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import InvoicePreview from '../components/InvoicePreview';
import WHTCertificate from '../components/WHTCertificate';
import {
  Loader2, Plus, Download, Save, ArrowLeft,
  CheckCircle2, FileText, PenLine, Hash, Trash2,
  AlertTriangle, Receipt
} from 'lucide-react';
import { addDays, format } from 'date-fns';
import { logActivity } from '../lib/logger';
import { formatCurrency } from '../lib/utils';

// Generate a stable, sequential invoice number based on date
function genInvoiceNumber() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `INV-${yy}${mm}${dd}-${seq}`;
}

export default function InvoiceGenerator() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);
  // Stable invoice number — generated ONCE and never regenerated
  const stableNumberRef = useRef(genInvoiceNumber());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [job, setJob] = useState(null);
  const [existingInvoiceId, setExistingInvoiceId] = useState(null);

  const [activeTab, setActiveTab] = useState('invoice'); // 'invoice' | 'wht'

  const [invoiceData, setInvoiceData] = useState({
    invoice_number: stableNumberRef.current,
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    showSignature: true,
    notes: '',
  });

  const [items, setItems] = useState([
    { description: 'ค่าขนส่งสินค้า (Transportation)', qty: 1, price: 0, tax: '0', wht: '1' }
  ]);

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  // ── Load data ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*, customer:customers(*)')
      .eq('id', jobId)
      .single();

    if (!jobData) { setLoading(false); return; }
    setJob(jobData);

    // Look for existing invoice for this job
    const { data: inv } = await supabase
      .from('invoices')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inv) {
      setExistingInvoiceId(inv.id);
      setInvoiceData({
        invoice_number: inv.invoice_number,
        issue_date: inv.issue_date || format(new Date(), 'yyyy-MM-dd'),
        due_date: inv.due_date || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        showSignature: inv.metadata?.showSignature ?? true,
        notes: inv.notes || '',
      });
      if (Array.isArray(inv.items) && inv.items.length > 0) {
        setItems(inv.items);
      } else {
        setItems([{ description: 'ค่าขนส่งสินค้า (Transportation)', qty: 1, price: jobData.cost || 0, tax: '0', wht: '1' }]);
      }
    } else {
      // No existing invoice — pre-fill with job cost
      setItems([{ description: 'ค่าขนส่งสินค้า (Transportation)', qty: 1, price: jobData.cost || 0, tax: '0', wht: '1' }]);
    }

    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Computed totals ────────────────────────────────────────────────
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const totalVat = items.reduce((s, i) => s + (i.tax === '7' ? i.qty * i.price * 0.07 : 0), 0);
  const grandTotal = subtotal + totalVat;
  const totalWht = items.reduce((s, i) => {
    const base = i.qty * i.price;
    return s + (i.wht === '3' ? base * 0.03 : i.wht === '1' ? base * 0.01 : 0);
  }, 0);
  const netPayable = grandTotal - totalWht;

  // ── Save (Upsert via existingInvoiceId → prevents duplicates) ─────
  const saveInvoice = async (markBilled = false) => {
    if (loading) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    const payload = {
      job_id: jobId,
      invoice_number: invoiceData.invoice_number,
      issue_date: invoiceData.issue_date,
      due_date: invoiceData.due_date,
      subtotal,
      tax: totalVat,
      total: grandTotal,
      status: markBilled ? 'issued' : 'draft',
      items,
      metadata: { showSignature: invoiceData.showSignature },
      notes: invoiceData.notes,
    };

    let error = null;

    if (existingInvoiceId) {
      // Always UPDATE if we know the ID — never create duplicates
      const res = await supabase.from('invoices').update(payload).eq('id', existingInvoiceId);
      error = res.error;
      // If items/metadata col missing, retry without them
      if (error?.message?.includes('column')) {
        const { items: _i, metadata: _m, notes: _n, ...safe } = payload;
        const res2 = await supabase.from('invoices').update(safe).eq('id', existingInvoiceId);
        error = res2.error;
      }
    } else {
      // INSERT — then store ID to prevent future duplicates in this session
      const res = await supabase.from('invoices').insert([payload]).select('id').single();
      error = res.error;
      if (!error && res.data) {
        setExistingInvoiceId(res.data.id);
      }
      // If items/metadata col missing, retry without them
      if (error?.message?.includes('column')) {
        const { items: _i, metadata: _m, notes: _n, ...safe } = payload;
        const res2 = await supabase.from('invoices').insert([safe]).select('id').single();
        error = res2.error;
        if (!error && res2.data) setExistingInvoiceId(res2.data.id);
      }
    }

    if (!error) {
      if (markBilled) {
        await supabase.from('jobs').update({ status: 'billed' }).eq('id', jobId);
        logActivity('วางบิลงาน', 'invoice', invoiceData.invoice_number);
        navigate('/jobs');
      } else {
        logActivity('บันทึก Draft Invoice', 'invoice', invoiceData.invoice_number);
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      }
    } else {
      setSaveError('บันทึกไม่สำเร็จ: ' + error.message);
    }
    setSaving(false);
  };

  // ── Render ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-slate-400">
      <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      <p className="text-sm font-medium animate-pulse">กำลังโหลดข้อมูล Invoice...</p>
    </div>
  );

  if (!job) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-slate-400">
      <FileText className="h-12 w-12" />
      <p className="font-semibold text-slate-500">ไม่พบข้อมูลงานนี้</p>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out print:h-auto print:block">

      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <div className="shrink-0 print:hidden mb-5 space-y-4">

        {/* Title + Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/jobs')}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-tight">
                ใบแจ้งหนี้ · {invoiceData.invoice_number}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">📋 งาน: {job.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveError && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                <AlertTriangle className="h-3.5 w-3.5" /> {saveError}
              </div>
            )}
            {saved && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                <CheckCircle2 className="h-3.5 w-3.5" /> บันทึก Draft แล้ว ✓
              </div>
            )}
            {/* Tab Switcher */}
            <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 gap-0.5">
              <button onClick={() => setActiveTab('invoice')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${ activeTab === 'invoice' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}` }>
                <FileText className="h-3.5 w-3.5" /> Invoice
              </button>
              <button onClick={() => setActiveTab('wht')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${ activeTab === 'wht' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}` }>
                <Receipt className="h-3.5 w-3.5" /> ใบหัก ณ ที่จ่าย
              </button>
            </div>
            <button
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download className="h-4 w-4" /> พิมพ์
            </button>
            <button
              onClick={() => saveInvoice(false)}
              disabled={saving || activeTab === 'wht'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100 transition-all disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              บันทึก Draft
            </button>
            <button
              onClick={() => saveInvoice(true)}
              disabled={saving || activeTab === 'wht'}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 transition-all shadow-sm disabled:opacity-40"
            >
              <CheckCircle2 className="h-4 w-4" /> วางบิล
            </button>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Invoice Meta */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
              <Hash className="h-3 w-3" /> ข้อมูลเอกสาร
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Invoice No.</label>
                <input
                  type="text"
                  className="w-full text-sm font-black border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  value={invoiceData.invoice_number}
                  onChange={e => setInvoiceData(p => ({ ...p, invoice_number: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">วันที่ออก</label>
                  <input
                    type="date"
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-400 outline-none transition-all"
                    value={invoiceData.issue_date}
                    onChange={e => setInvoiceData(p => ({ ...p, issue_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ครบกำหนด</label>
                  <input
                    type="date"
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-400 outline-none transition-all"
                    value={invoiceData.due_date}
                    onChange={e => setInvoiceData(p => ({ ...p, due_date: e.target.value }))}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div className="relative flex-shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={invoiceData.showSignature} onChange={e => setInvoiceData(p => ({ ...p, showSignature: e.target.checked }))} />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-500 transition-colors duration-200"></div>
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform duration-200"></div>
                </div>
                <span className="text-xs font-bold text-slate-600">แสดงช่องลายเซ็น</span>
              </label>
              {existingInvoiceId && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg font-bold">
                  <CheckCircle2 className="h-3 w-3" /> โหลดข้อมูลเดิมจาก Database แล้ว
                </div>
              )}
            </div>
          </div>

          {/* Items Panel */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <PenLine className="h-3 w-3" /> รายการเรียกเก็บ
              </div>
              <button
                onClick={() => setItems(p => [...p, { description: '', qty: 1, price: 0, tax: '7', wht: '3' }])}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="h-3 w-3" /> เพิ่มรายการ
              </button>
            </div>

            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
              {items.map((item, idx) => (
                <div key={idx} className="relative group bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 hover:border-slate-300 transition-colors">
                  <button
                    onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full bg-white border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 shadow-sm"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <input
                    type="text"
                    placeholder="รายละเอียดบริการ..."
                    className="w-full text-sm font-medium border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none pr-9"
                    value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-bold">จำนวน</span>
                      <input type="number" className="w-16 text-sm text-center border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:border-blue-400 outline-none" value={item.qty} onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="flex items-center gap-1 flex-1 min-w-[100px]">
                      <span className="text-[10px] text-slate-400 font-bold">฿</span>
                      <input type="number" className="w-full text-sm font-bold text-right border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:border-blue-400 outline-none" value={item.price} onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)} />
                    </div>
                    <select className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 outline-none focus:border-blue-400" value={item.tax} onChange={e => updateItem(idx, 'tax', e.target.value)}>
                      <option value="7">VAT 7%</option>
                      <option value="0">0% Ex</option>
                    </select>
                    <select className="text-xs font-bold border border-blue-100 rounded-lg px-2 py-1.5 bg-blue-50 text-blue-700 outline-none focus:border-blue-400" value={item.wht} onChange={e => updateItem(idx, 'wht', e.target.value)}>
                      <option value="3">WHT 3%</option>
                      <option value="1">WHT 1%</option>
                      <option value="0">WHT 0%</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Strip */}
            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-4 gap-2 text-xs">
              <div className="text-center p-2 bg-slate-50 rounded-xl">
                <div className="text-slate-400 font-medium mb-1">Subtotal</div>
                <div className="font-black text-slate-800">{formatCurrency(subtotal)}</div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-xl">
                <div className="text-slate-400 font-medium mb-1">VAT</div>
                <div className="font-black text-slate-800">+{formatCurrency(totalVat)}</div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-xl">
                <div className="text-slate-400 font-medium mb-1">WHT</div>
                <div className="font-black text-red-500">-{formatCurrency(totalWht)}</div>
              </div>
              <div className="text-center p-2 bg-slate-900 rounded-xl">
                <div className="text-slate-400 font-medium mb-1">Net</div>
                <div className="font-black text-yellow-400">{formatCurrency(netPayable)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PREVIEW ─────────────────────────────────────────────── */}
      <div className="flex-1 w-full bg-gradient-to-b from-slate-200 to-slate-300 rounded-2xl overflow-auto relative shadow-inner print:bg-white print:rounded-none print:m-0 print:overflow-visible print:shadow-none">
        <div className="absolute inset-0 p-8 flex justify-center print:static print:p-0">
          <div
            id="preview-scale-wrapper"
            className="origin-top scale-75 sm:scale-[0.85] lg:scale-90 xl:scale-100 transition-none pb-24 print:scale-100 print:transform-none print:pb-0"
          >
            {activeTab === 'invoice' ? (
              <InvoicePreview
                ref={printRef}
                invoiceData={invoiceData}
                jobData={job}
                items={items}
                showSignature={invoiceData.showSignature}
              />
            ) : (
              <WHTCertificate
                invoiceData={invoiceData}
                jobData={job}
                items={items}
              />
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
