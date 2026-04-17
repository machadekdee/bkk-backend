import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Briefcase, AlertCircle, CheckCircle2, Users, FileText,
  ArrowRight, TrendingUp, DollarSign, Clock, Banknote
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { th } from 'date-fns/locale';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalJobs: 0, unbilledJobs: 0, billedJobs: 0, totalCustomers: 0 });
  const [financial, setFinancial] = useState({ totalBilled: 0, thisMonth: 0, outstanding: 0, collected: 0 });
  const [pendingJobs, setPendingJobs] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      setLoading(true); setError(null);
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

      // Parallel fetches — all independent
      const [jobsRes, customersRes, invoicesRes, pendingRes] = await Promise.all([
        supabase.from('jobs').select('id, status'),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('id, job_id, invoice_number, total, status, payment_status, paid_amount, issue_date, created_at').order('created_at', { ascending: false }),
        supabase.from('jobs').select('id, title, cost, customer_snapshot').eq('status', 'unbilled').order('created_at', { ascending: false }).limit(6),
      ]);

      // Jobs stats
      const allJobs = jobsRes.data || [];
      const totalJobs = allJobs.length;
      const unbilledJobs = allJobs.filter(j => j.status === 'unbilled').length;
      const billedJobs = allJobs.filter(j => j.status === 'billed').length;
      setStats({ totalJobs, unbilledJobs, billedJobs, totalCustomers: customersRes.count || 0 });
      setPendingJobs(pendingRes.data || []);

      // Invoices — deduplicate by job_id — keep latest
      const allInvoices = invoicesRes.data || [];
      const seen = new Set();
      const uniqueInvoices = allInvoices.filter(inv => {
        if (seen.has(inv.job_id)) return false;
        seen.add(inv.job_id); return true;
      });

      // Financial: use payment_status (not invoice status)
      const totalBilled = uniqueInvoices.reduce((s, inv) => s + (inv.total || 0), 0);
      const thisMonth = uniqueInvoices
        .filter(inv => inv.issue_date && inv.issue_date >= monthStart && inv.issue_date <= monthEnd)
        .reduce((s, inv) => s + (inv.total || 0), 0);
      const outstanding = uniqueInvoices
        .filter(inv => inv.payment_status !== 'paid')
        .reduce((s, inv) => s + ((inv.total || 0) - (inv.paid_amount || 0)), 0);
      const collected = uniqueInvoices
        .reduce((s, inv) => s + (inv.paid_amount || 0), 0);

      setFinancial({ totalBilled, thisMonth, outstanding, collected });
      setRecentInvoices(uniqueInvoices.slice(0, 6));
    } catch (err) {
      console.error(err); setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const payBadge = (status) => {
    if (status === 'paid') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">ชำระครบ</span>;
    if (status === 'partial') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">บางส่วน</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">ยังไม่ชำระ</span>;
  };

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-xl w-56" />
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}</div>
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}</div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-400 ease-out">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">ภาพรวม</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">{format(new Date(), 'EEEE d MMMM yyyy', { locale: th })}</p>
        </div>
        <button onClick={loadAll} className="text-xs font-bold text-gray-500 hover:text-gray-800 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
          ↺ รีเฟรช
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 font-semibold">
          ⚠ เชื่อมต่อฐานข้อมูลไม่สำเร็จ: {error}
        </div>
      )}

      {/* Job Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'งานทั้งหมด', value: stats.totalJobs, Icon: Briefcase, cls: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: 'รอวางบิล', value: stats.unbilledJobs, Icon: AlertCircle, cls: 'text-amber-600 bg-amber-50 border-amber-100' },
          { label: 'วางบิลแล้ว', value: stats.billedJobs, Icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'ลูกค้าทั้งหมด', value: stats.totalCustomers, Icon: Users, cls: 'text-purple-600 bg-purple-50 border-purple-100' },
        ].map(({ label, value, Icon, cls }) => {
          const [textCls, bgCls, borderCls] = cls.split(' ');
          return (
            <div key={label} className={`rounded-2xl border ${borderCls} bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-500">{label}</span>
                <div className={`p-2 rounded-xl ${bgCls}`}><Icon className={`h-4 w-4 ${textCls}`} /></div>
              </div>
              <div className="text-4xl font-black text-gray-900">{value}</div>
            </div>
          );
        })}
      </div>

      {/* Financial Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'ยอดวางบิลรวม', value: financial.totalBilled, Icon: FileText, gradient: 'from-blue-600 to-blue-700', sub: 'ทุก Invoice ที่ออกแล้ว' },
          { label: 'วางบิลเดือนนี้', value: financial.thisMonth, Icon: TrendingUp, gradient: 'from-emerald-500 to-emerald-700', sub: format(now, 'MMMM yyyy', { locale: th }) },
          { label: 'ค้างรับชำระ', value: financial.outstanding, Icon: Clock, gradient: 'from-amber-500 to-orange-600', sub: 'ยังไม่ได้รับเงิน' },
          { label: 'รับชำระแล้ว', value: financial.collected, Icon: Banknote, gradient: 'from-gray-700 to-gray-900', sub: 'ยอดที่รับจริง' },
        ].map(({ label, value, Icon, gradient, sub }) => (
          <div key={label} className={`rounded-2xl bg-gradient-to-br ${gradient} p-5 shadow-md text-white hover:-translate-y-0.5 transition-all`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">{label}</span>
              <Icon className="h-5 w-5 text-white/50" />
            </div>
            <div className="text-2xl font-black">{formatCurrency(value)}</div>
            <div className="text-xs text-white/50 mt-1 font-medium">{sub}</div>
          </div>
        ))}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pending Jobs */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-gray-800">งานที่รอวางบิล</h3>
              {stats.unbilledJobs > 0 && <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{stats.unbilledJobs}</span>}
            </div>
            <Link to="/jobs" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">ดูทั้งหมด <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {pendingJobs.length === 0 ? (
            <div className="py-14 text-center text-gray-400">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-300" />
              <p className="font-semibold">ไม่มีงานค้างวางบิล 🎉</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingJobs.map(job => (
                <div key={job.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="font-bold text-gray-800 text-sm">{job.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{job.customer_snapshot?.company_name || '—'}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-gray-800 tabular-nums">{formatCurrency(job.cost)}</span>
                    <button onClick={() => navigate(`/jobs/${job.id}/invoice`)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-700 transition-colors shadow-sm">
                      <FileText className="h-3.5 w-3.5" /> ออกบิล
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Recent Invoices */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <h3 className="font-bold text-gray-800">Invoice ล่าสุด</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {recentInvoices.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">ยังไม่มี Invoice</p>
              ) : recentInvoices.map(inv => (
                <div key={inv.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="text-xs font-bold text-gray-700">{inv.invoice_number}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {inv.issue_date ? format(new Date(inv.issue_date), 'd MMM yy', { locale: th }) : '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-gray-900">{formatCurrency(inv.total || 0)}</div>
                    <div className="mt-0.5">{payBadge(inv.payment_status)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-800">ทางลัด</h3>
            </div>
            <div className="p-4 space-y-2">
              {[
                { to: '/jobs', Icon: Briefcase, label: 'สร้างงานใหม่', sub: 'เพิ่มงานขนส่งใหม่', cls: 'text-blue-600 bg-blue-100 hover:bg-blue-50 hover:border-blue-200' },
                { to: '/customers', Icon: Users, label: 'เพิ่มลูกค้า', sub: 'จัดการฐานข้อมูลผู้ติดต่อ', cls: 'text-purple-600 bg-purple-100 hover:bg-purple-50 hover:border-purple-200' },
                { to: '/logs', Icon: Clock, label: 'ประวัติการทำงาน', sub: 'ดู Activity Log', cls: 'text-gray-600 bg-gray-100 hover:bg-gray-50 hover:border-gray-300' },
              ].map(({ to, Icon, label, sub, cls }) => {
                const [iconText, iconBg, ...hoverCls] = cls.split(' ');
                return (
                  <Link key={to} to={to} className={`flex items-center gap-3 p-3 rounded-xl border border-gray-100 transition-all group ${hoverCls.join(' ')}`}>
                    <div className={`p-2 rounded-lg ${iconBg} group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-4 w-4 ${iconText}`} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-800">{label}</div>
                      <div className="text-xs text-gray-400">{sub}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper — used inside component
const now = new Date();
