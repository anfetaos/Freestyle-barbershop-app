import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  ShoppingBag, 
  Scissors, 
  Search, 
  Minus, 
  Receipt,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft
} from 'lucide-react';
import { AppData, SaleItem, Service, Product, User } from '../types';
import { formatCurrency, cn } from '../utils';
import { api } from '../api';

export default function Sales({ data, onRefresh, user, onBack }: { data: AppData, onRefresh: () => void, user: User, onBack?: () => void }) {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const total = cart.reduce((acc, item) => acc + (item.valor * item.cantidad), 0);

  const filteredServices = data.servicios.filter(s => 
    s.activo && s.nombre.toLowerCase().includes(search.toLowerCase())
  );
  
  const filteredProducts = data.productos.filter(p => 
    p.activo && p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (item: Service | Product, tipo: 'servicio' | 'producto') => {
    const existing = cart.find(c => c.id === item.id && c.tipo === tipo);
    if (existing) {
      setCart(cart.map(c => c.id === item.id && c.tipo === tipo ? { ...c, cantidad: c.cantidad + 1 } : c));
    } else {
      setCart([...cart, { 
        id: item.id, 
        nombre: item.nombre, 
        tipo, 
        valor: tipo === 'producto' ? (item as Product).venta : (item as Service).precio, 
        cantidad: 1,
        comisionable: tipo === 'servicio' // Default: services are commissionable, products not necessarily
      }]);
    }
  };

  const toggleCommission = (id: string, tipo: string) => {
    setCart(cart.map(c => c.id === id && c.tipo === tipo ? { ...c, comisionable: !c.comisionable } : c));
  };

  const removeFromCart = (id: string, tipo: string) => {
    const existing = cart.find(c => c.id === id && c.tipo === tipo);
    if (existing && existing.cantidad > 1) {
      setCart(cart.map(c => c.id === id && c.tipo === tipo ? { ...c, cantidad: c.cantidad - 1 } : c));
    } else {
      setCart(cart.filter(c => !(c.id === id && c.tipo === tipo)));
    }
  };

  const processSale = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      // GAS should handle bulk sales or individual ones. We'll send the cart.
      await api.saveSale({
        items: cart,
        usuario: user.usuario,
        fecha: new Date().toISOString().split('T')[0],
      });
      setCart([]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Catalog */}
      <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
        <div className="glass-card p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Search className="text-muted" size={20} />
            <input 
              type="text" 
              placeholder="Buscar servicios o productos..."
              className="flex-1 bg-transparent border-none outline-none text-txt placeholder:text-muted/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {onBack && (
            <button 
              onClick={onBack}
              className="px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold uppercase text-brand-gold border border-brand-gold/30 rounded-lg hover:bg-brand-gold/10 transition-all flex items-center gap-2"
            >
              <AlertCircle size={14} /> <span className="hidden sm:inline">Volver al Dashboard</span><span className="sm:hidden">Volver</span>
            </button>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
            <Scissors size={16} className="text-brand-blue" /> Servicios
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredServices.map(service => (
              <button 
                key={service.id}
                onClick={() => addToCart(service, 'servicio')}
                className="glass-card p-4 flex items-center justify-between hover:border-brand-blue/30 transition-all group active:scale-95"
              >
                <div className="text-left">
                  <p className="font-bold text-txt group-hover:text-brand-blue transition-colors text-sm">{service.nombre}</p>
                  <p className="text-xs text-muted mt-1">{service.duracion} min</p>
                </div>
                <span className="font-mono text-brand-gold font-bold">{formatCurrency(service.precio)}</span>
              </button>
            ))}
          </div>

          <h3 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2 pt-4">
            <ShoppingBag size={16} className="text-brand-blue2" /> Productos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map(product => (
              <button 
                key={product.id}
                onClick={() => addToCart(product, 'producto')}
                className="glass-card p-4 flex items-center justify-between hover:border-brand-blue2/30 transition-all group active:scale-95"
              >
                <div className="text-left">
                  <p className="font-bold text-txt group-hover:text-brand-blue2 transition-colors text-sm">{product.nombre}</p>
                  <p className={cn("text-[10px] font-bold uppercase mt-1", product.stock < 5 ? "text-danger" : "text-success")}>
                    Stock: {product.stock}
                  </p>
                </div>
                <span className="font-mono text-brand-gold font-bold">{formatCurrency(product.venta)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart / Checkout */}
      <div className="relative order-1 lg:order-2">
        <div className="glass-card lg:sticky lg:top-24 overflow-hidden border-brand-blue/20">
          <div className="bg-brand-blue/10 p-4 border-b border-brand-blue/20 flex items-center justify-between">
            <h3 className="font-bold text-brand-blue flex items-center gap-2">
              <Receipt size={18} /> RESUMEN DE VENTA
            </h3>
            <span className="text-[10px] text-muted font-bold uppercase bg-bg px-2 py-0.5 rounded border border-white/5">
              Ref: {Math.random().toString(36).substr(2, 6).toUpperCase()}
            </span>
          </div>
          
          <div className="p-0 max-h-[400px] overflow-y-auto">
            {cart.length > 0 ? (
              <div className="divide-y divide-white/5">
                {cart.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-txt">{item.nombre}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-muted font-mono">{formatCurrency(item.valor)}</p>
                        <button 
                          onClick={() => toggleCommission(item.id, item.tipo)}
                          className={cn(
                            "text-[8px] px-1.5 py-0.5 rounded border uppercase font-bold transition-all",
                            item.comisionable 
                              ? "bg-brand-blue/10 border-brand-blue/30 text-brand-blue" 
                              : "bg-white/5 border-white/10 text-muted"
                          )}
                        >
                          {item.comisionable ? 'Con Comisión' : 'Sin Comisión'}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => removeFromCart(item.id, item.tipo)}
                        className="w-6 h-6 rounded bg-d3 flex items-center justify-center text-muted hover:text-danger transition-colors"
                      >
                        {item.cantidad > 1 ? <Minus size={14} /> : <Trash2 size={12} />}
                      </button>
                      <span className="text-sm font-bold text-txt w-4 text-center">{item.cantidad}</span>
                      <button 
                        onClick={() => addToCart({ id: item.id, nombre: item.nombre } as any, item.tipo)}
                        className="w-6 h-6 rounded bg-brand-blue/20 text-brand-blue flex items-center justify-center hover:bg-brand-blue/30 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-muted gap-3">
                <ShoppingBag size={40} className="opacity-10" />
                <p className="text-xs uppercase font-bold tracking-widest text-center">Carrito Vacío<br/><span className="font-normal opacity-50 text-[10px]">Agregue servicios o productos</span></p>
              </div>
            )}
          </div>

          <div className="p-6 bg-d1/80 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted text-sm font-medium">Subtotal</span>
              <span className="text-txt font-mono text-sm">{formatCurrency(total)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <span className="text-txt font-bold">TOTAL</span>
                <span className="text-2xl font-bold text-brand-blue neon-text font-mono">
                  {formatCurrency(total)}
                </span>
            </div>

            <button 
              disabled={cart.length === 0 || loading}
              onClick={processSale}
              className="w-full bg-brand-blue hover:bg-brand-blue2 disabled:opacity-50 text-bg font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all neon-border shadow-lg"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : success ? (
                <CheckCircle2 size={24} />
              ) : (
                'REGISTRAR VENTA'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

