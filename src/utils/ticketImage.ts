import html2canvas from 'html2canvas';

/**
 * Normalizes and formats a phone number for international WhatsApp links
 * Handles Venezuelan mobile prefixes (0414, 0424, 0412, 0416, 0426) and general international formats
 */
export function formatPhoneForWhatsApp(phone?: string): string {
  if (!phone) return '';
  
  // Keep only digits and plus sign
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Venezuelan numbers: 04141234567 (11 digits) -> 584141234567
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '58' + cleaned.substring(1);
  } else if (
    cleaned.length === 10 && 
    (cleaned.startsWith('414') || cleaned.startsWith('424') || cleaned.startsWith('412') || cleaned.startsWith('416') || cleaned.startsWith('426'))
  ) {
    cleaned = '58' + cleaned;
  }

  return cleaned;
}

export interface TicketImageResult {
  blob: Blob;
  file: File;
  dataUrl: string;
  fileName: string;
}

/**
 * Captures an HTML DOM element (thermal receipt) to a high-resolution PNG image
 */
export async function captureTicketImage(
  element: HTMLElement, 
  invoiceNumber: string
): Promise<TicketImageResult> {
  const sanitizedInvoice = invoiceNumber.replace(/[^\w-]/g, '_');
  const fileName = `Ticket_${sanitizedInvoice}.png`;

  // Capture with 2.5x retina scale for ultra-sharp typography
  const canvas = await html2canvas(element, {
    scale: 2.5,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
  });

  const dataUrl = canvas.toDataURL('image/png');

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('No se pudo convertir el canvas a imagen'));
    }, 'image/png', 1.0);
  });

  const file = new File([blob], fileName, { type: 'image/png' });

  return { blob, file, dataUrl, fileName };
}

/**
 * Copies a PNG Blob directly to the system clipboard
 */
export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    return false;
  }
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    return true;
  } catch (err) {
    console.warn('Error al copiar imagen al portapapeles:', err);
    return false;
  }
}

/**
 * Triggers instant browser download of a dataURL image
 */
export function downloadImage(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
