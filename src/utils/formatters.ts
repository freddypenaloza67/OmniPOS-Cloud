export function formatCurrency(amount: number | string, code: string = 'USD', symbol: string = '$'): string {
  const num = Number(amount);
  const safeAmount = isNaN(num) || !isFinite(num) ? 0 : num;
  
  if (code === 'USD' || symbol === '$') {
    return `$ ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  // Latin America standard format
  const sym = symbol || 'Bs.';
  return `${safeAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym}`;
}

export function formatUSD(amount: number | string): string {
  return formatCurrency(amount, 'USD', '$');
}

export function formatLocal(amount: number | string, arg2: string = 'Bs.', arg3: string = 'VES'): string {
  const num = Number(amount);
  const safeAmount = isNaN(num) || !isFinite(num) ? 0 : num;
  
  let symbol = 'Bs.';
  let code = 'VES';
  if (arg2) {
    if (arg2.includes('Bs') || arg2.includes('$') || arg2.length <= 4) {
      symbol = arg2;
      code = arg3 || 'VES';
    } else {
      code = arg2;
      symbol = arg3 || 'Bs.';
    }
  }

  return formatCurrency(safeAmount, code, symbol);
}

export function formatDual(amountUSD: number | string, rate: number | string, symbol: string = 'Bs.', code: string = 'VES'): { usd: string; local: string } {
  const safeUSD = Number(amountUSD) || 0;
  const safeRate = Number(rate) > 0 ? Number(rate) : 1;
  const localAmount = safeUSD * safeRate;
  
  return {
    usd: formatUSD(safeUSD),
    local: formatLocal(localAmount, symbol, code)
  };
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}
