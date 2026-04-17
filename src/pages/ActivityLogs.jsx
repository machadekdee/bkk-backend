import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Loader2, Briefcase, Users, FileText, Trash2, Search, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const typeConfig = {
  job:      { Icon: Briefcase, cls: 'bg-blue-100 text-blue-600', label: 'งาน' },
  customer: { Icon: Users,     cls: 'bg-purple-100 text-purple-600', label: 'ลูกค้า' },
  invoice:  { Icon: FileText,  cls: 'bg-emerald-100 text-emerald-600', label: 'Invoice' },
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    setLoading(true);
    setDbError(null);
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      if (error.code === '42P01') {
        setDbError('ยังไม่มีตาราง activity_logs — รันคำสั่ง SQL ด้านล่างใน Supabase เพื่อสร้างตาราง');
      } else {
        setDbError(error.message);
      }
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  }

  async function clearLogs() {
    if (!confirm('ล้างประวัติทั้งหมด?')) return;
    await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    fetchLogs();
  }

  const filtered = logs.filter(l => {
    const matchType = typeFilter === 'all' || l.entity_type === typeFilter;
    const q = searchQuery.toLowerCase();
    const matchQ = (l.action || '').toLowerCase().includes(q) || (l.entity_name || '').toLowerCase().includes(q) || (l.user_email || '').toLowerCase().includes(q);
    return matchType && matchQ;
  });

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400 ease-out">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">ประวัติการทำงาน</h1>
          <p className="text-sm text-slate-400 font-medium mt-0.5">บันทึกกิจกรรมทั้งหมดในระบบ</p>
        </div>
        <button onClick={clearLogs} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors">
          <Trash2 className="h-4 w-4" /> ล้างประวัติ
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
          <input type="text" placeholder="ค้นหา action, ชื่อรายการ, ผู้ทำ..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none transition-all placeholder:text-slate-300" />
        </div>
        <div className="flex gap-1.5">
          {[['all','ทั้งหมด'], ['job','งาน'], ['customer','ลูกค้า'], ['invoice','Invoice']].map(([v, l]) => (
            <button key={v} onClick={() => setTypeFilter(v)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${typeFilter === v ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-800'}`}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Error: missing table */}
      {dbError && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900 text-sm">{dbError}</div>
              <div className="mt-2 p-3 bg-white rounded-xl border border-amber-100">
                <p className="text-xs text-slate-500 font-bold mb-1.5">รันใน Supabase SQL Editor:</p>
                <code className="text-xs text-slate-700 font-mono whitespace-pre-wrap block">{`CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`}</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20 text-slate-300">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !dbError && filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Clock className="h-10 w-10 text-slate-100 mx-auto mb-3" />
            <p className="text-slate-400 font-medium text-sm">{searchQuery || typeFilter !== 'all' ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีประวัติการทำงาน'}</p>
          </div>
        ) : !dbError && (
          <div className="divide-y divide-slate-50">
            {filtered.map((log, idx) => {
              const tc = typeConfig[log.entity_type] || typeConfig.job;
              const Icon = tc.Icon;
              return (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${tc.cls}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-700 leading-snug">
                      <span className="font-bold text-slate-900">{log.user_email || 'admin'}</span>
                      {' '}
                      <span>{log.action}</span>
                      {log.entity_name && (
                        <span className="mx-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-bold">
                          {log.entity_name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {format(new Date(log.created_at), 'd MMM yy เวลา HH:mm น.', { locale: th })}
                    </div>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    log.entity_type === 'job' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    log.entity_type === 'customer' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                    'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}>
                    {tc.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {!dbError && filtered.length > 0 && (
          <div className="px-6 py-2.5 border-t border-slate-50 bg-slate-50/40 text-xs text-slate-400 font-medium">
            {filtered.length} รายการ {searchQuery || typeFilter !== 'all' ? `(กรองจาก ${logs.length})` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
