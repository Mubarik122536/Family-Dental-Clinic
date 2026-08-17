import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

export default function DebtPaymentReceipt({ payment, debt, onClose }) {
    const printRef = useRef(null);
    const [sharing, setSharing] = useState(false);

    const receiptNum = `FDC-DP${payment?.id || '000'}`;
    const shortNum = `DP${payment?.id}`;
    const paymentAmount = parseFloat(payment?.amount || 0);
    const totalDebt = parseFloat(debt?.amount || 0);
    const totalPaid = parseFloat(debt?.paid_amount || 0);
    const remainingAfter = Math.max(0, totalDebt - totalPaid);
    const paidBefore = totalPaid - paymentAmount;
    const remainingBefore = Math.max(0, totalDebt - paidBefore);
    const paymentDate = payment?.created_at
        ? new Date(payment.created_at).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
        : new Date().toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

    const printCSS = `
        @page { size: A5 portrait; margin: 0; }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
            width: 100%; height: 100%; margin: 0; padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px; color: #000; background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .receipt-page {
            width: 100%; min-height: 100vh;
            display: flex; flex-direction: column;
            padding: 12mm 14mm;
        }
        .receipt-header { margin-bottom: 16px; }
        .receipt-body { flex: 1; }
        .receipt-footer { margin-top: auto; padding-top: 20px; }
        table { width: 100%; border-collapse: collapse; }
        img { max-width: 100%; height: auto; }
    `;

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;
        const win = window.open('', '_blank', 'width=700,height=900');
        if (!win) return;
        win.document.write(`<!DOCTYPE html>
<html><head><title>Payment Receipt #${shortNum}</title>
<style>${printCSS}</style>
</head><body>${content.innerHTML}</body></html>`);
        win.document.close();
        win.onload = () => { win.focus(); win.print(); };
    };

    const handleWhatsApp = async () => {
        const content = printRef.current;
        if (!content) return;
        setSharing(true);
        try {
            const canvas = await html2canvas(content, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], `${receiptNum}.png`, { type: 'image/png' });
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: `Payment Receipt ${receiptNum}`, text: `Payment receipt for ${debt?.name}` });
            } else {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url; link.download = `${receiptNum}.png`; link.click();
                URL.revokeObjectURL(url);
                const phone = (debt?.phone || '').replace(/[^0-9]/g, '');
                const msg = encodeURIComponent(`Payment Receipt ${receiptNum} — Amount: $${paymentAmount.toFixed(2)} | Remaining: $${remainingAfter.toFixed(2)}`);
                if (phone) window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
            }
        } catch (err) { console.error(err); }
        finally { setSharing(false); }
    };

    const S = {
        page: { width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '12mm 14mm', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '12px', color: '#000', lineHeight: 1.5 },
        headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
        headerSide: { width: '30%', fontSize: '11px', paddingTop: '40px' },
        headerCenter: { textAlign: 'center', flex: 1 },
        logo: { width: '55px', height: 'auto', display: 'block', margin: '0 auto 8px' },
        clinicName: { fontSize: '17px', fontWeight: 'bold', margin: '0 0 12px', letterSpacing: '0.5px' },
        contactLine: { fontSize: '11px', margin: '2px 0' },
        receiptTitle: { fontSize: '14px', fontWeight: 'bold', margin: '0 0 3px' },
        divider: { borderTop: '2px solid #000', margin: '0' },
        dividerThin: { borderTop: '1.5px solid #000', margin: '0' },
        th: { fontSize: '11px', fontWeight: 'bold', padding: '6px 4px', borderBottom: '2px solid #000' },
        td: { fontSize: '12px', padding: '8px 4px', verticalAlign: 'top' },
        totalBox: { display: 'flex', justifyContent: 'flex-end', fontWeight: 'bold', fontSize: '13px', borderTop: '1.5px solid #999', paddingTop: '6px', marginTop: '6px' },
        footerWrap: { textAlign: 'center', paddingTop: '20px', marginTop: 'auto' },
        barcode: { height: '35px', width: '150px', margin: '10px auto 0', background: 'repeating-linear-gradient(90deg, #000 0px, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 5px, transparent 5px, transparent 8px, #000 8px, #000 11px, transparent 11px, transparent 13px)' },
    };

    return (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500 text-[18px]">receipt_long</span>
                        Payment Receipt — {debt?.name}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button onClick={handleWhatsApp} disabled={sharing}
                            className="px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-[#1da851] transition-colors disabled:opacity-50">
                            {sharing
                                ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                            }
                            {sharing ? 'Sending...' : 'WhatsApp'}
                        </button>
                        <button onClick={handlePrint} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-primary-700 transition-colors">
                            <span className="material-symbols-outlined text-[16px]">print</span>Print
                        </button>
                        <button onClick={onClose} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500 transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-2 md:p-6 bg-slate-100 dark:bg-slate-950">
                    <div className="flex justify-center min-w-[148mm]">
                        <div ref={printRef} style={{ width: '148mm', height: '210mm', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                            <div className="receipt-page" style={S.page}>
                                <div className="receipt-header">
                                    <div style={S.headerRow}>
                                        <div style={S.headerSide}>
                                            <p><strong>Cashier:</strong> Sysadmin</p>
                                            <p style={{ marginTop: '3px' }}>Date: {paymentDate}</p>
                                        </div>
                                        <div style={S.headerCenter}>
                                            <img src={`${window.location.origin}/logo.png`} style={S.logo} alt="Logo" />
                                            <h1 style={S.clinicName}>FAMILY DENTAL CLINIC</h1>
                                            <p style={S.contactLine}>Mobile: +252(63)4066466</p>
                                            <p style={S.contactLine}>Zaad: 401036 E-dahab: 62091</p>
                                            <p style={S.contactLine}>familydentalmc@gmail.com</p>
                                            <p style={S.contactLine}>Hargeisa, Somaliland</p>
                                        </div>
                                        <div style={{ ...S.headerSide, textAlign: 'right' }}>
                                            <p style={S.receiptTitle}>Payment Receipt</p>
                                            <p style={{ fontWeight: 'bold', marginTop: '3px' }}>{receiptNum}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="receipt-body" style={{ flex: 1 }}>
                                    {/* Patient Info */}
                                    <div style={{ marginBottom: '10px', fontSize: '12px' }}>
                                        <p><strong>Patient:</strong> {debt?.name || '—'} &nbsp;&nbsp;&nbsp; <strong>Phone:</strong> {debt?.phone || '—'}</p>
                                        <p style={{ marginTop: '3px' }}><strong>Service:</strong> {debt?.service_name || '—'}</p>
                                    </div>
                                    <div style={S.divider}></div>

                                    {/* Payment Details Table */}
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...S.th, textAlign: 'left' }}>Description</th>
                                                <th style={{ ...S.th, textAlign: 'center', width: '100px' }}>Method</th>
                                                <th style={{ ...S.th, textAlign: 'right', width: '100px' }}>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style={{ ...S.td, textAlign: 'left' }}>Debt Payment</td>
                                                <td style={{ ...S.td, textAlign: 'center' }}>{payment?.method || 'Cash'}</td>
                                                <td style={{ ...S.td, textAlign: 'right' }}>${paymentAmount.toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div style={S.dividerThin}></div>

                                    {/* Summary */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '12px' }}>
                                        <div style={{ width: '45%', paddingTop: '8px' }}>
                                            <p>{payment?.method || 'Cash'}: (${paymentAmount.toFixed(2)})</p>
                                            {payment?.notes && <p style={{ marginTop: '4px', fontStyle: 'italic', fontSize: '11px' }}>Note: {payment.notes}</p>}
                                        </div>
                                        <div style={{ width: '55%', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3px', fontSize: '11px' }}>
                                                <span style={{ width: '170px', textAlign: 'right', paddingRight: '12px' }}>Total Debt:</span>
                                                <span style={{ width: '90px', textAlign: 'right' }}>${totalDebt.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3px', fontSize: '11px' }}>
                                                <span style={{ width: '170px', textAlign: 'right', paddingRight: '12px' }}>Previous Balance:</span>
                                                <span style={{ width: '90px', textAlign: 'right' }}>${remainingBefore.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3px', fontSize: '11px', color: '#059669' }}>
                                                <span style={{ width: '170px', textAlign: 'right', paddingRight: '12px' }}>This Payment:</span>
                                                <span style={{ width: '90px', textAlign: 'right' }}>−${paymentAmount.toFixed(2)}</span>
                                            </div>
                                            <div style={S.totalBox}>
                                                <span style={{ width: '150px', textAlign: 'right', textTransform: 'uppercase' }}>Remaining:</span>
                                                <span style={{ width: '90px', textAlign: 'right' }}>${remainingAfter.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="receipt-footer" style={S.footerWrap}>
                                    <p style={{ fontSize: '13px', marginBottom: '12px' }}>A reason to smile!</p>
                                    <div style={{ display: 'inline-block', fontFamily: 'monospace', letterSpacing: '2px' }}>
                                        <div style={S.barcode}></div>
                                        <p style={{ marginTop: '4px', fontSize: '12px' }}>{shortNum}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
