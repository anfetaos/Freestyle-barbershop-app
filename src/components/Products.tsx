import React, { useState } from 'react';
import { Plus, Edit2, Package, Search, Loader2, AlertCircle } from 'lucide-react';
import { AppData, Product } from '../types';
import { api } from '../api';
import { formatCurrency, cn } from '../utils';
import { motion } from 'motion/react';

export default function Products({ data, onRefresh, isAdmin }: { data: AppData, onRefresh: () => void, isAdmin: boolean }) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<Product>>({
    nombre: '',
    categoria: '',
    costo: 0,
    venta: 0,
    stock: 0,
    activo: true
  });

  const filtered = data.productos.filter(p => 
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria.toLowerCase().includes(search.toLowerCase())
  );

  const openForm = (product?: Product) => {
    if (product) {
      setSelectedProduct(product);
      setFormData(product);
    } else {
      setSelectedProduct(null);
      setFormData({
        nombre: '',
        categoria: '',
        costo: 0,
        venta: 0,
        stock: 0,
        activo: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (selectedProduct) {
        await api.editProduct(selectedProduct.id, formData);
      } else {
        await api.saveProduct(formData);
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="glass-card flex-1 px-4 py-2 flex items-center gap-3">
          <Search className="text-muted" size={18} />
          <input 
            type="text" 
            placeholder="Buscar productos..."
            className="bg-transparent border-none outline-none text-txt text-sm w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isAdmin && (
          <button 
            onClick={() => openForm()}
            className="bg-brand-blue hover:bg-brand-blue2 text-bg px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg neon-border"
          >
            <Plus size={18} /> AGREGAR PRODUCTO
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(product => (
          <div key={product.id} className="glass-card overflow-hidden group">
            <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
              <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
                <Package size={20} />
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                product.stock < 5 ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
              )}>
                {product.stock} EN STOCK
              </div>
            </div>
            
            <div className="p-5">
              <h4 className="text-muted text-[10px] uppercase font-bold tracking-widest mb-1">{product.categoria}</h4>
              <p className="text-lg font-bold text-txt mb-4 truncate">{product.nombre}</p>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted uppercase font-bold">P. Venta</p>
                  <p className="text-xl font-mono font-bold text-brand-gold">{formatCurrency(product.venta)}</p>
                </div>
                {isAdmin && (
                   <button 
                    onClick={() => openForm(product)}
                    className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-brand-blue transition-all"
                   >
                     <Edit2 size={16} />
                   </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted glass-card gap-4 opacity-50">
             <Package size={64} strokeWidth={1} />
             <p className="text-sm font-bold uppercase tracking-widest">No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-d2 border border-white/10 rounded-2xl p-8 relative z-10"
          >
            <h2 className="text-xl font-bold text-txt mb-6 text-center uppercase tracking-widest">
              {selectedProduct ? 'EDITAR PRODUCTO' : 'NUEVO PRODUCTO'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs uppercase font-bold text-muted mb-2">Nombre</label>
                  <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt outline-none focus:border-brand-blue" />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-muted mb-2">Categoría</label>
                  <input type="text" required value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt outline-none focus:border-brand-blue" />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-muted mb-2">Stock Inicial</label>
                  <input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt outline-none focus:border-brand-blue" />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-muted mb-2">Costo</label>
                  <input type="number" required value={formData.costo} onChange={e => setFormData({...formData, costo: parseFloat(e.target.value)})} className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt outline-none focus:border-brand-blue" />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-muted mb-2">Venta</label>
                  <input type="number" required value={formData.venta} onChange={e => setFormData({...formData, venta: parseFloat(e.target.value)})} className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt outline-none focus:border-brand-blue" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={formData.activo} onChange={e => setFormData({...formData, activo: e.target.checked})} className="w-4 h-4 rounded bg-bg border-white/10 text-brand-blue" />
                <label htmlFor="active" className="text-xs uppercase font-bold text-muted">Producto Activo</label>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 text-muted border border-white/10 rounded-xl font-bold hover:bg-white/5">CANCELAR</button>
                <button type="submit" disabled={loading} className="flex-1 bg-brand-blue text-bg px-4 py-3 rounded-xl font-bold shadow-lg hover:bg-brand-blue2 flex items-center justify-center gap-2">
                   {loading ? <Loader2 size={20} className="animate-spin" /> : 'GUARDAR'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
