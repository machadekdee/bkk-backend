import { forwardRef } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

// Helper
const formatNum = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bahtText = (amount) => {
  // Simple Thai baht text (sufficient for invoice use)
  if (!amount || amount === 0) return 'ศูนย์บาทถ้วน';
  const ones = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const digits = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  const num = Math.round(amount * 100);
  const satang = num % 100;
  const baht = Math.floor(num / 100);
  
  const toText = (n) => {
    if (n === 0) return '';
    let s = '';
    const str = String(n);
    for (let i = 0; i < str.length; i++) {
      const d = parseInt(str[i]);
      const pos = str.length - 1 - i;
      if (d !== 0) {
        if (pos === 1 && d === 1) s += 'สิบ';
        else if (pos === 1 && d === 2) s += 'ยี่สิบ';
        else s += ones[d] + digits[pos];
      }
    }
    return s;
  };
  
  const bahtText2 = toText(baht) || 'ศูนย์';
  const satangText = satang > 0 ? toText(satang) + 'สตางค์' : 'ถ้วน';
  return bahtText2 + 'บาท' + satangText;
};

const WHTCertificate = forwardRef(({ invoiceData, jobData, items }, ref) => {
  const snap = jobData?.customer_snapshot || {};

  // Calculate WHT breakdown
  const wht3Items = items.filter(i => i.wht === '3');
  const wht1Items = items.filter(i => i.wht === '1');

  const wht3Base = wht3Items.reduce((s, i) => s + i.qty * i.price, 0);
  const wht1Base = wht1Items.reduce((s, i) => s + i.qty * i.price, 0);
  const wht3Amt = wht3Base * 0.03;
  const wht1Amt = wht1Base * 0.01;
  const totalWHT = wht3Amt + wht1Amt;

  const issueDate = invoiceData?.issue_date ? new Date(invoiceData.issue_date) : new Date();

  // WHT type rows
  const rows = [
    wht3Base > 0 && {
      type: '3 - ค่าบริการ (Service Fee)',
      rate: '3',
      income: wht3Base,
      wht: wht3Amt,
    },
    wht1Base > 0 && {
      type: '5 - ค่าขนส่ง (Freight)',
      rate: '1',
      income: wht1Base,
      wht: wht1Amt,
    },
  ].filter(Boolean);

  return (
    <div
      ref={ref}
      className="bg-white w-[210mm] min-h-[297mm] text-[10.5px] font-sans text-slate-800 p-[14mm] shadow-xl border border-slate-200 mx-auto"
      style={{ boxSizing: 'border-box', lineHeight: '1.5' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div className="w-[110px]">
          <img src="https://s.imgz.io/2026/03/14/S__49569801fc8b9b5496b54070.jpg" alt="Logo" className="w-full object-contain" />
        </div>
        <div className="text-right">
          <h1 className="text-[18px] font-black text-slate-900 leading-none">หนังสือรับรองการหักภาษี ณ ที่จ่าย</h1>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">WITHHOLDING TAX CERTIFICATE</p>
          <div className="mt-2 text-xs border border-slate-300 inline-block text-left overflow-hidden rounded">
            <table className="text-[10.5px]">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="px-2 py-1 bg-slate-50 font-bold text-slate-600 border-r border-slate-200">เลขที่ No.</td>
                  <td className="px-2 py-1 font-bold">{invoiceData?.invoice_number || '—'}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 bg-slate-50 font-bold text-slate-600 border-r border-slate-200">วันที่ Date</td>
                  <td className="px-2 py-1">{format(issueDate, 'dd/MM/yyyy')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ผู้จ่ายเงิน / ผู้ถูกหักภาษี */}
      <div className="grid grid-cols-2 gap-5 mb-4">
        {/* ผู้ถูกหักภาษี (ลูกค้า) */}
        <div className="border border-slate-300 rounded p-3">
          <div className="font-black text-[10.5px] mb-2 text-slate-700 pb-1 border-b border-slate-200">
            ผู้ถูกหักภาษี ณ ที่จ่าย (ผู้รับเงิน)
          </div>
          <p className="font-bold mb-0.5">{snap.company_name || '—'}</p>
          <p className="text-slate-600 text-[10px] whitespace-pre-wrap leading-relaxed">{snap.address || '—'}</p>
          <div className="mt-1.5 flex gap-1.5 text-[10px]">
            <span className="font-bold text-slate-600">Tax ID:</span>
            <span>{snap.tax_id || '—'}</span>
          </div>
        </div>

        {/* ผู้จ่ายเงิน (บริษัท) */}
        <div className="border border-slate-300 rounded p-3">
          <div className="font-black text-[10.5px] mb-2 text-slate-700 pb-1 border-b border-slate-200">
            ผู้จ่ายเงิน (บริษัทผู้ออกเอกสาร)
          </div>
          <p className="font-bold mb-0.5">บริษัท บางกอก ดีเวลลอปเมนท์ โลจิสติกส์ จำกัด</p>
          <p className="text-slate-600 text-[10px] leading-relaxed">อาคารซันทาวเวอร์ส ชั้น 24 ถนนวิภาวดีรังสิต<br />แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900</p>
          <div className="mt-1.5 flex gap-1.5 text-[10px]">
            <span className="font-bold text-slate-600">Tax ID:</span>
            <span>0105555555555</span>
          </div>
        </div>
      </div>

      {/* Detail Table */}
      <table className="w-full text-[10.5px] border-collapse border border-slate-300 mb-4">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 p-2 text-center font-bold w-8">ลำดับ</th>
            <th className="border border-slate-300 p-2 text-left font-bold">ประเภทเงินได้</th>
            <th className="border border-slate-300 p-2 text-center font-bold w-12">อัตรา<br />(%)</th>
            <th className="border border-slate-300 p-2 text-right font-bold w-28">เงินได้<br />Income (฿)</th>
            <th className="border border-slate-300 p-2 text-right font-bold w-28">ภาษีที่หัก<br />Tax Withheld (฿)</th>
            <th className="border border-slate-300 p-2 text-center font-bold w-20">วันที่จ่าย</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows.map((r, i) => (
            <tr key={i} className={i % 2 ? 'bg-slate-50' : ''}>
              <td className="border border-slate-300 p-2 text-center">{i + 1}</td>
              <td className="border border-slate-300 p-2">{r.type}</td>
              <td className="border border-slate-300 p-2 text-center font-bold">{r.rate}%</td>
              <td className="border border-slate-300 p-2 text-right tabular-nums">{formatNum(r.income)}</td>
              <td className="border border-slate-300 p-2 text-right font-bold tabular-nums">{formatNum(r.wht)}</td>
              <td className="border border-slate-300 p-2 text-center">{format(issueDate, 'dd/MM/yy')}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan="6" className="border border-slate-300 p-3 text-center text-slate-400">ไม่มีรายการหักภาษี</td>
            </tr>
          )}
          {/* Empty rows */}
          {Array(Math.max(0, 4 - rows.length)).fill(0).map((_, i) => (
            <tr key={`e-${i}`}>
              {[1,2,3,4,5,6].map(c => <td key={c} className="border border-slate-300 p-2">&nbsp;</td>)}
            </tr>
          ))}
          <tr className="bg-slate-100 font-bold">
            <td colSpan="3" className="border border-slate-300 p-2 text-right">รวม Total</td>
            <td className="border border-slate-300 p-2 text-right tabular-nums">{formatNum(wht3Base + wht1Base)}</td>
            <td className="border border-slate-300 p-2 text-right tabular-nums">{formatNum(totalWHT)}</td>
            <td className="border border-slate-300 p-2"></td>
          </tr>
        </tbody>
      </table>

      {/* Total in words */}
      <div className="p-3 bg-slate-50 border border-slate-300 rounded mb-5 text-[10.5px]">
        <span className="font-bold">ยอดภาษีทั้งหมด (ตัวอักษร): </span>
        <span className="text-slate-700">{bahtText(totalWHT)}</span>&nbsp;&nbsp;
        <span className="font-bold">ยอดภาษีทั้งหมด: </span>
        <span className="font-black">{formatNum(totalWHT)} บาท</span>
      </div>

      {/* Instruction */}
      <div className="p-3 border border-blue-100 rounded bg-blue-50 text-[10px] text-blue-800 font-medium mb-6">
        ภาษีที่หักและนำส่งนี้เป็น <strong>ประเภท (☑) หัก ณ ที่จ่าย</strong>&nbsp;·&nbsp;
        กรุณานำส่งภาษีภายในวันที่ 7 ของเดือนถัดไป&nbsp;·&nbsp;
        เอกสารนี้ออกให้ <strong>{snap.company_name || 'ลูกค้า'}</strong> เพื่อใช้ประกอบการยื่นแบบภาษีเงินได้นิติบุคคล
      </div>

      {/* Signature */}
      <div className="grid grid-cols-2 gap-10 mt-4">
        <div className="text-center">
          <div className="border-b border-slate-400 h-14 mb-2 mx-4" />
          <p className="font-bold text-[10.5px]">ผู้มีหน้าที่หักภาษี ณ ที่จ่าย</p>
          <p className="text-[10px] text-slate-500 mt-0.5">บริษัท บางกอก ดีเวลลอปเมนท์ โลจิสติกส์ จำกัด</p>
          <p className="text-[10px] text-slate-400 mt-1">วันที่: ......./......./.......</p>
        </div>
        <div className="text-center">
          <div className="border-b border-slate-400 h-14 mb-2 mx-4" />
          <p className="font-bold text-[10.5px]">ผู้รับรองการหักภาษี</p>
          <p className="text-[10px] text-slate-500 mt-0.5">ในนาม: {snap.company_name || 'ลูกค้า'}</p>
          <p className="text-[10px] text-slate-400 mt-1">วันที่: ......./......./.......</p>
        </div>
      </div>
    </div>
  );
});

WHTCertificate.displayName = 'WHTCertificate';
export default WHTCertificate;
