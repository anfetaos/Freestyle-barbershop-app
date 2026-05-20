import React, { useState } from 'react';
import { 
  TrendingUp, 
  Scissors, 
  ShoppingBag, 
  Wallet, 
  Users, 
  Loader2, 
  CheckCircle2, 
  ArrowUpRight,
  Sparkles,
  Calendar
} from 'lucide-react';
import { AppData, User } from '../types';
import { formatCurrency, cn } from '../utils';
import { api } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function Reports({ 
  data, 
  user, 
  onRefresh 
}: { 
  data: AppData; 
  user: User; 
  onRefresh?: () => void; 
}) {
  const [filter, setFilter] = useState('semana'); // Default to 'semana'
  const [payingUser, setPayingUser] = useState<string | null>(null);

  const getLocalDateString = (d: Date = new Date()) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getLocalDateString(d);
  });

  const [endDate, setEndDate] = useState<string>(() => {
    return getLocalDateString();
  });

  const isOwner = user.role === 'owner';

  // String-based safe local timezone date comparison
  const getFilteredSales = () => {
    let sales = data.ventas;
    
    // Non-owner only sees their sales
    if (!isOwner) {
      sales = sales.filter(v => 
        v.usuario?.toLowerCase().trim() === user.usuario?.toLowerCase().trim() ||
        v.usuario?.toLowerCase().trim() === user.nombre?.toLowerCase().trim()
      );
    }

    const todayStr = getLocalDateString();

    if (filter === 'hoy') {
      return sales.filter(v => v.fecha === todayStr);
    }
    
    if (filter === 'semana') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const limit = getLocalDateString(d);
      return sales.filter(v => v.fecha >= limit);
    }
    
    if (filter === 'mes') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const limit = getLocalDateString(d);
      return sales.filter(v => v.fecha >= limit);
    }
    
    if (filter === 'rango') {
      return sales.filter(v => {
        if (!startDate) return true;
        if (!endDate) return v.fecha >= startDate;
        return v.fecha >= startDate && v.fecha <= endDate;
      });
    }
    
    return sales; // historico (all)
  };

  const filteredSales = getFilteredSales();
  const totalSales = filteredSales.reduce((acc, v) => acc + (v.valor * v.cantidad), 0);
  const serviceSales = filteredSales.filter(v => v.tipo === 'servicio').reduce((acc, v) => acc + (v.valor * v.cantidad), 0);
  const productSales = filteredSales.filter(v => v.tipo === 'producto').reduce((acc, v) => acc + (v.valor * v.cantidad), 0);
  
  const getFilteredExpenses = () => {
    const expenses = data.gastos;
    const todayStr = getLocalDateString();

    if (filter === 'hoy') {
      return expenses.filter(g => g.fecha === todayStr);
    }
    
    if (filter === 'semana') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const limit = getLocalDateString(d);
      return expenses.filter(g => g.fecha >= limit);
    }
    
    if (filter === 'mes') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const limit = getLocalDateString(d);
      return expenses.filter(g => g.fecha >= limit);
    }
    
    if (filter === 'rango') {
      return expenses.filter(g => {
        if (!startDate) return true;
        if (!endDate) return g.fecha >= startDate;
        return g.fecha >= startDate && g.fecha <= endDate;
      });
    }
    
    return expenses; // historico
  };

  const expenses = getFilteredExpenses();
  const totalExpenses = expenses.reduce((acc, g) => acc + g.monto, 0);

  // Robust payout, commission earned vs already paid in the filtered range
  const getBarberPayouts = () => {
    const payouts: Record<string, { username: string, name: string, totalSales: number, commissionEarned: number, commissionPaid: number, pending: number }> = {};
    
    // Initialize with active barbers
    data.usuarios
      .filter(u => u.role === 'barber' || u.role === 'barbero')
      .forEach(u => {
        payouts[u.usuario] = {
          username: u.usuario,
          name: u.nombre,
          totalSales: 0,
          commissionEarned: 0,
          commissionPaid: 0,
          pending: 0
        };
      });

    // Calculate commission earned in the selected period
    filteredSales.forEach(v => {
      if (v.tipo === 'servicio' || v.comisionable) {
        const u = data.usuarios.find(user => 
          user.usuario?.toLowerCase().trim() === v.usuario?.toLowerCase().trim() ||
          user.nombre?.toLowerCase().trim() === v.usuario?.toLowerCase().trim()
        );
        if (u && payouts[u.usuario]) {
          const saleValue = v.valor * v.cantidad;
          payouts[u.usuario].totalSales += saleValue;
          payouts[u.usuario].commissionEarned += (saleValue * (u.porcentaje / 100));
        }
      }
    });

    // Calculate payouts already registered as a Gasto of category 'Comisión' inside the filtered range
    const periodExpenses = getFilteredExpenses();
    periodExpenses.forEach(g => {
      const isComisionGasto = g.categoria?.toLowerCase?.().trim?.() === 'comisión' || g.categoria === 'Comisión';
      if (isComisionGasto) {
        // Find which barber u was paid
        const u = data.usuarios.find(user => 
          user.usuario?.toLowerCase().trim() === g.usuario?.toLowerCase().trim() ||
          user.nombre?.toLowerCase().trim() === g.usuario?.toLowerCase().trim() ||
          g.descripcion?.toLowerCase().includes(user.nombre?.toLowerCase().trim()) ||
          g.descripcion?.toLowerCase().includes(user.usuario?.toLowerCase().trim())
        );
        if (u && payouts[u.usuario]) {
          payouts[u.usuario].commissionPaid += Number(g.monto || 0);
        }
      }
    });

    // Calculate remaining pending balance
    Object.keys(payouts).forEach(key => {
      payouts[key].pending = Math.max(0, payouts[key].commissionEarned - payouts[key].commissionPaid);
    });

    return Object.values(payouts);
  };

  const barberPayouts = getBarberPayouts();
  const totalBarberCommissions = barberPayouts.reduce((acc, p) => acc + p.commissionEarned, 0);
  const netOperatingProfit = totalSales - totalExpenses - totalBarberCommissions;

  // Handle registering commission payment as an official Gasto
  const handlePayCommission = async (payout: any) => {
    if (!onRefresh) return;
    const confirmMessage = `¿Registrar pago de comisión para ${payout.name}?\n\n` +
      `Monto del pago: ${formatCurrency(payout.pending)}\n` +
      `Periodo seleccionado: ${filter === 'rango' ? `${startDate} al ${endDate}` : filter.toUpperCase()}`;
    
    if (!window.confirm(confirmMessage)) return;

    setPayingUser(payout.username);
    try {
      const todayStr = getLocalDateString();
      const rangeLabel = filter === 'rango' 
        ? `${startDate} al ${endDate}` 
        : filter === 'hoy' 
          ? todayStr 
          : filter === 'semana' 
            ? 'Últimos 7 días' 
            : filter === 'mes' 
              ? 'Último mes' 
              : 'Histórico';

      const expense = {
        fecha: todayStr,
        categoria: 'Comisión',
        descripcion: `Pago Comisión - ${payout.name} (Periodo: ${rangeLabel})`,
        monto: payout.pending,
        usuario: payout.username
      };

      await api.saveExpense(expense);
      onRefresh(); // reload standard dashboard / reports metrics immediately 
    } catch (err: any) {
      console.error(err);
      alert('Error registrando pago: ' + (err.message || err));
    } finally {
      setPayingUser(null);
    }
  };

  const distributionData = [
    { name: 'Servicios', value: serviceSales, color: '#3ea6ff' },
    { name: 'Productos', value: productSales, color: '#66c3ff' }
  ];

  // Dynamic owners (socios profile lists)
  const owners = data.usuarios.filter(u => u.role === 'owner');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-2 border-b border-d3/30">
        <div>
          <h2 className="text-xl font-black text-txt tracking-tighter uppercase flex items-center gap-2.5">
            <TrendingUp className="text-brand-blue" /> Análisis de Negocio
          </h2>
          <p className="text-xs text-muted font-medium mt-0.5">
            Administra ingresos, gastos directos, comisiones y utilidades del salón
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-d1 p-1 rounded-xl border border-d3 scale-95 sm:scale-100 origin-left">
          {['hoy', 'semana', 'mes', 'rango', 'historico'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all",
                filter === f ? "bg-brand-blue text-bg shadow-lg font-black" : "text-muted hover:text-txt"
              )}
            >
              {f === 'rango' ? 'Calendario' : f === 'historico' ? 'Histórico' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Rango de Fechas Selector (Visible if custom range selected) */}
      {filter === 'rango' && (
        <div className="bg-d1 border border-d3 p-5 rounded-2xl flex flex-wrap items-center gap-6 shadow-inner animate-fade-in">
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-brand-blue flex items-center gap-1">
              <Calendar size={10} /> Desde Fecha:
            </span>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-bg border border-d3 text-txt text-xs font-bold rounded-lg px-4 py-2.5 outline-none focus:border-brand-blue cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-brand-blue flex items-center gap-1">
              <Calendar size={10} /> Hasta Fecha:
            </span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-bg border border-d3 text-txt text-xs font-bold rounded-lg px-4 py-2.5 outline-none focus:border-brand-blue cursor-pointer"
            />
          </div>
          <div className="flex flex-col justify-end h-full pt-4 md:pt-0">
            <span className="text-[10px] font-bold text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-4 py-2.5 rounded-xl">
              Rango Activo: {filteredSales.length} transacciones cobradas
            </span>
          </div>
        </div>
      )}

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-d1 border-l-4 border-l-brand-blue border border-d3 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-lg">
              <TrendingUp size={16} />
            </div>
            <span className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Ingresos Brutos</span>
          </div>
          <p className="text-2xl font-black text-txt font-mono">{formatCurrency(totalSales)}</p>
          <p className="text-[9px] text-muted font-bold mt-1.5 uppercase">Servicios + Productos</p>
        </div>

        <div className="bg-d1 border-l-4 border-l-danger border border-d3 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-danger/10 text-danger rounded-lg">
              <Wallet size={16} />
            </div>
            <span className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Gastos Directos</span>
          </div>
          <p className="text-2xl font-black text-txt font-mono">{formatCurrency(totalExpenses)}</p>
          <p className="text-[9px] text-muted font-bold mt-1.5 uppercase">Insumos y Operativos registrados</p>
        </div>

        <div className="bg-d1 border-l-4 border-l-success border border-d3 rounded-xl p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-success/10 text-success rounded-lg">
              <ArrowUpRight size={16} />
            </div>
            <span className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Utilidad Operativa</span>
          </div>
          <p className="text-2xl font-black text-txt font-mono">{formatCurrency(netOperatingProfit)}</p>
          <p className="text-[9px] text-muted font-bold mt-1.5 uppercase">Fórmula: Ventas - Gastos - Comisiones</p>
        </div>
      </div>

      {isOwner && (
        <div className="bg-d1 border border-d3 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-d3/50 pb-4">
            <div>
              <h3 className="text-sm font-black text-txt uppercase tracking-widest">
                Distribución y Pago de Comisiones ({filter})
              </h3>
              <p className="text-[10px] text-muted font-semibold mt-0.5 uppercase tracking-wide">
                Calcula comisiones devengadas contra comisiones liquidadas reales por barberos
              </p>
            </div>
            {filter === 'rango' && (
              <span className="text-[9px] text-brand-gold font-bold bg-brand-gold/10 px-2.5 py-1.5 rounded-lg border border-brand-gold/20 font-mono">
                {startDate} / {endDate}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-brand-blue uppercase flex items-center gap-2">
                <Users size={14} /> Detalle de Liquidaciones Barberos
              </h4>
              <div className="space-y-3">
                {barberPayouts.map((p, i) => (
                  <div key={i} className="flex flex-col p-4 bg-d2 border border-d3 rounded-xl space-y-3 shadow-inner">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-black text-txt uppercase tracking-tight">{p.name}</p>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-wider mt-0.5">Ventas totales: {formatCurrency(p.totalSales)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-muted uppercase font-bold tracking-widest">Total Ganado</p>
                        <p className="text-sm font-black text-brand-blue font-mono">{formatCurrency(p.commissionEarned)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-bg/50 p-2.5 rounded-lg border border-d3/40 text-[10px] font-bold">
                      <div>
                        <span className="text-muted block uppercase text-[8px] tracking-wider">Ya Pagado:</span>
                        <span className="text-txt font-mono">{formatCurrency(p.commissionPaid)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted block uppercase text-[8px] tracking-wider">Pendiente:</span>
                        <span className={cn("font-mono", p.pending > 0 ? "text-brand-gold" : "text-success")}>
                          {formatCurrency(p.pending)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      {p.pending > 0 ? (
                        <button
                          onClick={() => handlePayCommission(p)}
                          disabled={payingUser === p.username}
                          className="w-full bg-brand-blue hover:bg-brand-blue2 disabled:opacity-50 text-bg py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/10 border border-brand-blue/20"
                        >
                          {payingUser === p.username ? (
                            <>
                              <Loader2 className="animate-spin" size={12} />
                              Procesando Pago...
                            </>
                          ) : (
                            <>
                              💳 Pagar Comisión Pendiente ({formatCurrency(p.pending)})
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="w-full bg-success/10 border border-success/20 text-success text-[9px] font-black uppercase text-center py-2 rounded-lg flex items-center justify-center gap-1.5">
                          <CheckCircle2 size={11} /> Comisión Liquidada y Pagada
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {barberPayouts.length === 0 && (
                  <p className="text-xs text-muted italic p-4 text-center border border-dashed border-d3 rounded-xl bg-d2/50">
                    No hay barberos registrados o activos.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <h4 className="text-xs font-bold text-brand-gold uppercase flex items-center gap-1.5">
                <Sparkles size={14} className="text-brand-gold" /> Distribución de Utilidad
              </h4>
              <div className="flex items-center justify-between p-5 bg-brand-gold/5 rounded-2xl border border-brand-gold/20">
                <div>
                  <p className="text-sm font-black text-txt uppercase tracking-tight">Utilidad Neta</p>
                  <p className="text-[10px] text-muted font-semibold uppercase mt-0.5">(Ventas - Gastos - Comisiones)</p>
                </div>
                <span className="text-xl font-mono font-black text-brand-gold">{formatCurrency(netOperatingProfit)}</span>
              </div>
              <div className="p-5 bg-d2 border border-d3 rounded-xl space-y-4">
                <p className="text-[9px] text-muted uppercase font-black tracking-widest border-b border-d3/50 pb-2">
                  Reparto Equitativo Socios (Propietarios)
                </p>
                
                {owners.length > 0 ? (
                  <div className="space-y-3.5">
                    {owners.map((ow, idx) => (
                      <div key={ow.id || idx} className="flex justify-between items-center text-xs font-bold p-3 bg-bg/40 rounded-lg border border-d3/30">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/20 flex items-center justify-center text-[10px] font-black uppercase">
                            {ow.nombre.charAt(0)}
                          </div>
                          <span className="text-txt font-black uppercase tracking-wide">{ow.nombre}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] text-muted block font-semibold uppercase tracking-wider">Porcentaje ({(100 / owners.length).toFixed(0)}%)</span>
                          <span className="text-brand-gold font-mono font-black text-sm">{formatCurrency(netOperatingProfit / owners.length)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {/* Fallback to original layout custom profiles design in reports */}
                    <div className="flex justify-between items-center text-xs font-bold p-3 bg-bg/40 rounded-lg border border-d3/30">
                      <div>
                        <span className="text-txt font-black uppercase tracking-wide">Socio A</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] text-muted block font-semibold uppercase">Porcentaje (50%)</span>
                        <span className="text-txt font-mono font-black">{formatCurrency(netOperatingProfit * 0.5)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold p-3 bg-bg/40 rounded-lg border border-d3/30">
                      <div>
                        <span className="text-txt font-black uppercase tracking-wide">Socio B</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] text-muted block font-semibold uppercase">Porcentaje (50%)</span>
                        <span className="text-txt font-mono font-black">{formatCurrency(netOperatingProfit * 0.5)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Origen de Ingresos/Detalle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-d1 border border-d3 rounded-2xl p-6 sm:p-8">
          <h3 className="text-sm font-black text-txt uppercase tracking-widest mb-6 border-b border-d3/30 pb-3">Origen de Ingresos</h3>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distributionData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0c1026', border: '1px solid #182347', borderRadius: '8px' }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-d1 border border-d3 rounded-2xl p-6 sm:p-8 space-y-6">
          <h3 className="text-sm font-black text-txt uppercase tracking-widest border-b border-d3/30 pb-3">Resumen de Ventas</h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-d2 rounded-xl border border-d3 shadow-sm">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-lg"><Scissors size={18} /></div>
                   <p className="text-sm font-black text-txt uppercase tracking-tight">Venta de Servicios</p>
                </div>
                <span className="font-mono font-black text-brand-blue">{formatCurrency(serviceSales)}</span>
             </div>
             
             <div className="flex items-center justify-between p-4 bg-d2 rounded-xl border border-d3 shadow-sm">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-lg"><ShoppingBag size={18} /></div>
                   <p className="text-sm font-black text-txt uppercase tracking-tight">Venta de Productos</p>
                </div>
                <span className="font-mono font-black text-brand-gold">{formatCurrency(productSales)}</span>
             </div>

             <div className="mt-8 pt-6 border-t border-d3">
                <div className="flex items-center justify-between mb-2">
                   <span className="text-xs text-muted font-black uppercase tracking-wider">Items Vendidos</span>
                   <span className="text-txt font-black font-mono">{filteredSales.reduce((acc, v) => acc + v.cantidad, 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-xs text-muted font-black uppercase tracking-wider">Venta Promedio</span>
                   <span className="text-txt font-black font-mono">{formatCurrency(filteredSales.length > 0 ? totalSales / filteredSales.length : 0)}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
