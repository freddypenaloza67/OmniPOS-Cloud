import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Supplier } from '../types';
import { Truck, Search, Plus, Edit3, Phone, Mail, MapPin, FileText, X, Check, DollarSign } from 'lucide-react';
import { formatUSD, formatLocal } from '../utils/formatters';

export const SuppliersView: React.FC = () => {
  const { state, addSupplier, updateSupplier } = useStore();
  const rate = state.settings.exchangeRate;
  const currSymbol = state.settings.secondaryCurrency.symbol;
  const currCode = state.settings.secondaryCurrency.code;

  const [search, setSearch] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newSup, setNewSup] = useState<Omit<Supplier, 'id'>>({
    name: '',
    taxId: '',
    phone: '',
    email: '',
    address: '',
    paymentTerms: 'Contado',
    notes: ''
  });

  const filteredSuppliers = state.suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.taxId.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSup.name.trim()) return;
    await addSupplier(newSup);
    setIsAddModalOpen(false);
    setNewSup({
      name: '',
      taxId: '',
      phone: '',
      email: '',
      address: '',
      paymentTerms: 'Contado',
      notes: ''
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    await updateSupplier(editingSupplier);
    setEditingSupplier(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-emerald-600" />
            <span>Directorio de Proveedores</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestiona los distribuidores y fabricantes de mercancía para tu negocio.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Proveedor</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar proveedor por razón social, nombre o RIF/NIT..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map(sup => {
          const supplierPurchases = state.purchases.filter(p => p.supplierId === sup.id || p.supplierName.toLowerCase() === sup.name.toLowerCase());
          const totalBought = supplierPurchases.reduce((acc, p) => acc + p.totalUSD, 0);

          return (
            <div 
              key={sup.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-tight">{sup.name}</h3>
                    <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded mt-1 inline-block">
                      {sup.taxId || 'Sin RIF/NIT'}
                    </span>
                  </div>
                  <button
                    onClick={() => setEditingSupplier(sup)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 mt-4 text-xs text-slate-600">
                  {sup.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{sup.phone}</span>
                    </div>
                  )}
                  {sup.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{sup.email}</span>
                    </div>
                  )}
                  {sup.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{sup.address}</span>
                    </div>
                  )}
                  {sup.paymentTerms && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-slate-500">
                      <span className="font-semibold text-slate-700">Términos:</span>
                      <span>{sup.paymentTerms}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Purchase History Summary Card */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Total comprado:</span>
                  <span className="font-black text-slate-900">{formatUSD(totalBought)}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {formatLocal(totalBought * rate, currSymbol, currCode)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Facturas:</span>
                  <span className="font-bold text-slate-800">{supplierPurchases.length} compras</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h4 className="font-bold text-base">Registrar Proveedor</h4>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Nombre o Empresa</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Distribuidora Nacional C.A."
                  value={newSup.name}
                  onChange={(e) => setNewSup({ ...newSup, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">RIF / NIT / RFC</label>
                  <input
                    type="text"
                    required
                    placeholder="J-12345678-0"
                    value={newSup.taxId}
                    onChange={(e) => setNewSup({ ...newSup, taxId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="+58 414..."
                    value={newSup.phone}
                    onChange={(e) => setNewSup({ ...newSup, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Email</label>
                <input
                  type="email"
                  placeholder="ventas@proveedor.com"
                  value={newSup.email}
                  onChange={(e) => setNewSup({ ...newSup, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Dirección / Galpón</label>
                <input
                  type="text"
                  placeholder="Zona Industrial..."
                  value={newSup.address}
                  onChange={(e) => setNewSup({ ...newSup, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Condiciones de Pago</label>
                <input
                  type="text"
                  placeholder="Ej: Contado o Crédito 15 días"
                  value={newSup.paymentTerms}
                  onChange={(e) => setNewSup({ ...newSup, paymentTerms: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
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
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h4 className="font-bold text-base">Editar Proveedor</h4>
              <button onClick={() => setEditingSupplier(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Razón Social</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.name}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">RIF / NIT</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.taxId}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, taxId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={editingSupplier.phone}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={editingSupplier.email}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Dirección</label>
                <input
                  type="text"
                  value={editingSupplier.address}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Condiciones</label>
                <input
                  type="text"
                  value={editingSupplier.paymentTerms}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, paymentTerms: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
