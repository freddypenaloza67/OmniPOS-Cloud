import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { 
  Package, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  ArrowUpDown, 
  Download, 
  X, 
  Check, 
  Barcode, 
  DollarSign, 
  Layers,
  SlidersHorizontal
} from 'lucide-react';
import { formatUSD, formatLocal, formatDual } from '../utils/formatters';

export const InventoryView: React.FC = () => {
  const { state, addProduct, updateProduct, deleteProduct, adjustStock } = useStore();
  const rate = state.settings.exchangeRate;
  const currSymbol = state.settings.secondaryCurrency.symbol;
  const currCode = state.settings.secondaryCurrency.code;

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modals
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Reposición física');

  // New product form
  const [newProd, setNewProd] = useState<Omit<Product, 'id'>>({
    name: '',
    sku: '',
    barcode: '',
    category: 'Víveres',
    costUSD: 1.0,
    priceUSD: 1.5,
    stock: 10,
    minStock: 5,
    unit: 'ud',
    description: ''
  });

  const categories = useMemo(() => {
    const s = new Set<string>();
    state.products.forEach(p => {
      if (p.category) s.add(p.category);
    });
    return ['Todos', ...Array.from(s)];
  }, [state.products]);

  const filteredProducts = useMemo(() => {
    return state.products.filter(p => {
      const matchSearch = 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.includes(search));
      const matchCat = selectedCategory === 'Todos' || p.category === selectedCategory;
      const matchStock = 
        stockFilter === 'all' ||
        (stockFilter === 'out' && p.stock <= 0) ||
        (stockFilter === 'low' && p.stock > 0 && p.stock <= p.minStock);
      return matchSearch && matchCat && matchStock;
    });
  }, [state.products, search, selectedCategory, stockFilter]);

  const totalInventoryCost = useMemo(() => {
    return state.products.reduce((acc, p) => acc + (p.costUSD * p.stock), 0);
  }, [state.products]);

  const totalInventoryRetail = useMemo(() => {
    return state.products.reduce((acc, p) => acc + (p.priceUSD * p.stock), 0);
  }, [state.products]);

  // Handle Save New Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name.trim()) return;

    const skuToUse = newProd.sku.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
    await addProduct({
      ...newProd,
      sku: skuToUse
    });

    setIsAddModalOpen(false);
    setNewProd({
      name: '',
      sku: '',
      barcode: '',
      category: 'Víveres',
      costUSD: 1.0,
      priceUSD: 1.5,
      stock: 10,
      minStock: 5,
      unit: 'ud',
      description: ''
    });
  };

  // Handle Update Product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    await updateProduct(editingProduct);
    setEditingProduct(null);
  };

  // Handle Stock Adjustment
  const handleSaveStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || adjustDelta === 0) return;
    await adjustStock(adjustingProduct.id, adjustDelta, adjustReason);
    setAdjustingProduct(null);
    setAdjustDelta(0);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Nombre', 'SKU', 'Codigo Barras', 'Categoria', 'Costo USD', 'Precio USD', 'Precio Local', 'Stock', 'Min Stock', 'Unidad'];
    const rows = state.products.map(p => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.sku,
      p.barcode || '',
      p.category,
      p.costUSD.toFixed(2),
      p.priceUSD.toFixed(2),
      (p.priceUSD * rate).toFixed(2),
      p.stock,
      p.minStock,
      p.unit
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventario-omnipos-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Valuation & Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Valor Total en Costo (Almacén)
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {formatUSD(totalInventoryCost)}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">
              {formatLocal(totalInventoryCost * rate, currSymbol, currCode)}
            </div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Valor Proyectado en Venta
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-1">
              {formatUSD(totalInventoryRetail)}
            </div>
            <div className="text-xs font-semibold text-emerald-700 mt-0.5">
              {formatLocal(totalInventoryRetail * rate, currSymbol, currCode)}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Catálogo de Productos
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {state.products.length} <span className="text-sm font-normal text-slate-400">referencias</span>
            </div>
            <div className="text-xs text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{state.products.filter(p => p.stock <= p.minStock).length} con stock bajo o agotado</span>
            </div>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Category, Filter, Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, código de barras o SKU..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Stock status filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                stockFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({state.products.length})
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                stockFilter === 'low' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Stock Bajo ({state.products.filter(p => p.stock > 0 && p.stock <= p.minStock).length})
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                stockFilter === 'out' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              Agotados ({state.products.filter(p => p.stock <= 0).length})
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
          </div>

        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat 
                  ? 'bg-emerald-100 text-emerald-900 font-bold' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Producto & Código</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5 text-right">Costo ($)</th>
                <th className="p-3.5 text-right">Precio Venta ($)</th>
                <th className="p-3.5 text-right">Precio ({currCode})</th>
                <th className="p-3.5 text-center">Margen %</th>
                <th className="p-3.5 text-center">Stock</th>
                <th className="p-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(p => {
                const marginPercent = p.priceUSD > 0 
                  ? Math.round(((p.priceUSD - p.costUSD) / p.priceUSD) * 100) 
                  : 0;
                const isOut = p.stock <= 0;
                const isLow = p.stock > 0 && p.stock <= p.minStock;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>SKU: {p.sku}</span>
                        {p.barcode && <span>• Barcode: {p.barcode}</span>}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium">
                        {p.category}
                      </span>
                    </td>

                    <td className="p-3.5 text-right font-medium text-slate-600">
                      {formatUSD(p.costUSD)}
                    </td>

                    <td className="p-3.5 text-right font-extrabold text-slate-900 text-sm">
                      {formatUSD(p.priceUSD)}
                    </td>

                    <td className="p-3.5 text-right font-bold text-emerald-700">
                      {formatLocal(p.priceUSD * rate, currSymbol, currCode)}
                    </td>

                    <td className="p-3.5 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        marginPercent >= 30 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
                      }`}>
                        {marginPercent}%
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          isOut 
                            ? 'bg-rose-100 text-rose-800' 
                            : isLow 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {p.stock} {p.unit}
                        </span>
                        {isLow && (
                          <span className="text-[9px] text-amber-600 font-semibold mt-0.5">
                            Mínimo: {p.minStock}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setAdjustingProduct(p);
                            setAdjustDelta(0);
                          }}
                          title="Ajustar Stock (+/-)"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingProduct(p)}
                          title="Editar Producto"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar producto "${p.name}"?`)) {
                              deleteProduct(p.id);
                            }
                          }}
                          title="Eliminar"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h4 className="font-bold text-base">Registrar Nuevo Producto</h4>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Harina de Trigo 1kg"
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Categoría</label>
                  <input
                    type="text"
                    required
                    value={newProd.category}
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Unidad de Medida</label>
                  <select
                    value={newProd.unit}
                    onChange={(e) => setNewProd({ ...newProd, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  >
                    <option value="ud">Unidad (ud)</option>
                    <option value="kg">Kilogramo (kg)</option>
                    <option value="lt">Litro (lt)</option>
                    <option value="paq">Paquete (paq)</option>
                    <option value="cja">Caja (cja)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Código SKU</label>
                  <input
                    type="text"
                    placeholder="Auto o manual"
                    value={newProd.sku}
                    onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Código de Barras</label>
                  <input
                    type="text"
                    placeholder="759..."
                    value={newProd.barcode}
                    onChange={(e) => setNewProd({ ...newProd, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <div>
                  <label className="block text-emerald-950 font-bold uppercase mb-1">Costo Unitario ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newProd.costUSD}
                    onChange={(e) => setNewProd({ ...newProd, costUSD: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-emerald-950 font-bold uppercase mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newProd.priceUSD}
                    onChange={(e) => setNewProd({ ...newProd, priceUSD: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700"
                  />
                  <span className="text-[10px] text-emerald-800 block mt-1">
                    Equivale a: {formatLocal((newProd.priceUSD || 0) * rate, currSymbol, currCode)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newProd.stock}
                    onChange={(e) => setNewProd({ ...newProd, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Stock Mínimo (Alerta)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProd.minStock}
                    onChange={(e) => setNewProd({ ...newProd, minStock: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h4 className="font-bold text-base">Editar Producto</h4>
              <button onClick={() => setEditingProduct(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Categoría</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Código de Barras</label>
                  <input
                    type="text"
                    value={editingProduct.barcode || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Costo Unitario ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editingProduct.costUSD}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costUSD: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editingProduct.priceUSD}
                    onChange={(e) => setEditingProduct({ ...editingProduct, priceUSD: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-emerald-700"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Equivale a: {formatLocal(editingProduct.priceUSD * rate, currSymbol, currCode)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Stock Actual</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingProduct.minStock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minStock: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h4 className="font-bold text-base">Ajuste de Stock</h4>
                <p className="text-xs text-slate-400">{adjustingProduct.name}</p>
              </div>
              <button onClick={() => setAdjustingProduct(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjust} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Stock Actual en Sistema:</span>
                <span className="font-bold text-sm text-slate-900">{adjustingProduct.stock} {adjustingProduct.unit}</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">
                  Cantidad a Ajustar (+ para agregar, - para restar)
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ej: 5 o -2"
                  value={adjustDelta || ''}
                  onChange={(e) => setAdjustDelta(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-800"
                />
                <span className="text-[11px] text-slate-500 block mt-1">
                  Stock resultante: <strong className="text-emerald-700">{Math.max(0, adjustingProduct.stock + adjustDelta)} {adjustingProduct.unit}</strong>
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Motivo del Ajuste</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                >
                  <option value="Reposición física">Reposición física / Conteo de almacén</option>
                  <option value="Merma o producto dañado">Merma o producto dañado</option>
                  <option value="Devolución de cliente">Devolución de cliente</option>
                  <option value="Consumo interno">Consumo interno / Muestra</option>
                  <option value="Corrección de inventario">Corrección de inventario</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adjustDelta === 0}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl font-bold"
                >
                  Aplicar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
