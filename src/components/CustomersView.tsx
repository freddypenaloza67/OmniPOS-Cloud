import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Customer, Sale } from '../types';
import { Users, Search, Plus, Edit3, DollarSign, Check, X, Phone, Mail, MapPin, AlertCircle, Coins, Receipt } from 'lucide-react';
import { formatUSD, formatLocal, formatDual } from '../utils/formatters';
import { CustomerAbonoModal } from './CustomerAbonoModal';
import { ReceiptModal } from './ReceiptModal';

export const CustomersView: React.FC = () => {
  const { state, addCustomer, updateCustomer } = useStore();
  const rate = state.settings.exchangeRate;
  const currSymbol = state.settings.secondaryCurrency.symbol;
  const currCode = state.settings.secondaryCurrency.code;

  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [completedAbonoSale, setCompletedAbonoSale] = useState<Sale | null>(null);

  const [newCust, setNewCust] = useState<Omit<Customer, 'id'>>({
    name: '',
    taxId: '',
    phone: '',
    email: '',
    address: '',
    creditLimitUSD: 100,
    currentDebtUSD: 0,
    notes: ''
  });

  const filteredCustomers = useMemo(() => {
    return state.customers.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.taxId.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    );
  }, [state.customers, search]);

  const totalReceivables = useMemo(() => {
    return state.customers.reduce((acc, c) => acc + c.currentDebtUSD, 0);
  }, [state.customers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name.trim()) return;
    await addCustomer(newCust);
    setIsAddModalOpen(false);
    setNewCust({
      name: '',
      taxId: '',
      phone: '',
      email: '',
      address: '',
      creditLimitUSD: 100,
      currentDebtUSD: 0,
      notes: ''
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    await updateCustomer(editingCustomer);
    setEditingCustomer(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* KPI Receivables Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 bg-gradient-to-r from-rose-900 to-rose-950 p-5 rounded-2xl text-white shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-200 uppercase tracking-wider block">
              Cuentas por Cobrar Totales (Créditos / Fiados)
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {formatUSD(totalReceivables)}
            </div>
            <div className="text-xs font-semibold text-rose-200 mt-1">
              {formatLocal(totalReceivables * rate, currSymbol, currCode)} (A la tasa del día)
            </div>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl">
            <DollarSign className="w-8 h-8 text-rose-300" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Clientes con Saldo Pendiente
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {state.customers.filter(c => c.currentDebtUSD > 0).length} clientes
            </div>
            <p className="text-xs text-slate-400 mt-0.5">De un total de {state.customers.length} registrados</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cédula / RIF o teléfono..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Cliente</th>
                <th className="p-3.5">Documento / ID</th>
                <th className="p-3.5">Contacto</th>
                <th className="p-3.5 text-right">Límite Crédito</th>
                <th className="p-3.5 text-right">Deuda Actual ($)</th>
                <th className="p-3.5 text-right">Deuda ({currCode})</th>
                <th className="p-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(cust => {
                const hasDebt = cust.currentDebtUSD > 0;
                return (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 text-sm">{cust.name}</div>
                      {cust.notes && <div className="text-[11px] text-slate-400 mt-0.5">{cust.notes}</div>}
                    </td>

                    <td className="p-3.5 font-mono text-slate-700 font-semibold">
                      {cust.taxId || 'N/A'}
                    </td>

                    <td className="p-3.5 text-slate-600">
                      <div>{cust.phone}</div>
                      {cust.email && <div className="text-[11px] text-slate-400">{cust.email}</div>}
                    </td>

                    <td className="p-3.5 text-right font-medium text-slate-600">
                      {formatUSD(cust.creditLimitUSD)}
                    </td>

                    <td className="p-3.5 text-right">
                      <span className={`font-black text-sm ${hasDebt ? 'text-rose-600' : 'text-slate-400'}`}>
                        {formatUSD(cust.currentDebtUSD)}
                      </span>
                    </td>

                    <td className="p-3.5 text-right font-bold text-slate-700">
                      {formatLocal(cust.currentDebtUSD * rate, currSymbol, currCode)}
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {hasDebt && (
                          <button
                            onClick={() => setPayingCustomer(cust)}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg font-bold transition-all text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Registrar abono de fiado con pago mixto"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>Abonar</span>
                          </button>
                        )}
                        <button
                          onClick={() => setEditingCustomer(cust)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
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

      {/* Modal de Abono de Fiado con Pago Mixto, Referencias y Bancos */}
      <CustomerAbonoModal
        customer={payingCustomer}
        isOpen={Boolean(payingCustomer)}
        onClose={() => setPayingCustomer(null)}
        onAbonoCompleted={(sale) => setCompletedAbonoSale(sale)}
      />

      {/* Modal de Comprobante / Ticket Térmico tras Registrar Abono */}
      <ReceiptModal
        sale={completedAbonoSale}
        isOpen={Boolean(completedAbonoSale)}
        onClose={() => setCompletedAbonoSale(null)}
      />

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h4 className="font-bold text-base">Registrar Nuevo Cliente</h4>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Nombre Completo o Empresa</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez o Restaurante Criollo"
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Cédula / RIF / NIT</label>
                  <input
                    type="text"
                    required
                    placeholder="V-18765432 o J-..."
                    value={newCust.taxId}
                    onChange={(e) => setNewCust({ ...newCust, taxId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="+58 412..."
                    value={newCust.phone}
                    onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Límite de Crédito Autorizado ($)</label>
                <input
                  type="number"
                  min="0"
                  value={newCust.creditLimitUSD}
                  onChange={(e) => setNewCust({ ...newCust, creditLimitUSD: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Monto máximo que el cliente puede tener en cuentas por cobrar / fiado.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Dirección</label>
                <input
                  type="text"
                  placeholder="Urbanización o sector..."
                  value={newCust.address}
                  onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
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
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h4 className="font-bold text-base">Editar Cliente</h4>
              <button onClick={() => setEditingCustomer(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Doc / RIF</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.taxId}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, taxId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Límite de Crédito ($)</label>
                <input
                  type="number"
                  min="0"
                  value={editingCustomer.creditLimitUSD}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, creditLimitUSD: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Dirección</label>
                <input
                  type="text"
                  value={editingCustomer.address}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
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
