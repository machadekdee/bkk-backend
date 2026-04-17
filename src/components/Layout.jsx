import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Home, Briefcase, Users, LogOut, Clock, X, Save } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Layout() {
  const { user, logout, updateProfile } = useAuth();
  const location = useLocation();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ display_name: '', avatar_url: '' });

  const navigation = [
    { name: 'ภาพรวม', href: '/', icon: Home },
    { name: 'จัดการงาน', href: '/jobs', icon: Briefcase },
    { name: 'ลูกค้า', href: '/customers', icon: Users },
    { name: 'ประวัติการทำงาน', href: '/logs', icon: Clock },
  ];

  const displayName = user?.display_name || user?.username || 'Admin';
  const initials = displayName.slice(0, 2).toUpperCase();
  const pageTitle = navigation.find(n => n.href === location.pathname)?.name || 'BKK Dev Logistics';

  function openProfile() {
    setProfileForm({ display_name: user?.display_name || '', avatar_url: user?.avatar_url || '' });
    setShowProfileModal(true);
  }
  function saveProfileHandler() {
    updateProfile({ display_name: profileForm.display_name, avatar_url: profileForm.avatar_url });
    setShowProfileModal(false);
  }

  return (
    <div className="min-h-screen flex bg-[#f5f6fa] font-sans text-gray-800">

      {/* ── Sidebar ── */}
      <aside className="w-64 flex flex-col bg-white shrink-0 border-r border-gray-200 shadow-sm print:hidden">

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="h-10 w-10 rounded-xl overflow-hidden ring-1 ring-gray-200 shrink-0">
            <img src="https://s.imgz.io/2026/03/14/S__49569801fc8b9b5496b54070.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-sm font-black text-gray-900 tracking-wide leading-none">BKK DEV</div>
            <div className="text-[11px] text-blue-600 font-bold mt-0.5">Logistics System</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-5 space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-3 mb-3">เมนูหลัก</div>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-blue-600" : "text-gray-400")} />
                <span>{item.name}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </Link>
            );
          })}
        </nav>

        {/* User block */}
        <div className="px-4 py-4 border-t border-gray-100 space-y-1">
          <button onClick={openProfile} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 transition-colors group">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="avatar" className="h-9 w-9 rounded-xl object-cover ring-1 ring-gray-200 shrink-0" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-sm text-white shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-bold text-gray-800 truncate">{displayName}</div>
              <div className="text-xs text-gray-400 font-medium">คลิกเพื่อตั้งค่าโปรไฟล์</div>
            </div>
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors text-sm font-semibold">
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden print:overflow-visible print:h-auto">

        {/* Header */}
        <header className="h-[60px] flex items-center shrink-0 px-8 bg-white border-b border-gray-200 print:hidden">
          <h2 className="text-base font-bold text-gray-800">{pageTitle}</h2>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-gray-400 font-medium hidden sm:block">
              {new Date().toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}
              {' · '}
              {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button onClick={openProfile} className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" className="h-7 w-7 rounded-lg object-cover ring-1 ring-gray-200" />
              ) : (
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-[11px] text-white">
                  {initials}
                </div>
              )}
              <span className="text-sm font-semibold text-gray-700 hidden sm:block">{displayName}</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8 custom-scrollbar print:p-0 print:overflow-visible">
          <div className="max-w-6xl mx-auto print:max-w-none print:mx-0">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-gray-900">ตั้งค่าโปรไฟล์</h3>
              <button onClick={() => setShowProfileModal(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center gap-3">
                {profileForm.avatar_url ? (
                  <img src={profileForm.avatar_url} alt="preview" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-gray-200" onError={e => e.target.style.display='none'} />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-2xl text-white">
                    {(profileForm.display_name || displayName).slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">ชื่อที่แสดง</label>
                <input type="text" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all" placeholder="ชื่อ-นามสกุล" value={profileForm.display_name} onChange={e => setProfileForm(p => ({ ...p, display_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">URL รูปโปรไฟล์</label>
                <input type="url" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all" placeholder="https://..." value={profileForm.avatar_url} onChange={e => setProfileForm(p => ({ ...p, avatar_url: e.target.value }))} />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowProfileModal(false)} className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">ยกเลิก</button>
              <button onClick={saveProfileHandler} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors shadow-sm">
                <Save className="h-4 w-4" /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
