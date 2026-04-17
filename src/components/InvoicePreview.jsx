import { forwardRef } from 'react';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const InvoicePreview = forwardRef(({ invoiceData, jobData, items, showSignature }, ref) => {
  const subtotal = items.reduce((acc, item) => acc + (item.qty * item.price), 0);
  const vatAmount = items.reduce((acc, item) => {
    const amt = item.qty * item.price;
    return acc + (item.tax === '7' ? amt * 0.07 : 0);
  }, 0);
  
  const wht3Base = items.filter(i => i.wht === '3').reduce((acc, i) => acc + (i.qty * i.price), 0);
  const wht1Base = items.filter(i => i.wht === '1').reduce((acc, i) => acc + (i.qty * i.price), 0);
  
  const wht3Amt = wht3Base * 0.03;
  const wht1Amt = wht1Base * 0.01;
  const totalWht = wht3Amt + wht1Amt;
  
  const grandTotal = subtotal + vatAmount;
  const netPayable = grandTotal - totalWht;

  const snap = jobData?.customer_snapshot || jobData?.customer || {};

  return (
    <div ref={ref} className="bg-white p-[12mm] w-[210mm] min-h-[297mm] text-[11px] leading-tight text-slate-800 font-sans shadow-xl border border-slate-200 mx-auto" style={{ boxSizing: 'border-box' }}>
      
      {/* Header Info */}
      <div className="flex justify-between items-start mb-6">
        <div className="w-[120px] h-[70px] overflow-hidden">
          <img src="https://s.imgz.io/2026/03/14/S__49569801fc8b9b5496b54070.jpg" alt="Logo" className="w-[120px] h-full object-contain object-left block" />
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-slate-900 mb-1 leading-none tracking-tight" contentEditable suppressContentEditableWarning>ใบเรียกเก็บเงิน</h1>
          <h2 className="text-[13px] font-bold text-slate-500 mb-4 uppercase tracking-wider" contentEditable suppressContentEditableWarning>INVOICE</h2>
          <table className="ml-auto text-left text-[11px] border-collapse" style={{ width: '220px' }}>
            <tbody>
              <tr>
                <td className="p-1.5 px-3 border border-slate-300 font-bold bg-slate-50 text-slate-600" contentEditable suppressContentEditableWarning>เลขที่ No.</td>
                <td className="p-1.5 px-3 border border-slate-300 font-bold text-slate-900" contentEditable suppressContentEditableWarning>{invoiceData.invoice_number}</td>
              </tr>
              <tr>
                <td className="p-1.5 px-3 border border-slate-300 font-bold bg-slate-50 text-slate-600" contentEditable suppressContentEditableWarning>วันที่ Date</td>
                <td className="p-1.5 px-3 border border-slate-300" contentEditable suppressContentEditableWarning>{invoiceData.issue_date ? format(new Date(invoiceData.issue_date), 'dd/MM/yyyy') : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-6">
        {/* Customer Block */}
        <div>
          <h3 className="font-bold text-[11px] border-b border-slate-400 pb-1 mb-2 text-slate-700" contentEditable suppressContentEditableWarning>ลูกค้า (Customer)</h3>
          <p className="font-bold text-[12px] mb-1" contentEditable suppressContentEditableWarning>{snap.company_name || '-'}</p>
          <p className="whitespace-pre-wrap leading-relaxed" contentEditable suppressContentEditableWarning>{snap.address || '-'}</p>
          <div className="mt-1 flex gap-2">
            <span className="font-bold">โทร:</span>
            <span contentEditable suppressContentEditableWarning>{snap.phone || '-'}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold">เลขประจำตัวผู้เสียภาษี:</span>
            <span contentEditable suppressContentEditableWarning>{snap.tax_id || '-'}</span>
          </div>
        </div>
        
        {/* Issuer Block */}
        <div>
          <h3 className="font-bold text-[11px] border-b border-slate-400 pb-1 mb-2 text-slate-700" contentEditable suppressContentEditableWarning>ผู้ออกเอกสาร (Issuer)</h3>
          <p className="font-bold text-[12px] mb-1" contentEditable suppressContentEditableWarning>บริษัท บางกอก ดีเวลลอปเมนท์ โลจิสติกส์ จำกัด</p>
          <p className="whitespace-pre-wrap leading-relaxed" contentEditable suppressContentEditableWarning>อาคารซันทาวเวอร์ส ชั้น 24 ถนนวิภาวดีรังสิต แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900</p>
          <div className="mt-1 flex gap-2">
            <span className="font-bold">โทร:</span>
            <span contentEditable suppressContentEditableWarning>02-123-4567</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold">เลขประจำตัวผู้เสียภาษี:</span>
            <span contentEditable suppressContentEditableWarning>0105555555555</span>
          </div>
        </div>
      </div>

      {/* Project Meta */}
      <table className="w-full text-[11px] border-collapse mb-4 border border-slate-300 bg-slate-50">
         <tbody>
            <tr>
               <td className="border-r border-slate-300 p-2 w-[40%]"><span className="font-bold text-slate-700" contentEditable suppressContentEditableWarning>ชื่องาน (Project):</span> <span contentEditable suppressContentEditableWarning>{jobData?.title || '-'}</span></td>
               <td className="border-r border-slate-300 p-2 w-[30%]"><span className="font-bold text-slate-700" contentEditable suppressContentEditableWarning>เครดิต (Terms):</span> <span contentEditable suppressContentEditableWarning>30 วัน</span></td>
               <td className="p-2 w-[30%]"><span className="font-bold text-slate-700" contentEditable suppressContentEditableWarning>วันครบกำหนด (Due Date):</span> <span contentEditable suppressContentEditableWarning>{invoiceData.due_date ? format(new Date(invoiceData.due_date), 'dd/MM/yyyy') : '-'}</span></td>
            </tr>
         </tbody>
      </table>

      {/* Items Table */}
      <table className="w-full text-[11px] border-collapse border border-slate-300 mb-4">
        <thead>
          <tr className="bg-slate-100/80 text-slate-800">
            <th className="border border-slate-300 p-2 text-center w-12 font-bold uppercase" contentEditable suppressContentEditableWarning>ลำดับ<br/>No.</th>
            <th className="border border-slate-300 p-2 text-left font-bold uppercase" contentEditable suppressContentEditableWarning>รายละเอียดบริการ<br/>Description</th>
            <th className="border border-slate-300 p-2 text-center w-16 font-bold uppercase" contentEditable suppressContentEditableWarning>จำนวน<br/>Qty</th>
            <th className="border border-slate-300 p-2 text-right w-24 font-bold uppercase" contentEditable suppressContentEditableWarning>ราคา/หน่วย<br/>Unit Price</th>
            <th className="border border-slate-300 p-2 text-right w-28 font-bold uppercase" contentEditable suppressContentEditableWarning>ยอดรวม<br/>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="group">
              <td className="border border-slate-300 p-2 text-center align-top text-slate-600">{idx + 1}</td>
              <td className="border border-slate-300 p-2 font-medium align-top" contentEditable suppressContentEditableWarning>{item.description}</td>
              <td className="border border-slate-300 p-2 text-center align-top">{item.qty}</td>
              <td className="border border-slate-300 p-2 text-right align-top">{formatCurrency(item.price)}</td>
              <td className="border border-slate-300 p-2 text-right font-bold text-slate-800 align-top">{formatCurrency(item.qty * item.price)}</td>
            </tr>
          ))}
          {/* Add empty rows to stretch the table avoiding overflowing to next page. */}
          {Array(Math.max(0, 3 - items.length)).fill(0).map((_, i) => (
             <tr key={`empty-${i}`}>
               <td className="border-x border-slate-300 p-2 text-transparent">-</td>
               <td className="border-x border-slate-300 p-2 text-transparent">-</td>
               <td className="border-x border-slate-300 p-2 text-transparent">-</td>
               <td className="border-x border-slate-300 p-2 text-transparent">-</td>
               <td className="border-x border-slate-300 p-2 text-transparent">-</td>
             </tr>
          ))}
          <tr><td colSpan="5" className="border-t border-slate-300"></td></tr>
        </tbody>
      </table>

      {/* Totals & Remarks Grid Symmetrical Layout */}
      <div className="flex gap-4">
        
        <div className="w-[60%] flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="font-bold text-[11.5px] border-b border-slate-300 pb-1 mb-2 text-slate-800 uppercase" contentEditable suppressContentEditableWarning>หมายเหตุ (Remarks):</h4>
            <ul className="list-disc ml-3 space-y-0.5 text-slate-600" contentEditable suppressContentEditableWarning>
              <li>กรุณาแยกยอดและหนังสือรับรองการหักภาษี ณ ที่จ่าย (WHT) ตามประเภทบริการ</li>
              <li>รายการที่เรียกเก็บตามใบเสร็จจริง (0%) จะไม่มีการหักภาษี ณ ที่จ่าย</li>
              <li>เอกสารฉบับนี้จะสมบูรณ์เมื่อบริษัทได้รับชำระเงินครบถ้วนและแนบสลิปโอนเงินแล้ว</li>
            </ul>
          </div>
          <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded leading-relaxed">
            <h4 className="font-bold text-blue-800 mb-1" contentEditable suppressContentEditableWarning>ข้อมูลการชำระเงิน :</h4>
            <p className="text-slate-700" contentEditable suppressContentEditableWarning>ธนาคาร: กสิกรไทย. ชื่อบัญชี: บริษัท บางกอก ดีเวลลอปเมนท์ โลจิสติกส์ จำกัด.<br/>เลขที่บัญชี: 229-8-10601-1 สาขา อาคารซันทาวเวอร์ส</p>
          </div>
        </div>

        <div className="w-[40%] rounded border border-slate-300 overflow-hidden">
          <table className="w-full text-[11px]">
            <tbody>
              <tr className="bg-slate-50"><td className="text-right p-1.5 font-medium border-b border-white" contentEditable suppressContentEditableWarning>รวมเป็นเงิน (Subtotal):</td><td className="text-right p-1.5 w-28 font-bold border-b border-white">{formatCurrency(subtotal)}</td></tr>
              <tr className="bg-slate-50"><td className="text-right p-1.5 font-medium border-b border-slate-200" contentEditable suppressContentEditableWarning>ภาษีมูลค่าเพิ่ม (VAT):</td><td className="text-right p-1.5 font-bold">{formatCurrency(vatAmount)}</td></tr>
              <tr className="bg-white"><td className="text-right p-2 font-bold text-[12px] border-b border-slate-300" contentEditable suppressContentEditableWarning>ยอดรวมทั้งสิ้น (Grand Total):</td><td className="text-right p-2 font-bold text-emerald-700 text-[12px] border-b border-slate-300">{formatCurrency(grandTotal)}</td></tr>
              
              {wht3Amt > 0 && <tr><td className="text-right p-1 text-slate-500" contentEditable suppressContentEditableWarning>หัก ณ ที่จ่าย ค่าบริการ 3%:</td><td className="text-right p-1 font-bold text-red-500">- {formatCurrency(wht3Amt)}</td></tr>}
              {wht1Amt > 0 && <tr><td className="text-right p-1 text-slate-500 border-b border-slate-100" contentEditable suppressContentEditableWarning>หัก ณ ที่จ่าย ค่าขนส่ง 1%:</td><td className="text-right p-1 font-bold text-red-500 border-b border-slate-100">- {formatCurrency(wht1Amt)}</td></tr>}
              
              <tr className="bg-slate-900 text-white"><td className="text-right p-2 font-bold text-[13px] tracking-wide" contentEditable suppressContentEditableWarning>ยอดชำระสุทธิ (Net Payable):</td><td className="text-right p-2 font-bold text-yellow-400 text-[13px]">{formatCurrency(netPayable)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {showSignature && (
         <div className="grid grid-cols-2 gap-8 mt-6 text-center pb-2">
            <div>
               <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-16"></div>
               <p className="font-bold text-[11px] text-slate-800" contentEditable suppressContentEditableWarning>ผู้ออกเอกสาร (Prepared By)</p>
               <p className="text-[10px] mt-0.5 text-slate-500" contentEditable suppressContentEditableWarning>Bangkok Development Logistics Co., Ltd.<br/>บริษัท บางกอก ดีเวลลอปเมนท์ โลจิสติกส์ จำกัด</p>
               <p className="text-[10px] mt-1.5 text-slate-500" contentEditable suppressContentEditableWarning>วันที่: ......./......./.......</p>
            </div>
            <div>
               <div className="border-b border-slate-400 w-48 mx-auto mb-2 h-16"></div>
               <p className="font-bold text-[11px] text-slate-800" contentEditable suppressContentEditableWarning>ผู้รับเอกสาร / วางบิล (Received By)</p>
               <p className="text-[10px] mt-0.5 text-slate-500" contentEditable suppressContentEditableWarning>ในนามลูกค้า / ประทับตราบริษัท</p>
               <p className="text-[10px] mt-1.5 text-slate-500" contentEditable suppressContentEditableWarning>วันที่: ......./......./.......</p>
            </div>
         </div>
      )}

    </div>
  );
});

InvoicePreview.displayName = 'InvoicePreview';
export default InvoicePreview;
