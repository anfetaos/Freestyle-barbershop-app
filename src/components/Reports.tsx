import React, { useState } from 'react';
import { Filter, Search, Download, Calendar, ArrowUpRight, TrendingUp, Scissors, ShoppingBag, Wallet, Users } from 'lucide-react';
import { AppData, User, Sale } from '../types';
import { formatCurrency, cn } from '../utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function Reports({ data, user }: { data: AppData, user: User }) {
  const [filter, setFilter] = useState('hoy');
  const isOwner = user.role === 'owner';

  const today = new Date().toISOString().split('T')[0];
  
  const getFilteredSales = () => {
    let sales = data.ventas;
    if (!isOwner) sales = sales.filter(v => v.usuario === user.usuario);

    if (filter === 'hoy') return sales.filter(v => v.fecha === today);
    if (filter === 'semana') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return sales.filter(v => new Date(v.fecha) >= weekAgo);
    }
    if (filter === 'mes') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return sales.filter(v => new Date(v.fecha) >= monthAgo);
    }
    return sales;
  };

  const filteredSales = getFilteredSales();
  const totalSales = filteredSales.reduce((acc, v) => acc + (v.valor * v.cantidad), 0);
  const serviceSales = filteredSales.filter(v => v.tipo === 'servicio').reduce((acc, v) => acc + (v.valor * v.cantidad), 0);
  const productSales = filteredSales.filter(v => v.tipo === 'producto').reduce((acc, v) => acc + (v.valor * v.cantidad), 0);
  
  const expenses = data.gastos.filter(g => {
    if (filter === 'hoy') return g.fecha === today;
    if (filter === 'semana') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(g.fecha) >= weekAgo;
    }
    if (filter === 'mes') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return new Date(g.fecha) >= monthAgo;
    }
    return true;
  });
  const totalExpenses = expenses.reduce((acc, g) => acc + g.monto, 0);

  // Payout calculation
  const getBarberPayouts = () => {
    const payouts: Record<string, { total: number, commission: number, name: string }> = {};
    
    filteredSales.forEach(v => {
      if (v.tipo === 'servicio' || v.comisionable) {
        const u = data.usuarios.find(user => user.usuario === v.usuario);
        if (u) {
          if (!payouts[v.usuario]) {
            payouts[v.usuario] = { total: 0, commission: 0, name: u.nombre };
          }
          const saleValue = v.valor * v.cantidad;
          payouts[v.usuario].total += saleValue;
          payouts[v.usuario].commission += (saleValue * (u.porcentaje / 100));
        }
      }
    });

    return Object.values(payouts);
  };

  const barberPayouts = getBarberPayouts();
  const totalBarberCommissions = barberPayouts.reduce((acc, p) => acc + p.commission, 0);
  const netOperatingProfit = totalSales - totalExpenses - totalBarberCommissions;

  const distributionData = [
    { name: 'Servicios', value: serviceSales, color: '#3ea6ff' },
    { name: 'Productos', value: productSales, color: '#66c3ff' }
  ];

  return (
    <div className="space-y-8">
      {/* Header Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-txt flex items-center gap-2">
          <TrendingUp className="text-brand-blue" /> ANÁLISIS DE NEGOCIO
        </h2>
        <div className="flex items-center gap-2 bg-d2 p-1 rounded-xl border border-white/5">
          {['hoy', 'semana', 'mes', 'historico'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all",
                filter === f ? "bg-brand-blue text-bg shadow-lg" : "text-muted hover:text-txt"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="glass-card p-4 sm:p-6 border-b-2 border-brand-blue">
          <div className="flex items-center gap-3 mb-2 sm:mb-4">
            <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-lg">
              <TrendingUp size={16} className="sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-muted uppercase tracking-widest">Ingresos Brutos</span>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-txt font-mono truncate">{formatCurrency(totalSales)}</p>
        </div>

        <div className="glass-card p-4 sm:p-6 border-b-2 border-danger">
          <div className="flex items-center gap-3 mb-2 sm:mb-4">
            <div className="p-2 bg-danger/10 text-danger rounded-lg">
              <Wallet size={16} className="sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-muted uppercase tracking-widest">Gastos Directos</span>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-txt font-mono truncate">{formatCurrency(totalExpenses)}</p>
        </div>

        <div className="glass-card p-4 sm:p-6 border-b-2 border-success col-span-1 sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-3 mb-2 sm:mb-4">
            <div className="p-2 bg-success/10 text-success rounded-lg">
              <ArrowUpRight size={16} className="sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-muted uppercase tracking-widest">Utilidad Operativa</span>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-txt font-mono truncate">{formatCurrency(netOperatingProfit)}</p>
        </div>
      </div>

      {isOwner && (
        <div className="glass-card p-8 space-y-6">
          <h3 className="text-sm font-bold text-muted uppercase tracking-widest border-b border-white/5 pb-4">
            Distribución de Pagos ({filter})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-brand-blue uppercase flex items-center gap-2">
                <Users size={14} /> Comisiones Barberos
              </h4>
              <div className="space-y-3">
                {barberPayouts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                    <div>
                      <p className="text-sm font-bold text-txt uppercase">{p.name}</p>
                      <p className="text-[10px] text-muted">Ventas: {formatCurrency(p.total)}</p>
                    </div>
                    <span className="font-mono font-bold text-brand-blue">{formatCurrency(p.commission)}</span>
                  </div>
                ))}
                {barberPayouts.length === 0 && <p className="text-xs text-muted italic">No hay comisiones en este periodo</p>}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-brand-gold uppercase">Distribución de Utilidad</h4>
              <div className="flex items-center justify-between p-6 bg-brand-gold/5 rounded-2xl border border-brand-gold/20">
                <div>
                  <p className="text-sm font-bold text-txt">Excedente Neto</p>
                  <p className="text-[10px] text-muted">(Ventas - Gastos - Comisiones)</p>
                </div>
                <span className="text-xl font-bold text-brand-gold">{formatCurrency(netOperatingProfit)}</span>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] text-muted uppercase font-bold tracking-widest mb-3">Reparto por Socio (Ejemplo 50/50)</p>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-muted">Socio A (50%)</span>
                  <span className="text-txt">{formatCurrency(netOperatingProfit * 0.5)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold mt-2">
                  <span className="text-muted">Socio B (50%)</span>
                  <span className="text-txt">{formatCurrency(netOperatingProfit * 0.5)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8">
          <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-8">Origen de Ingresos</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111831', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-8 space-y-6">
          <h3 className="text-sm font-bold text-muted uppercase tracking-widest">Resumen de Ventas</h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-lg"><Scissors size={18} /></div>
                   <p className="text-sm font-bold text-txt">Venta de Servicios</p>
                </div>
                <span className="font-mono font-bold text-brand-blue">{formatCurrency(serviceSales)}</span>
             </div>
             
             <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-lg"><ShoppingBag size={18} /></div>
                   <p className="text-sm font-bold text-txt">Venta de Productos</p>
                </div>
                <span className="font-mono font-bold text-brand-gold">{formatCurrency(productSales)}</span>
             </div>

             <div className="mt-8 pt-6 border-t border-white/5">
                <div className="flex items-center justify-between mb-2">
                   <span className="text-xs text-muted font-bold uppercase">Items Vendidos</span>
                   <span className="text-txt font-bold">{filteredSales.reduce((acc, v) => acc + v.cantidad, 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-xs text-muted font-bold uppercase">Venta Promedio</span>
                   <span className="text-txt font-bold">{formatCurrency(filteredSales.length > 0 ? totalSales / filteredSales.length : 0)}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
