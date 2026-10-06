import React, { useRef, useState, useMemo } from 'react';
import { Sale } from '../types';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  Download, 
  Image as ImageIcon, 
  MessageSquare, 
  Loader2, 
  Phone,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { formatUSD, formatLocal, formatDateTime } from '../utils/formatters';
import { SuccessCelebrationIllustration } from './illustrations/VectorIllustrations';
import { printThermalReceipt, ThermalPaperWidth } from '../utils/thermalPrinter';
import { 
  captureTicketImage, 
  copyImageToClipboard, 
  downloadImage, 
  formatPhoneForWhatsApp 
} from '../utils/ticketImage';

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, isOpen, onClose }) => {
  const { state } = useStore();
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>('80mm');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [showDesktopNotice, setShowDesktopNotice] = useState(false);
  const [activeShareMode, setActiveShareMode] = useState<'image' | 'text'>('image');
  
  const printRef = useRef<HTMLDivElement>(null);

  // Find customer to get their phone number if registered
  const customer = useMemo(() => {
    if (!sale) return null;
    return state.customers.find(c => c.id === sale.customerId || c.name === sale.customerName) || null;
  }, [sale, state.customers]);

  // Editable recipient phone initialized with customer's phone
  const [customPhone, setCustomPhone] = useState<string>(() => customer?.phone || '');

  // Keep phone in sync when sale changes
  React.useEffect(() => {
    if (customer?.phone) {
      setCustomPhone(customer.phone);
    } else {
      setCustomPhone('');
    }
    setShowDesktopNotice(false);
    setIsProcessing(false);
  }, [sale, customer]);

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
(Tasa oficial: 1 USD = ${sale.exchangeRateUsed.toFixed(2)} ${sale.currencySymbol})

*FORMAS DE PAGO:*
${paymentList}
${sale.changeGivenUSD > 0 ? `*Cambio/Vuelto:* $${sale.changeGivenUSD.toFixed(2)} USD (${formatLocal(sale.changeGivenLocal, sale.currencySymbol, sale.currencyCode)})` : ''}

----------------------------------------
${state.settings.receiptFooter || '¡Gracias por su compra!'}
`;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateReceiptText());
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleSendTextWhatsApp = () => {
    const text = encodeURIComponent(generateReceiptText());
    const cleanPhone = formatPhoneForWhatsApp(customPhone);
    const waUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
    window.open(waUrl, '_blank');
  };

  /**
   * Captures the visual thermal ticket and shares it as a real image to WhatsApp
   */
  const handleSendImageWhatsApp = async () => {
    if (!printRef.current) return;

    try {
      setIsProcessing(true);
      setProcessingStatus('Generando imagen del ticket en alta resolución...');

      const result = await captureTicketImage(printRef.current, sale.invoiceNumber);
      const cleanPhone = formatPhoneForWhatsApp(customPhone);
      
      const captionText = `🧾 *COMPROBANTE DE COMPRA:* ${sale.invoiceNumber}
🏪 *${state.settings.storeName}*
Cliente: ${sale.customerName}
Total: $${sale.totalUSD.toFixed(2)} USD (${formatLocal(sale.totalLocal, sale.currencySymbol, sale.currencyCode)})
¡Gracias por su preferencia!`;

      // 1. Mobile & Web Share API support (Android, iOS, Safari, Chrome with native share)
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [result.file] })) {
        setProcessingStatus('Abriendo selector de WhatsApp...');
        try {
          await navigator.share({
            files: [result.file],
            title: `Ticket ${sale.invoiceNumber}`,
            text: captionText,
          });
          setIsProcessing(false);
          return;
        } catch (shareErr) {
          if ((shareErr as Error).name === 'AbortError') {
            // User cancelled share dialog
            setIsProcessing(false);
            return;
          }
          console.warn('Navigator share error, fallback to clipboard:', shareErr);
        }
      }

      // 2. Desktop Web Flow (WhatsApp Web doesn't accept file upload via URI param)
      setProcessingStatus('Copiando imagen al portapapeles y preparando WhatsApp...');
      
      // Copy image to clipboard for instant Ctrl+V pasting in WhatsApp Web
      const clipSuccess = await copyImageToClipboard(result.blob);
      if (clipSuccess) {
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 4000);
      }

      // Also trigger a download of the PNG file so the cashier has the file immediately
      downloadImage(result.dataUrl, result.fileName);

      // Open WhatsApp chat
      const waUrl = cleanPhone 
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(captionText)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(captionText)}`;
      
      window.open(waUrl, '_blank');

      // Display the friendly instruction banner
      setShowDesktopNotice(true);
    } catch (err) {
      console.error('Error al generar imagen de ticket:', err);
      alert('No se pudo generar la imagen del ticket. Por favor intente nuevamente o envíe en texto.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  /**
   * Directly downloads the high-resolution PNG image
   */
  const handleDownloadImage = async () => {
    if (!printRef.current) return;

    try {
      setIsProcessing(true);
      setProcessingStatus('Preparando archivo PNG para descargar...');
      const result = await captureTicketImage(printRef.current, sale.invoiceNumber);
      downloadImage(result.dataUrl, result.fileName);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2500);
    } catch (err) {
      console.error('Error al descargar imagen:', err);
      alert('Error al descargar la imagen.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  /**
   * Copies the ticket image to clipboard
   */
  const handleCopyImageOnly = async () => {
    if (!printRef.current) return;

    try {
      setIsProcessing(true);
      setProcessingStatus('Copiando imagen al portapapeles...');
      const result = await captureTicketImage(printRef.current, sale.invoiceNumber);
      const ok = await copyImageToClipboard(result.blob);
      if (ok) {
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 3000);
      } else {
        alert('Tu navegador no permite copiar imágenes directamente. Te recomendamos usar el botón Descargar PNG.');
      }
    } catch (err) {
      console.error('Error al copiar imagen:', err);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="clay-card w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[96vh]">
        
        {/* Header (Hidden when printing) */}
        <div className="p-3.5 sm:p-4 clay-card-dark text-white flex justify-between items-center print:hidden border-b border-[var(--clay-card-border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl clay-btn clay-btn-amber text-slate-950 flex items-center justify-center font-black shrink-0 text-base shadow-sm">
              {sale.saleType === 'abono' ? '💰' : '🧾'}
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm sm:text-base text-white leading-tight truncate">
                {sale.saleType === 'abono' ? '¡Abono a Fiado Registrado!' : '¡Venta Registrada con Éxito!'}
              </h3>
              <p className="text-[11px] text-amber-300 font-mono font-bold truncate">Ticket: {sale.invoiceNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-xl clay-btn clay-btn-surface text-[var(--text-main)] flex items-center justify-center cursor-pointer shrink-0"
            title="Cerrar modal"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Celebratory Banner & Paper Width */}
        <div className="clay-card-subtle px-3 py-2.5 sm:px-4 border-b border-[var(--clay-card-border)] flex items-center justify-between gap-2.5 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <SuccessCelebrationIllustration className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
            <div className="min-w-0">
              <div className="font-black text-[var(--text-main)] text-xs truncate">
                {sale.customerName}
              </div>
              <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 truncate font-mono">
                {formatUSD(sale.totalUSD)} · {formatLocal(sale.totalLocal, sale.currencySymbol, sale.currencyCode)}
              </div>
            </div>
          </div>

          {/* Paper Width Selector */}
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-white/20 shrink-0">
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                paperWidth === '80mm'
                  ? 'clay-btn-purple text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
              title="Ancho estándar 80mm para impresoras térmicas de mostrador"
            >
              80 mm
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                paperWidth === '58mm'
                  ? 'clay-btn-purple text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
              title="Ancho mini 58mm para impresoras portátiles bluetooth"
            >
              58 mm
            </button>
          </div>
        </div>

        {/* WhatsApp Phone Number Direct Input */}
        <div className="px-3.5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs print:hidden">
          <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold shrink-0">
            <Phone className="w-3.5 h-3.5" />
            <span>Número de WhatsApp del Cliente:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-1 max-w-xs">
            <input
              type="tel"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              placeholder="Ej: 0414-1234567 o +58414..."
              className="w-full px-2.5 py-1 clay-input text-xs font-mono font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          </div>
        </div>

        {/* Desktop Helper Notice for WhatsApp Web */}
        {showDesktopNotice && (
          <div className="m-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-amber-900 dark:text-amber-200 text-xs space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm text-amber-800 dark:text-amber-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>¡Imagen del Ticket Generada y Lista!</span>
              </div>
              <button 
                onClick={() => setShowDesktopNotice(false)} 
                className="text-amber-700 hover:text-amber-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] leading-relaxed">
              La imagen del ticket ha sido <strong>copiada al portapapeles</strong> y <strong>descargada en tu PC</strong>. WhatsApp se abrió en otra pestaña.
            </p>
            <div className="p-2 rounded-xl bg-white/70 dark:bg-black/30 border border-amber-300/60 font-medium text-[11px] space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-emerald-600">✓ Paso 1:</span>
                <span>Haz clic en la ventana de chat de WhatsApp con el cliente.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-emerald-600">✓ Paso 2:</span>
                <span>Presiona <kbd className="px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800 font-mono font-bold">Ctrl + V</kbd> (o clic derecho &gt; Pegar).</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-emerald-600">✓ Paso 3:</span>
                <span>¡Presiona <strong>Enviar</strong>! El cliente recibirá la foto exacta del ticket.</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyImageOnly}
                className="px-3 py-1 rounded-xl clay-btn clay-btn-amber text-slate-950 text-[10px] font-black cursor-pointer shadow-xs"
              >
                {copiedImage ? '✓ Copiada de nuevo' : 'Volver a Copiar Imagen'}
              </button>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/50 border-b border-indigo-200 text-indigo-900 dark:text-indigo-200 text-xs font-black flex items-center justify-center gap-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>{processingStatus || 'Procesando comprobante...'}</span>
          </div>
        )}

        {/* Receipt Content Body (Thermal Ticket Preview) */}
        <div className="p-3 sm:p-5 overflow-y-auto bg-slate-200/60 dark:bg-black/30 flex justify-center flex-1">
          <div 
            id="thermal-print-area"
            ref={printRef}
            style={{ 
              maxWidth: paperWidth === '58mm' ? '240px' : '310px',
              backgroundColor: '#ffffff',
              color: '#0f172a'
            }}
            className="w-full bg-white p-4 sm:p-5 rounded-2xl shadow-xl border border-slate-300 font-mono text-xs text-slate-900 space-y-2.5 leading-relaxed transition-all"
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
                <span>{state.settings.taxCalculationMode === 'additional' ? 'Subtotal (Base neta):' : 'Base Imponible:'}</span>
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
                  <span>IVA ({state.settings.taxPercentage}%{state.settings.taxCalculationMode !== 'additional' ? ' Incluido' : ''}):</span>
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

        {/* Action Buttons Section */}
        <div className="p-3 sm:p-4 clay-card-subtle border-t border-[var(--clay-card-border)] space-y-2.5 print:hidden">
          
          {/* PRIMARY ROW: WHATSAPP IMAGEN + IMPRIMIR */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            
            {/* BOTÓN PRINCIPAL: WHATSAPP COMO IMAGEN */}
            <button
              type="button"
              onClick={handleSendImageWhatsApp}
              disabled={isProcessing}
              className="sm:col-span-8 flex items-center justify-center gap-2 py-3 px-4 clay-btn clay-btn-emerald text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg cursor-pointer transition-all disabled:opacity-50"
              title="Envía el ticket en formato imagen fotográfica tal cual como se ve en pantalla"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ImageIcon className="w-5 h-5 stroke-[2.5]" />
              )}
              <span className="truncate">
                {isProcessing ? 'Generando Imagen...' : 'Enviar por WhatsApp (Imagen)'}
              </span>
              <span className="clay-badge bg-black/20 text-[10px] text-white px-2 py-0.5 ml-1 hidden md:inline">
                PNG Foto
              </span>
            </button>

            {/* IMPRIMIR TÉRMICO */}
            <button
              type="button"
              onClick={handlePrint}
              className="sm:col-span-4 flex items-center justify-center gap-1.5 py-3 px-3 clay-btn clay-btn-amber text-slate-950 rounded-2xl text-xs sm:text-sm font-black shadow-md cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Térmico</span>
            </button>
          </div>

          {/* SECONDARY ROW: DESCARGAR IMAGEN + COPIAR IMAGEN + TEXTO PLANO */}
          <div className="grid grid-cols-3 gap-2">
            {/* Descargar Imagen */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isProcessing}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 clay-btn clay-btn-surface text-[var(--text-main)] rounded-xl text-xs font-bold shadow-xs cursor-pointer hover:scale-102"
              title="Descarga la imagen del ticket en formato PNG a tu dispositivo"
            >
              {downloaded ? <Check className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4 text-blue-500" />}
              <span className="truncate">{downloaded ? '¡Descargado!' : 'Descargar PNG'}</span>
            </button>

            {/* Copiar Imagen */}
            <button
              type="button"
              onClick={handleCopyImageOnly}
              disabled={isProcessing}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 clay-btn clay-btn-surface text-[var(--text-main)] rounded-xl text-xs font-bold shadow-xs cursor-pointer hover:scale-102"
              title="Copia la imagen gráfica al portapapeles para pegarla en WhatsApp Web (Ctrl+V)"
            >
              {copiedImage ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-purple-500" />}
              <span className="truncate">{copiedImage ? '¡Copiada!' : 'Copiar Imagen'}</span>
            </button>

            {/* Enviar como Texto */}
            <button
              type="button"
              onClick={handleSendTextWhatsApp}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 clay-btn clay-btn-surface text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              title="Enviar el ticket en formato de texto plano tradicional"
            >
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span className="truncate">Enviar Texto</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
