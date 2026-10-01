import React, { useRef, useState } from 'react';
import { Sale } from '../types';
import { useStore } from '../context/StoreContext';
import { X, Printer, Share2, Copy, Check, SlidersHorizontal } from 'lucide-react';
import { formatUSD, formatLocal, formatDateTime } from '../utils/formatters';
import { SuccessCelebrationIllustration } from './illustrations/VectorIllustrations';
import { printThermalReceipt, ThermalPaperWidth } from '../utils/thermalPrinter';

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, isOpen, onClose }) => {
  const { state } = useStore();
  const [copied, setCopied] = useState(false);
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>('80mm');
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    printThermalReceipt(sale, state.settings, paperWidth);
  };

  const generateReceiptText = () => {
    const itemsList = sale.items
      .map(i => `• ${i.quantity}x ${i.productName} - $${i.subtotalUSD.toFixed(2)}`)
      .join('\n');

    const paymentList = sale.paymentMethods
      .map(p => `  - ${p.gatewayName}: $${p.amountUSD.toFixed(2)} (${formatLocal(p.amountLocal, sale.currencySymbol, sale.currencyCode)})${p.reference ? ` Ref: ${p.reference}` : ''}`)
      .join('\n');

    return `🧾 *${state.settings.storeName.toUpperCase()}*
RIF/NIT: ${state.settings.taxId}
Teléf: ${state.settings.phone}
----------------------------------------
*COMPROBANTE DE VENTA:* ${sale.invoiceNumber}
Fecha: ${formatDateTime(sale.date)}
Cliente: ${sale.customerName}
----------------------------------------
*PRODUCTOS:*
${itemsList}
----------------------------------------
Subtotal: $${sale.subtotalUSD.toFixed(2)}
IVA/Impuestos: $${sale.taxUSD.toFixed(2)}
*TOTAL A PAGAR:* $${sale.totalUSD.toFixed(2)} USD
*TOTAL EN ${sale.currencyCode}:* ${formatLocal(sale.totalLocal, sale.currencySymbol, sale.currencyCode)}
(Tasa de cambio: 1 USD = ${sale.exchangeRateUsed.toFixed(2)} ${sale.currencySymbol})

*FORMAS DE PAGO:*
${paymentList}
${sale.changeGivenUSD > 0 ? `*Cambio/Vuelto:* $${sale.changeGivenUSD.toFixed(2)} USD (${formatLocal(sale.changeGivenLocal, sale.currencySymbol, sale.currencyCode)})` : ''}

----------------------------------------
${state.settings.receiptFooter}
`;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateReceiptText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(generateReceiptText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-[6px_6px_0px_#0f172a] w-full max-w-md overflow-hidden border-2 border-slate-900 flex flex-col max-h-[94vh]">
        
        {/* Header (Hidden when printing) */}
        <div className="p-4 bg-slate-950 text-white flex justify-between items-center print:hidden border-b-2 border-slate-900">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{sale.saleType === 'abono' ? '💰' : '🎉'}</span>
            <div>
              <h3 className="font-black text-base text-white leading-tight">
                {sale.saleType === 'abono' ? '¡Abono a Fiado Registrado!' : '¡Venta Completada!'}
              </h3>
              <p className="text-[11px] text-amber-300 font-bold">Ticket: {sale.invoiceNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border-2 border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Celebratory Banner (Hidden when printing) */}
        <div className="bg-emerald-50 p-3 border-b-2 border-slate-900 flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <SuccessCelebrationIllustration className="w-12 h-12 flex-shrink-0" />
            <div>
              <div className="font-black text-slate-950 text-xs sm:text-sm">
                {sale.saleType === 'abono' ? 'Abono Procesado y Registrado' : 'Cobro Registrado con Éxito'}
              </div>
              <div className="text-[11px] text-emerald-800 font-bold">
                Total: {formatUSD(sale.totalUSD)} · {formatLocal(sale.totalLocal, sale.currencySymbol, sale.currencyCode)}
              </div>
            </div>
          </div>

          {/* Paper Width Selector */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a]">
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                paperWidth === '80mm'
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Ancho estándar para impresoras térmicas de mostrador (Epson, Xprinter 80mm)"
            >
              80 mm
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                paperWidth === '58mm'
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Ancho para impresoras térmicas portátiles o mini de 58mm"
            >
              58 mm
            </button>
          </div>
        </div>

        {/* Receipt Content Body (Thermal Ticket Preview) */}
        <div className="p-4 sm:p-5 overflow-y-auto bg-slate-100 flex justify-center">
          <div 
            id="thermal-print-area"
            ref={printRef}
            style={{ maxWidth: paperWidth === '58mm' ? '240px' : '310px' }}
            className="w-full bg-white p-4 sm:p-5 rounded-2xl shadow-[2px_2px_0px_#cbd5e1] border-2 border-slate-900 font-mono text-xs text-slate-900 space-y-2.5 leading-relaxed transition-all"
          >
            {/* Header info */}
            <div className="text-center space-y-0.5 border-b-2 border-dashed border-slate-300 pb-2.5">
              <h4 className="font-black text-sm tracking-tight text-slate-900 uppercase">
                {state.settings.storeName}
              </h4>
              {state.settings.taxId && (
                <p className="text-[10px] text-slate-600 font-sans font-bold">RIF/Doc: {state.settings.taxId}</p>
              )}
              {state.settings.address && (
                <p className="text-[9.5px] text-slate-500 font-sans leading-tight">{state.settings.address}</p>
              )}
              {state.settings.phone && (
                <p className="text-[9.5px] text-slate-500 font-sans">Tel: {state.settings.phone}</p>
              )}
            </div>

            {/* Sale metadata */}
            <div className="space-y-0.5 text-[11px] border-b-2 border-dashed border-slate-300 pb-2">
              <div className="text-center font-black text-xs uppercase tracking-wider text-slate-900 pb-1">
                {sale.saleType === 'abono' ? '*** COMPROBANTE DE ABONO A FIADO ***' : 'COMPROBANTE DE VENTA'}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">N° Operación:</span>
                <span className="font-bold text-slate-900">{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Fecha:</span>
                <span>{formatDateTime(sale.date)}</span>
              </div>
              {sale.cashierName && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Cajero:</span>
                  <span className="font-medium text-slate-800">{sale.cashierName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Cliente:</span>
                <span className="font-bold truncate max-w-[150px]">{sale.customerName}</span>
              </div>
              {sale.customerTaxId && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Doc:</span>
                  <span>{sale.customerTaxId}</span>
                </div>
              )}
            </div>

            {/* Items table */}
            <div className="space-y-1 border-b-2 border-dashed border-slate-300 pb-2.5">
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                <span>Cant • Descripción</span>
                <span>Total ($)</span>
              </div>
              {sale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <div className="max-w-[170px]">
                    <span className="font-black">{item.quantity}x</span> {item.productName}
                    <div className="text-[9.5px] text-slate-400 font-sans">
                      @ {formatUSD(item.unitPriceUSD)} c/u
                    </div>
                  </div>
                  <span className="font-bold text-right">{formatUSD(item.subtotalUSD)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-[11px] border-b-2 border-dashed border-slate-300 pb-2.5">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatUSD(sale.subtotalUSD)}</span>
              </div>
              {sale.discountUSD > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Descuento:</span>
                  <span>-{formatUSD(sale.discountUSD)}</span>
                </div>
              )}
              {sale.taxUSD > 0 && (
                <div className="flex justify-between">
                  <span>IVA ({state.settings.taxPercentage}%):</span>
                  <span>{formatUSD(sale.taxUSD)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-300">
                <span>TOTAL (USD):</span>
                <span>{formatUSD(sale.totalUSD)}</span>
              </div>
              <div className="flex justify-between text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                <span>TOTAL {sale.currencyCode}:</span>
                <span>{formatLocal(sale.totalLocal, sale.currencySymbol, sale.currencyCode)}</span>
              </div>
              <div className="text-[9.5px] text-slate-500 text-center pt-0.5">
                Tasa Oficial: 1 USD = {sale.exchangeRateUsed.toFixed(2)} {sale.currencySymbol}
              </div>
            </div>

            {/* Payments breakdown */}
            <div className="space-y-1 text-[11px] border-b-2 border-dashed border-slate-300 pb-2">
              <span className="font-black text-[10px] uppercase text-slate-500 block">Formas de Pago:</span>
              {sale.paymentMethods.map((pm, i) => (
                <div key={i} className="flex justify-between items-start text-[11px]">
                  <div>
                    <span className="font-bold">{pm.gatewayName}</span>
                    {pm.reference && <div className="text-[9.5px] text-slate-500">Ref: {pm.reference}</div>}
                    {pm.bank && <div className="text-[9.5px] text-slate-500">Banco: {pm.bank}</div>}
                  </div>
                  <div className="text-right font-bold">
                    {formatUSD(pm.amountUSD)}
                    <div className="text-[9.5px] text-slate-500 font-sans">
                      {formatLocal(pm.amountLocal, sale.currencySymbol, sale.currencyCode)}
                    </div>
                  </div>
                </div>
              ))}

              {sale.changeGivenUSD > 0 && (
                <div className="flex justify-between pt-1 border-t border-slate-200 text-emerald-700 font-black">
                  <span>Cambio / Vuelto:</span>
                  <span>
                    {formatUSD(sale.changeGivenUSD)} ({formatLocal(sale.changeGivenLocal, sale.currencySymbol, sale.currencyCode)})
                  </span>
                </div>
              )}
            </div>

            {/* Footer message */}
            <div className="text-center pt-1 text-[10px] text-slate-600 font-sans">
              <p className="font-medium">{state.settings.receiptFooter || '¡Gracias por su compra!'}</p>
              <div className="mt-2 pt-1 border-t border-dashed border-slate-300 text-[8.5px] text-slate-400 font-mono">
                <p>OmniPOS Retail System</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons (Print Hidden) */}
        <div className="p-3 sm:p-4 bg-white border-t-2 border-slate-900 grid grid-cols-3 gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-3 px-3 bg-slate-950 hover:bg-slate-800 active:translate-y-0.5 text-white rounded-xl text-xs sm:text-sm font-black shadow-[3px_3px_0px_#0f172a] transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>Imprimir Térmico</span>
          </button>

          <button
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-1.5 py-3 px-3 bg-emerald-400 hover:bg-emerald-300 active:translate-y-0.5 text-slate-950 border-2 border-slate-900 rounded-xl text-xs sm:text-sm font-black shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handleCopyText}
            className="flex items-center justify-center gap-1.5 py-3 px-3 bg-slate-100 hover:bg-slate-200 active:translate-y-0.5 border-2 border-slate-900 text-slate-900 rounded-xl text-xs sm:text-sm font-black shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-700 stroke-[3]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
