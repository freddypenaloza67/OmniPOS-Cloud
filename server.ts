import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { initialData } from './src/data/initialData';
import { 
  createDefaultDemoLicense, 
  generateLicenseKey, 
  validateLicenseKey, 
  activateLicenseKeyOnData, 
  getLicenseStatus 
} from './src/utils/licenseUtils';
import { LicenseType } from './src/types/license';

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
// In AI Studio development, the dev server must always run on port 3000.
// In production deployment (e.g. Cloud Run), it uses process.env.PORT.
const PORT = isProduction ? Number(process.env.PORT || 8080) : 3000;

// Increase body limit to support scanned receipt images and high-resolution photos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data folder and database.json exist
const dataDir = path.resolve(process.cwd(), 'data');
const dbFilePath = path.resolve(dataDir, 'database.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(dbFilePath)) {
  fs.writeFileSync(dbFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
}

function readDatabase() {
  try {
    const raw = fs.readFileSync(dbFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.license) {
      parsed.license = createDefaultDemoLicense(parsed.settings?.storeName || 'Mi Comercio');
      writeDatabase(parsed);
    }
    return parsed;
  } catch (error) {
    console.error('Error reading database file:', error);
    return initialData;
  }
}

function writeDatabase(data: any) {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing database file:', error);
    return false;
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// License routes
app.get('/api/license', (req, res) => {
  const data = readDatabase();
  const statusInfo = getLicenseStatus(data.license);
  res.json({
    license: data.license,
    statusInfo,
    serverTime: new Date().toISOString()
  });
});

app.post('/api/license/activate', (req, res) => {
  const { key, licensedTo } = req.body;
  if (!key) {
    return res.status(400).json({ success: false, message: 'Clave de activación requerida' });
  }

  const data = readDatabase();
  const currentLicense = data.license || createDefaultDemoLicense(data.settings?.storeName);
  const result = activateLicenseKeyOnData(key, currentLicense, licensedTo);

  if (!result.success || !result.newLicense) {
    return res.status(400).json({ success: false, message: result.message });
  }

  data.license = result.newLicense;
  writeDatabase(data);

  const statusInfo = getLicenseStatus(data.license);
  res.json({
    success: true,
    message: result.message,
    license: data.license,
    statusInfo
  });
});

app.post('/api/license/reset-demo', (req, res) => {
  const data = readDatabase();
  const newDemo = createDefaultDemoLicense(
    data.settings?.storeName || 'Mi Comercio', 
    data.license?.systemId
  );
  data.license = newDemo;
  writeDatabase(data);

  const statusInfo = getLicenseStatus(data.license);
  res.json({
    success: true,
    message: 'Versión Demo renovada exitosamente por 15 días completos.',
    license: data.license,
    statusInfo
  });
});

app.post('/api/license/generate', (req, res) => {
  const { type = 'annual', customSeed } = req.body;
  const validTypes: LicenseType[] = ['demo', 'monthly', 'semiannual', 'annual', 'lifetime'];
  if (!validTypes.includes(type as LicenseType)) {
    return res.status(400).json({ success: false, message: 'Tipo de licencia inválido' });
  }

  const key = generateLicenseKey(type as LicenseType, customSeed);
  const validation = validateLicenseKey(key);
  res.json({
    success: true,
    key,
    type,
    durationDays: validation.durationDays,
    createdAt: new Date().toISOString()
  });
});

// Get current state
app.get('/api/state', (req, res) => {
  const data = readDatabase();
  res.json(data);
});

// Update state
app.post('/api/state', (req, res) => {
  const updatedState = req.body;
  if (!updatedState) {
    return res.status(400).json({ error: 'No data provided' });
  }
  updatedState.lastSyncedAt = new Date().toISOString();
  const ok = writeDatabase(updatedState);
  if (ok) {
    res.json({ success: true, lastSyncedAt: updatedState.lastSyncedAt });
  } else {
    res.status(500).json({ error: 'Failed to write state to disk' });
  }
});

// Daily exchange rate fetcher
let cachedRates: { timestamp: number; rates: Record<string, number> } | null = null;

app.get('/api/exchange-rate', async (req, res) => {
  const targetCurrency = ((req.query.currency as string) || 'VES').toUpperCase();
  const now = Date.now();

  // Cache for 1 hour to avoid rate-limiting
  if (cachedRates && now - cachedRates.timestamp < 3600000 && cachedRates.rates[targetCurrency]) {
    return res.json({
      success: true,
      currency: targetCurrency,
      rate: cachedRates.rates[targetCurrency],
      rates: cachedRates.rates,
      source: 'cache',
      date: new Date(cachedRates.timestamp).toISOString()
    });
  }

  try {
    // Free open exchange rates API
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (response.ok) {
      const data = await response.json();
      if (data && data.rates) {
        cachedRates = {
          timestamp: now,
          rates: data.rates
        };
        const rate = data.rates[targetCurrency] || 1;
        return res.json({
          success: true,
          currency: targetCurrency,
          rate: rate,
          rates: data.rates,
          source: 'open-er-api',
          date: new Date().toISOString()
        });
      }
    }
    throw new Error('Could not fetch rates');
  } catch (err: any) {
    console.warn('Exchange rate fetch fallback:', err.message);
    // Reasonable default fallbacks for common Latin America & global currencies
    const defaultFallbacks: Record<string, number> = {
      VES: 52.40,
      COP: 4150.00,
      MXN: 18.50,
      EUR: 0.92,
      ARS: 1250.00,
      PEN: 3.75,
      BRL: 5.40,
      CLP: 940.00
    };
    return res.json({
      success: true,
      currency: targetCurrency,
      rate: defaultFallbacks[targetCurrency] || 1,
      rates: defaultFallbacks,
      source: 'fallback',
      date: new Date().toISOString()
    });
  }
});

// AI Scanner for invoices and receipts (Gemini 3.8 Flash)
app.post('/api/scan-invoice', async (req, res) => {
  try {
    const { 
      imageBase64, 
      mimeType, 
      currentExchangeRate = 1,
      localCurrencyCode = 'VES',
      localCurrencySymbol = 'Bs.'
    } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ 
        error: 'No se recibieron datos del archivo',
        details: 'El contenido base64 de la imagen o documento está vacío.' 
      });
    }

    // Clean and sanitize base64: strip any data URI prefix and remove whitespaces/newlines
    let rawBase64 = imageBase64;
    let detectedMime = (typeof mimeType === 'string' && mimeType.trim().length > 0) ? mimeType.trim() : '';

    if (rawBase64.includes(',')) {
      const parts = rawBase64.split(',');
      const prefix = parts[0];
      rawBase64 = parts.slice(1).join(',');
      const mimeMatch = prefix.match(/data:([^;]+);/i);
      if (mimeMatch && (!detectedMime || detectedMime === 'application/octet-stream')) {
        detectedMime = mimeMatch[1];
      }
    }

    rawBase64 = rawBase64.replace(/\s+/g, '');

    if (!rawBase64) {
      return res.status(400).json({ 
        error: 'El archivo está vacío o los datos son inválidos.',
        details: 'No se pudo decodificar el contenido base64.' 
      });
    }

    if (detectedMime.includes(';')) {
      detectedMime = detectedMime.split(';')[0].trim();
    }

    // Detect MIME type accurately if missing or default
    let finalMimeType = detectedMime;
    if (!finalMimeType || finalMimeType === 'application/octet-stream') {
      if (rawBase64.startsWith('JVBERi0')) {
        finalMimeType = 'application/pdf';
      } else if (rawBase64.startsWith('/9j/')) {
        finalMimeType = 'image/jpeg';
      } else if (rawBase64.startsWith('iVBORw0KGgo')) {
        finalMimeType = 'image/png';
      } else if (rawBase64.startsWith('UklGR')) {
        finalMimeType = 'image/webp';
      } else {
        finalMimeType = 'image/jpeg';
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY no está configurada en el servidor.',
        details: 'Verifique los secrets del entorno para habilitar el escáner IA.' 
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const parsedRate = Number(currentExchangeRate) > 0 ? Number(currentExchangeRate) : 1;

    const prompt = `Actúa como un contador público senior y auditor fiscal especializado en compras para comercios al detal (retail).
Analiza este documento comercial (factura electrónica o física, nota de entrega, ticket fiscal, factura forma libre tipo SENIAT o recibo de compra).
Soporta y audita con precisión facturas de Venezuela (como VENSPEED C.A., distribuidores mayoristas, papelería, tecnología, etc.), Colombia, México, EE.UU. o cualquier país.

REGLAS CRÍTICAS DE AUDITORÍA Y LECTURA:
1. DETECCIÓN DE MONEDA (VITAL):
   - Determina con exactitud la moneda en la que están expresados los precios de la factura:
     * Si los precios están en Bolívares (Bs., Bs.S, Bs.F o VES), establece currencyDetected = "VES" y currencySymbol = "Bs.".
     * Si los precios están en Dólares ($ o USD), establece currencyDetected = "USD" y currencySymbol = "$".
     * Si están en otra moneda (ej. Pesos COP, Euros), identifícala adecuadamente.
   - Revisa si la factura menciona explícitamente una tasa de cambio o tasa oficial BCV (ej: "Tasa BCV: 36,50", "Tasa de cambio: 45.20", o "Monto expresado al tipo de cambio..."). Si aparece, extráela en exchangeRateOnInvoice (número). Si no aparece, pon 0.
   - Tasa de referencia del comercio actual: ${parsedRate} ${localCurrencySymbol}/USD.

2. FORMATO NUMÉRICO LATINOAMERICANO:
   - En Venezuela y Latinoamérica, con frecuencia el punto '.' separa los miles y la coma ',' separa los decimales (por ejemplo: "1.250,00" = 1250.00; "45.000" = 45000; "500,50" = 500.50).
   - ¡NO CONFUNDAS "1.250" con "1.25"! Convierte y normaliza todos los importes a números flotantes estándar de punto decimal (1250.0).

3. EXTRACCIÓN DETALLADA DE PRODUCTOS (NO OMITIR NINGÚN RENGLÓN):
   - Extrae rigurosamente TODOS los renglones o productos presentes en la factura (no omitas toners, consumibles, accesorios, repuestos, etc.).
   - code: Código o referencia ("Ref.", "Código", "Part Number", ej: "MLT-D111S", "D111", "CE285A").
   - name: Nombre descriptivo y COMPLETO del producto. Si en la factura la columna "Ref." tiene el modelo y "Descripción" tiene el texto, COMBÍNALOS coherentemente (ej: si Ref es "D111" y Descripción es "TONER SAMSUNG COMPATIBLE", el name debe ser "TONER SAMSUNG COMPATIBLE D111 / D111S").
   - quantity: Cantidad numérica comprada (número).
   - unitCostOriginal: Costo unitario tal como está impreso en la factura en su moneda original.
   - totalCostOriginal: Total del renglón en la moneda original (quantity * unitCostOriginal).
   - Conversión a USD:
     * Si currencyDetected es "USD": unitCostUSD = unitCostOriginal, totalCostUSD = totalCostOriginal.
     * Si currencyDetected es "VES" o moneda local: convierte a USD dividiendo entre la tasa de cambio (usa exchangeRateOnInvoice si > 0, de lo contrario usa la tasa del comercio: ${parsedRate}).
       unitCostUSD = unitCostOriginal / tasa.
       totalCostUSD = totalCostOriginal / tasa.
   - category: Sugerencia adecuada ("Tecnología", "Víveres", "Papelería y Oficina", "Bebidas", "Limpieza", "General").
   - unit: Unidad de medida ("ud", "paq", "caja", "kg", "lt").

4. PROVEEDOR Y FACTURA:
   - supplierName: Nombre o razón social completa del proveedor (ej: "VENSPEED, C.A.").
   - supplierTaxId: RIF / NIT / RFC / CIF (ej: "J-40137367-4").
   - invoiceNumber: Número de factura (ej: "B00000001", "004523") o número de control.
   - invoiceDate: Fecha de la factura en formato YYYY-MM-DD si es identificable.
   - subtotalOriginal, taxOriginal, totalOriginal: Totales en la moneda original de la factura.
   - totalUSD: Total de la factura convertido a USD.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: rawBase64,
              mimeType: finalMimeType
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            supplierName: { type: Type.STRING, description: 'Nombre o razón social del emisor de la factura' },
            supplierTaxId: { type: Type.STRING, description: 'RIF, NIT, RFC o identificación fiscal' },
            supplierPhone: { type: Type.STRING, description: 'Teléfono de contacto si aparece' },
            supplierAddress: { type: Type.STRING, description: 'Dirección física si aparece' },
            invoiceNumber: { type: Type.STRING, description: 'Número de factura, control o serie' },
            invoiceDate: { type: Type.STRING, description: 'Fecha de la factura (YYYY-MM-DD)' },
            currencyDetected: { type: Type.STRING, description: 'Moneda de la factura: VES, USD, COP, EUR' },
            currencySymbol: { type: Type.STRING, description: 'Símbolo: Bs., $, etc.' },
            exchangeRateOnInvoice: { type: Type.NUMBER, description: 'Tasa de cambio impresa en la factura si existe, o 0' },
            subtotalOriginal: { type: Type.NUMBER, description: 'Subtotal en moneda original' },
            taxOriginal: { type: Type.NUMBER, description: 'Monto de impuesto o IVA en moneda original' },
            totalOriginal: { type: Type.NUMBER, description: 'Total de la factura en su moneda original' },
            totalUSD: { type: Type.NUMBER, description: 'Total de la factura convertido a Dólares USD' },
            notes: { type: Type.STRING, description: 'Notas, condiciones de pago o detalles adicionales' },
            items: {
              type: Type.ARRAY,
              description: 'Lista completa de todos los productos extraídos de la factura sin omisiones',
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING, description: 'Código, SKU o referencia de producto' },
                  name: { type: Type.STRING, description: 'Nombre completo y descriptivo del producto' },
                  quantity: { type: Type.NUMBER, description: 'Cantidad comprada' },
                  unitCostOriginal: { type: Type.NUMBER, description: 'Costo unitario en moneda original de la factura' },
                  totalCostOriginal: { type: Type.NUMBER, description: 'Total renglón en moneda original' },
                  unitCostUSD: { type: Type.NUMBER, description: 'Costo unitario convertido a Dólares USD' },
                  totalCostUSD: { type: Type.NUMBER, description: 'Total renglón en Dólares USD' },
                  category: { type: Type.STRING, description: 'Categoría sugerida' },
                  unit: { type: Type.STRING, description: 'Unidad de medida (ud, paq, caja, kg)' }
                },
                required: ['name']
              }
            }
          },
          required: ['supplierName', 'items']
        }
      }
    });

    let rawText = response.text ? response.text.trim() : '';
    if (!rawText) {
      throw new Error('El modelo de IA no devolvió contenido.');
    }

    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    }

    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedJson = JSON.parse(match[0]);
      } else {
        throw new Error('Respuesta inválida del modelo de IA.');
      }
    }

    // Normalize top-level fields
    parsedJson.supplierName = parsedJson.supplierName?.trim() || 'Proveedor General';
    parsedJson.invoiceNumber = parsedJson.invoiceNumber?.trim() || '';
    parsedJson.items = Array.isArray(parsedJson.items) ? parsedJson.items : [];
    parsedJson.currencyDetected = parsedJson.currencyDetected || (localCurrencyCode || 'VES');
    parsedJson.currencySymbol = parsedJson.currencySymbol || (parsedJson.currencyDetected === 'USD' ? '$' : (localCurrencySymbol || 'Bs.'));
    parsedJson.exchangeRateOnInvoice = Number(parsedJson.exchangeRateOnInvoice) || 0;

    const rateForConversion = parsedJson.exchangeRateOnInvoice > 0 ? parsedJson.exchangeRateOnInvoice : parsedRate;
    const isUSD = parsedJson.currencyDetected === 'USD';

    // Normalize each item to guarantee valid numbers
    parsedJson.items = parsedJson.items.map((it: any) => {
      const qty = Number(it.quantity) > 0 ? Number(it.quantity) : 1;
      let unitCostOrig = Number(it.unitCostOriginal);
      if (isNaN(unitCostOrig) || unitCostOrig < 0) {
        unitCostOrig = Number(it.unitCostUSD) || 0;
      }
      let totCostOrig = Number(it.totalCostOriginal);
      if (isNaN(totCostOrig) || totCostOrig <= 0) {
        totCostOrig = Number((unitCostOrig * qty).toFixed(2));
      }

      let unitUSD = Number(it.unitCostUSD);
      if (isNaN(unitUSD) || unitUSD <= 0) {
        unitUSD = isUSD ? unitCostOrig : Number((unitCostOrig / rateForConversion).toFixed(4));
      }
      let totUSD = Number(it.totalCostUSD);
      if (isNaN(totUSD) || totUSD <= 0) {
        totUSD = Number((unitUSD * qty).toFixed(2));
      }

      return {
        code: String(it.code || '').trim(),
        name: String(it.name || 'Producto').trim(),
        quantity: qty,
        unitCostOriginal: unitCostOrig,
        totalCostOriginal: totCostOrig,
        unitCostUSD: unitUSD,
        totalCostUSD: totUSD,
        category: String(it.category || 'General').trim(),
        unit: String(it.unit || 'ud').trim()
      };
    });

    if (!parsedJson.totalUSD || parsedJson.totalUSD <= 0) {
      parsedJson.totalUSD = Number(parsedJson.items.reduce((acc: number, it: any) => acc + it.totalCostUSD, 0).toFixed(2));
    }
    if (!parsedJson.totalOriginal || parsedJson.totalOriginal <= 0) {
      parsedJson.totalOriginal = Number(parsedJson.items.reduce((acc: number, it: any) => acc + it.totalCostOriginal, 0).toFixed(2));
    }

    return res.json({ success: true, data: parsedJson });
  } catch (error: any) {
    console.error('Invoice scanning error:', error);
    const detailMsg = error?.message || String(error);
    return res.status(500).json({ 
      error: 'Error analizando la factura con IA', 
      details: detailMsg 
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
