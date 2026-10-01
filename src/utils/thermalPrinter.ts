import { Sale, StoreSettings, ZReportRecord } from '../types';
import { formatUSD, formatLocal, formatDateTime } from './formatters';

export type ThermalPaperWidth = '80mm' | '58mm';

/**
 * Print thermal sale receipt or abono voucher
 */
export function printThermalReceipt(
  sale: Sale,
  settings: StoreSettings,
  paperWidth: ThermalPaperWidth = '80mm'
): void {
  const is58mm = paperWidth === '58mm';
  const printableWidth = is58mm ? '48mm' : '72mm';
  const fontSize = is58mm ? '11px' : '12px';
  const titleSize = is58mm ? '14px' : '16px';
  const isAbono = sale.saleType === 'abono';

  // Build items rows
  const itemsHtml = sale.items
    .map(item => `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3px;">
        <div style="flex: 1; padding-right: 5px; word-break: break-word;">
          <span style="font-weight: bold;">${item.quantity}x</span> ${item.productName}
          <div style="font-size: 10px; color: #333;">@ $${item.unitPriceUSD.toFixed(2)} c/u</div>
        </div>
        <div style="text-align: right; font-weight: bold; white-space: nowrap;">
          $${item.subtotalUSD.toFixed(2)}
        </div>
      </div>
    `)
    .join('');

  // Build payment methods rows
  const paymentsHtml = sale.paymentMethods
    .map(pm => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <div>
          <span style="font-weight: bold;">${pm.gatewayName}</span>
          ${pm.reference ? `<span style="font-size: 9.5px; display: block; color: #333;">Ref: ${pm.reference}</span>` : ''}
          ${pm.bank ? `<span style="font-size: 9.5px; display: block; color: #333;">Banco: ${pm.bank}</span>` : ''}
        </div>
        <div style="text-align: right; font-weight: bold;">
          $${pm.amountUSD.toFixed(2)}
          <div style="font-size: 9.5px; font-weight: normal; color: #333;">
            ${formatLocal(pm.amountLocal, sale.currencySymbol, sale.currencyCode)}
          </div>
        </div>
      </div>
    `)
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Ticket_${sale.invoiceNumber}</title>
        <style>
          @page {
            size: auto;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace, monospace;
            font-size: ${fontSize};
            line-height: 1.25;
            color: #000000;
            background: #ffffff;
            width: ${printableWidth};
            margin: 0 auto;
            padding: 2mm 1mm 15mm 1mm;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .left { text-align: left; }
          .bold { font-weight: bold; }
          .dashed {
            border-bottom: 1px dashed #000000;
            margin: 5px 0;
          }
          .double {
            border-bottom: 2px solid #000000;
            margin: 6px 0;
          }
          .flex-between {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .feed {
            height: 20mm;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="center">
          <div style="font-size: ${titleSize}; font-weight: bold; text-transform: uppercase;">
            ${settings.storeName}
          </div>
          ${settings.taxId ? `<div style="font-size: 11px;">RIF/Doc: ${settings.taxId}</div>` : ''}
          ${settings.address ? `<div style="font-size: 10px; line-height: 1.1;">${settings.address}</div>` : ''}
          ${settings.phone ? `<div style="font-size: 10px;">Tel: ${settings.phone}</div>` : ''}
        </div>

        <div class="double"></div>

        <!-- Document Type Header -->
        <div class="center bold" style="font-size: 13px; text-transform: uppercase;">
          ${isAbono ? '*** COMPROBANTE DE ABONO A FIADO ***' : 'COMPROBANTE DE VENTA'}
        </div>

        <div class="dashed"></div>

        <!-- Metadata -->
        <div class="flex-between">
          <span>N° Transacción:</span>
          <span class="bold">${sale.invoiceNumber}</span>
        </div>
        <div class="flex-between">
          <span>Fecha/Hora:</span>
          <span>${formatDateTime(sale.date)}</span>
        </div>
        ${sale.cashierName ? `
          <div class="flex-between">
            <span>Cajero / Operador:</span>
            <span>${sale.cashierName}</span>
          </div>
        ` : ''}
        <div class="flex-between">
          <span>Cliente:</span>
          <span class="bold">${sale.customerName}</span>
        </div>
        ${sale.customerTaxId ? `
          <div class="flex-between">
            <span>Cédula / RIF:</span>
            <span>${sale.customerTaxId}</span>
          </div>
        ` : ''}

        <div class="dashed"></div>

        <!-- Items Section -->
        <div class="flex-between" style="font-size: 10px; font-weight: bold; text-transform: uppercase;">
          <span>${isAbono ? 'Concepto' : 'Cant • Descripción'}</span>
          <span>Monto</span>
        </div>
        <div class="dashed"></div>

        <div>
          ${itemsHtml}
        </div>

        <div class="dashed"></div>

        <!-- Totals -->
        ${!isAbono && sale.discountUSD > 0 ? `
          <div class="flex-between">
            <span>Descuento:</span>
            <span>-$${sale.discountUSD.toFixed(2)}</span>
          </div>
        ` : ''}
        ${!isAbono && sale.taxUSD > 0 ? `
          <div class="flex-between">
            <span>IVA (${settings.taxPercentage}%):</span>
            <span>$${sale.taxUSD.toFixed(2)}</span>
          </div>
        ` : ''}

        <div class="double"></div>

        <!-- Grand Total -->
        <div class="flex-between" style="font-size: 14px; font-weight: bold;">
          <span>${isAbono ? 'TOTAL ABONADO:' : 'TOTAL A PAGAR:'}</span>
          <span>$${sale.totalUSD.toFixed(2)}</span>
        </div>
        <div class="flex-between" style="font-size: 12px; font-weight: bold; margin-top: 2px;">
          <span>TOTAL EN ${sale.currencyCode}:</span>
          <span>${formatLocal(sale.totalLocal, sale.currencySymbol, sale.currencyCode)}</span>
        </div>
        <div class="center" style="font-size: 9.5px; margin-top: 3px; color: #333;">
          Tasa Oficial: 1 USD = ${sale.exchangeRateUsed.toFixed(2)} ${sale.currencySymbol}
        </div>

        <div class="dashed"></div>

        <!-- Payment Breakdown (Mixed Payment details) -->
        <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 3px;">
          Formas de Pago Aplicadas:
        </div>
        <div>
          ${paymentsHtml}
        </div>

        ${sale.changeGivenUSD > 0 ? `
          <div class="dashed"></div>
          <div class="flex-between bold" style="margin-top: 2px;">
            <span>Cambio / Vuelto:</span>
            <span>$${sale.changeGivenUSD.toFixed(2)} (${formatLocal(sale.changeGivenLocal, sale.currencySymbol, sale.currencyCode)})</span>
          </div>
        ` : ''}

        ${sale.notes ? `
          <div class="dashed"></div>
          <div style="font-size: 10px; font-style: italic; color: #222;">
            Nota: ${sale.notes}
          </div>
        ` : ''}

        <div class="dashed"></div>

        <!-- Footer -->
        <div class="center" style="font-size: 10px; margin-top: 4px;">
          <div>${settings.receiptFooter || '¡Gracias por su compra!'}</div>
          <div style="font-size: 8.5px; margin-top: 4px; color: #555;">OmniPOS Retail System</div>
        </div>

        <div class="feed"></div>
      </body>
    </html>
  `;

  executeThermalPrint(htmlContent);
}

/**
 * Print Reporte X (Partial live cut) or Reporte Z (Fiscal daily closure)
 */
export function printThermalZReport(
  report: ZReportRecord,
  settings: StoreSettings,
  isReportX: boolean = false,
  paperWidth: ThermalPaperWidth = '80mm'
): void {
  const is58mm = paperWidth === '58mm';
  const printableWidth = is58mm ? '48mm' : '72mm';
  const fontSize = is58mm ? '10.5px' : '11.5px';

  // Build Inflow breakdown HTML
  const inflowsList = Object.entries(report.inflowsByGateway)
    .filter(([_, d]) => d.amountUSD > 0 || d.count > 0)
    .map(([_, d]) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <div>
          <span style="font-weight: bold;">${d.name}</span>
          <span style="font-size: 9px; color: #444;"> (${d.count} op.)</span>
        </div>
        <div style="text-align: right; font-weight: bold;">
          $${d.amountUSD.toFixed(2)}
          <div style="font-size: 9px; font-weight: normal; color: #333;">
            ${formatLocal(d.amountLocal, settings.secondaryCurrency.symbol, settings.secondaryCurrency.code)}
          </div>
        </div>
      </div>
    `)
    .join('');

  // Build Bank breakdown HTML
  const banksList = Object.entries(report.inflowsByBank)
    .filter(([_, d]) => d.amountUSD > 0)
    .map(([_, d]) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>${d.bank} (${d.count} trans.)</span>
        <span style="font-weight: bold;">$${d.amountUSD.toFixed(2)}</span>
      </div>
    `)
    .join('');

  // Build User breakdown HTML
  const usersList = Object.entries(report.inflowsByUser)
    .filter(([_, d]) => d.totalUSD > 0 || d.count > 0)
    .map(([_, d]) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <div>
          <span style="font-weight: bold;">${d.userName}</span>
          <span style="font-size: 9px; color: #555;"> (${d.role})</span>
        </div>
        <div style="text-align: right; font-weight: bold;">
          $${d.totalUSD.toFixed(2)} (${d.count} tickets)
        </div>
      </div>
    `)
    .join('');

  const reportTitle = isReportX 
    ? '*** CORTE PARCIAL (REPORTE X) ***' 
    : `*** CIERRE DIARIO (REPORTE Z N° ${String(report.zNumber).padStart(4, '0')}) ***`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${isReportX ? 'Reporte_X' : `Reporte_Z_${report.zNumber}`}</title>
        <style>
          @page { size: auto; margin: 0mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: ${fontSize};
            line-height: 1.25;
            color: #000000;
            background: #ffffff;
            width: ${printableWidth};
            margin: 0 auto;
            padding: 2mm 1mm 15mm 1mm;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .left { text-align: left; }
          .bold { font-weight: bold; }
          .dashed { border-bottom: 1px dashed #000000; margin: 4px 0; }
          .double { border-bottom: 2px solid #000000; margin: 5px 0; }
          .flex-between { display: flex; justify-content: space-between; align-items: center; }
          .feed { height: 25mm; }
        </style>
      </head>
      <body>
        <div class="center">
          <div style="font-size: 15px; font-weight: bold; text-transform: uppercase;">
            ${settings.storeName}
          </div>
          ${settings.taxId ? `<div style="font-size: 11px;">RIF: ${settings.taxId}</div>` : ''}
          <div style="font-size: 9.5px;">${settings.address || ''}</div>
        </div>

        <div class="double"></div>
        <div class="center bold" style="font-size: 12px; margin: 3px 0;">
          ${reportTitle}
        </div>
        <div class="double"></div>

        <div class="flex-between">
          <span>Fecha del Reporte:</span>
          <span class="bold">${report.date}</span>
        </div>
        <div class="flex-between">
          <span>Hora de Emisión:</span>
          <span>${formatDateTime(report.closedAt)}</span>
        </div>
        <div class="flex-between">
          <span>Generado Por:</span>
          <span class="bold">${report.closedByUserName}</span>
        </div>
        <div class="flex-between">
          <span>Factura Inicial:</span>
          <span>${report.firstInvoice || 'N/A'}</span>
        </div>
        <div class="flex-between">
          <span>Factura Final:</span>
          <span>${report.lastInvoice || 'N/A'}</span>
        </div>
        <div class="flex-between">
          <span>Total Transacciones:</span>
          <span class="bold">${report.transactionsCount}</span>
        </div>

        <div class="double"></div>

        <div class="flex-between" style="font-size: 14px; font-weight: bold;">
          <span>VENTAS TOTALES:</span>
          <span>$${report.totalSalesUSD.toFixed(2)}</span>
        </div>
        <div class="flex-between" style="font-size: 12px; font-weight: bold; margin-top: 1px;">
          <span>TOTAL EN ${settings.secondaryCurrency.code}:</span>
          <span>${formatLocal(report.totalSalesLocal, settings.secondaryCurrency.symbol, settings.secondaryCurrency.code)}</span>
        </div>

        <div class="dashed"></div>

        <div class="bold" style="font-size: 10.5px; text-transform: uppercase; margin-bottom: 2px;">
          1. ENTRADAS POR FORMA DE PAGO:
        </div>
        <div>
          ${inflowsList || '<div>No se registraron ventas en el período.</div>'}
        </div>

        ${banksList ? `
          <div class="dashed"></div>
          <div class="bold" style="font-size: 10.5px; text-transform: uppercase; margin-bottom: 2px;">
            2. INGRESOS POR BANCO RECEPTOR:
          </div>
          <div>${banksList}</div>
        ` : ''}

        ${usersList ? `
          <div class="dashed"></div>
          <div class="bold" style="font-size: 10.5px; text-transform: uppercase; margin-bottom: 2px;">
            3. RENDIMIENTO POR USUARIO:
          </div>
          <div>${usersList}</div>
        ` : ''}

        <div class="dashed"></div>

        <div class="bold" style="font-size: 10.5px; text-transform: uppercase; margin-bottom: 2px;">
          4. ARQUEO DE EFECTIVO EN CAJA:
        </div>
        <div class="flex-between">
          <span>Efectivo Esperado ($):</span>
          <span class="bold">$${report.cashExpectedUSD.toFixed(2)}</span>
        </div>
        <div class="flex-between">
          <span>Efectivo Esperado (Bs):</span>
          <span class="bold">${formatLocal(report.cashExpectedLocal, settings.secondaryCurrency.symbol, settings.secondaryCurrency.code)}</span>
        </div>
        ${report.cashCountedUSD !== undefined ? `
          <div class="flex-between" style="margin-top: 2px;">
            <span>Efectivo Físico Contado:</span>
            <span>$${report.cashCountedUSD.toFixed(2)}</span>
          </div>
          <div class="flex-between bold" style="margin-top: 2px; color: ${report.cashDifferenceUSD && report.cashDifferenceUSD < 0 ? '#b91c1c' : '#15803d'};">
            <span>Diferencia / Cuadre:</span>
            <span>${(report.cashDifferenceUSD || 0) >= 0 ? '+' : ''}$${(report.cashDifferenceUSD || 0).toFixed(2)}</span>
          </div>
        ` : ''}

        <div class="double"></div>
        <div class="center" style="font-size: 9.5px; margin-top: 6px;">
          <div>*** FIN DEL REPORTE ${isReportX ? 'X' : 'Z'} ***</div>
          <div style="font-size: 8px; color: #555; margin-top: 2px;">OmniPOS Retail Fiscal Audit</div>
        </div>

        <div class="feed"></div>
      </body>
    </html>
  `;

  executeThermalPrint(htmlContent);
}

function executeThermalPrint(htmlContent: string) {
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  printFrame.style.visibility = 'hidden';

  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
  if (!frameDoc) {
    window.print();
    return;
  }

  frameDoc.open();
  frameDoc.write(htmlContent);
  frameDoc.close();

  setTimeout(() => {
    printFrame.contentWindow?.focus();
    printFrame.contentWindow?.print();

    setTimeout(() => {
      if (document.body.contains(printFrame)) {
        document.body.removeChild(printFrame);
      }
    }, 1500);
  }, 250);
}
