export function formatCurrency(amount: number, code: string = 'USD', symbol: string = '$'): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  
  if (code === 'USD') {
    return `${symbol} ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  // Latin America & European local currency standard
  return `${safeAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
}

export function formatUSD(amount: number): string {
  return formatCurrency(amount, 'USD', '$');
}

export function formatLocal(amount: number, symbol: string = 'Bs.', code: string = 'VES'): string {
  return formatCurrency(amount, code, symbol);
}

export function formatDual(amountUSD: number, rate: number, symbol: string = 'Bs.', code: string = 'VES'): { usd: string; local: string } {
  const safeUSD = isNaN(amountUSD) ? 0 : amountUSD;
  const safeRate = isNaN(rate) || rate <= 0 ? 1 : rate;
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
