import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Search, Building2, Phone, Edit2, Trash2 } from 'lucide-react';
import { logActivity } from '../lib/logger';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    company_name: '', address: '', tax_id: '',
    contacts: [{ name: '', phone: '', position: '' }]
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (!error && data) setCustomers(data);
    setLoading(false);
  }

  function openNewModal() {
    setEditingId(null);
    setFormData({ company_name: '', address: '', tax_id: '', contacts: [{ name: '', phone: '', position: '' }] });
    setIsModalOpen(true);
  }

  function openEditModal(customer) {
    setEditingId(customer.id);
    const parsedContacts = (customer.contacts && customer.contacts.length > 0) 
       ? customer.contacts 
       : [{ name: customer.contact_person || '', phone: customer.phone || '', position: '' }];
       
    setFormData({
      company_name: customer.company_name,
      address: customer.address || '',
      tax_id: customer.tax_id || '',
      contacts: parsedContacts
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsModalOpen(false);
    
    // Clean up empty contacts
    const cleanedContacts = formData.contacts.filter(c => c.name.trim() !== '' || c.phone.trim() !== '');
    
    if (editingId) {
       const { error } = await supabase.from('customers').update({
         company_name: formData.company_name,
         address: formData.address,
         tax_id: formData.tax_id,
         contacts: cleanedContacts
       }).eq('id', editingId);
       
       if (!error) {
         logActivity('อัปเดตข้อมูล', 'customer', formData.company_name);
         fetchCustomers();
       } else {
         alert("Error updating: " + error.message);
       }
    } else {
       const { error } = await supabase.from('customers').insert([{
         company_name: formData.company_name,
         address: formData.address,
         tax_id: formData.tax_id,
         contacts: cleanedContacts
       }]);
       
       if (!error) {
         logActivity('เพิ่มใหม่', 'customer', formData.company_name);
         fetchCustomers();
       } else {
         alert("Error adding customer: " + error.message);
       }
    }
  }

  async function handleDelete(id, name) {
    if (confirm(`คุณต้องการลบข้อมูลลูกค้า "${name}" ใช่หรือไม่? (การกระทำนี้ไม่สามารถย้อนกลับได้)`)) {
       const { error } = await supabase.from('customers').delete().eq('id', id);
       if (!error) {
         logActivity('ลบข้อมูลบริษัท', 'customer', name);
         fetchCustomers();
       } else {
         alert("ลบไม่สำเร็จ (อาจมีงานที่ผูกกับลูกค้าเจ้านี้อยู่): " + error.message);
       }
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">ฐานข้อมูลลูกค้า (Customers)</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">จัดการรายชื่อบริษัทและผู้ติดต่อเพื่อใช้ออกใบแจ้งหนี้</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
               <svg className="w-4 h-4 text-slate-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/></svg>
            </div>
            <input type="text" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="ค้นหาบริษัท..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <button
            onClick={openNewModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 shadow-sm transition-all hover:-translate-y-0.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">เพิ่มลูกค้า</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
             <div className="col-span-full py-12 flex justify-center text-slate-400">
               <Loader2 className="h-8 w-8 animate-spin" />
             </div>
        ) : customers.filter(c => c.company_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
             <div className="col-span-full py-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200 border-dashed">
               ไม่พบรายชื่อลูกค้า
             </div>
        ) : (
          customers.filter(c => c.company_name.toLowerCase().includes(searchQuery.toLowerCase())).map((c) => {
            const contacts = Array.isArray(c.contacts) ? c.contacts : [];
            const legacyPhone = c.phone ? `Legacy Phone: ${c.phone}` : null;
            return (
            <div key={c.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 relative">
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => openEditModal(c)} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors" title="แก้ไข">
                    <Edit2 className="h-4 w-4" />
                 </button>
                 <button onClick={() => handleDelete(c.id, c.company_name)} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors" title="ลบข้อมูล">
                    <Trash2 className="h-4 w-4" />
                 </button>
              </div>
              <div className="flex items-center gap-3 mb-3">
                 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                    <Building2 className="h-5 w-5" />
                 </div>
                 <h3 className="font-bold text-slate-800 text-lg leading-tight truncate pr-8">{c.company_name}</h3>
              </div>
              <div className="text-sm text-slate-500 mb-4 line-clamp-2 h-10">
                {c.address || 'ไม่มีที่อยู่'}
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-4">
                 <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">ผู้ติดต่อ</div>
                 {contacts.length > 0 ? contacts.map((contact, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded-lg">
                       <Phone className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                       <div>
                         <span className="font-medium mr-2">{contact.name || 'ไม่ระบุชื่อ'}</span> 
                         <span className="text-slate-500 text-xs">{(contact.position) && `(${contact.position})`}</span>
                         <div className="text-blue-600 font-medium">{contact.phone}</div>
                       </div>
                    </div>
                 )) : (
                    <div className="text-sm text-slate-500 italic block">{legacyPhone || 'ไม่มีข้อมูลผู้ติดต่อ'}</div>
                 )}
              </div>
            </div>
            )
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</h3>
            </div>
            <form id="customerForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">ชื่อบริษัท (Company Name) <span className="text-red-500">*</span></label>
                <input required type="text" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50 focus:bg-white" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                 <div className="sm:col-span-2">
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">ที่อยู่ (Address)</label>
                   <textarea rows="2" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50 focus:bg-white resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                 </div>
                 <div className="sm:col-span-2">
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                   <input type="text" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50 focus:bg-white" value={formData.tax_id} onChange={e => setFormData({...formData, tax_id: e.target.value})} />
                 </div>
              </div>
              
              <div className="pt-4 border-t border-slate-200">
                 <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-bold text-slate-700">ผู้ติดต่อ (Contacts)</label>
                    <button type="button" onClick={() => setFormData({...formData, contacts: [...formData.contacts, {name: '', phone: '', position: ''}]})} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md transition-colors">
                       <Plus className="h-3 w-3" /> เพิ่มผู้ติดต่อ
                    </button>
                 </div>
                 <div className="space-y-3">
                    {formData.contacts.map((contact, idx) => (
                       <div key={idx} className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 relative group">
                          {formData.contacts.length > 1 && (
                            <button type="button" onClick={() => setFormData({...formData, contacts: formData.contacts.filter((_, i) => i !== idx)})} className="absolute -top-2 -right-2 bg-red-100 text-red-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                             <input type="text" placeholder="ชื่อ นามสกุล" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={contact.name} onChange={e => { const newC = [...formData.contacts]; newC[idx].name = e.target.value; setFormData({...formData, contacts: newC}); }} />
                             <input type="text" placeholder="เบอร์โทรศัพท์" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={contact.phone} onChange={e => { const newC = [...formData.contacts]; newC[idx].phone = e.target.value; setFormData({...formData, contacts: newC}); }} />
                             <input type="text" placeholder="ตำแหน่ง (ถ้ามี)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={contact.position} onChange={e => { const newC = [...formData.contacts]; newC[idx].position = e.target.value; setFormData({...formData, contacts: newC}); }} />
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">ยกเลิก</button>
              <button type="submit" form="customerForm" className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm transition-colors">
                 {editingId ? 'บันทึกการแก้ไข' : 'บันทึกลูกค้าใหม่'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
