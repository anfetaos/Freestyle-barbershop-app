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
  Calendar,
  Coins
} from 'lucide-react';
import { AppData, User } from '../types';
import { formatCurrency, cn, getBogotaDateString } from '../utils';
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
    return getBogotaDateString(d);
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
      const isAdelantoGasto = g.categoria?.toLowerCase?.().trim?.() === 'adelanto' || g.categoria?.toLowerCase?.().trim?.() === 'anticipo' || g.categoria === 'Adelanto';
      if (isComisionGasto || isAdelantoGasto) {
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

    // Calculate advances already given/approved in the filtered range, which count as prepayments
    const periodAdelantos = (data.adelantos || []).filter(a => {
      const todayStr = getLocalDateString();
      let matchesPeriod = false;
      if (filter === 'hoy') {
        matchesPeriod = a.fecha === todayStr;
      } else if (filter === 'semana') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const limit = getLocalDateString(d);
        matchesPeriod = a.fecha >= limit;
      } else if (filter === 'mes') {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        const limit = getLocalDateString(d);
        matchesPeriod = a.fecha >= limit;
      } else if (filter === 'rango') {
        matchesPeriod = (!startDate || a.fecha >= startDate) && (!endDate || a.fecha <= endDate);
      } else {
        matchesPeriod = true; // historico
      }
      return matchesPeriod && a.estado === 'aprobado';
    });

    periodAdelantos.forEach(a => {
      if (payouts[a.usuario]) {
        payouts[a.usuario].commissionPaid += Number(a.monto || 0); // Disminuye la comisión por pagar!
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

  // Operational expenses are regular costs (rent, services, tools/supplies). Exclude commissions, utilities, and advances.
  const operationalExpensesList = expenses.filter(g => {
    const cat = g.categoria?.toLowerCase?.() || '';
    return cat !== 'comisión' && cat !== 'utilidades' && cat !== 'conisión' && cat !== 'adelanto' && cat !== 'anticipo';
  });
  const totalOperationalExpenses = operationalExpensesList.reduce((acc, g) => acc + g.monto, 0);

  // Utilidad Generada (Ventas - Gastos Fijos/Insumos - Comisiones Barberos)
  const utilidadGenerada = totalSales - totalOperationalExpenses - totalBarberCommissions;

  // Let's find already paid/withdrawn utilities in the selected period (expenses with category 'Utilidades' or 'Retiro de Utilidades')
  const utilidadesRetiradasList = expenses.filter(g => {
    const cat = g.categoria?.toLowerCase?.() || '';
    return cat === 'utilidades' || cat === 'retiro de utilidades' || cat === 'utilidad';
  });
  const totalUtilidadesRetiradas = utilidadesRetiradasList.reduce((acc, g) => acc + g.monto, 0);

  // Available utilities left to pay/withdraw
  const utilidadPendiente = Math.max(0, utilidadGenerada - totalUtilidadesRetiradas);
  
  // Keep original variable name for retro-compatibility
  const netOperatingProfit = utilidadGenerada;

  // Owner utility states
  const [withdrawingUtilities, setWithdrawingUtilities] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDescription, setWithdrawDescription] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const handleWithdrawUtilities = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(withdrawAmount);
    if (!amountNum || amountNum <= 0) {
      alert('Por favor ingrese un monto válido de utilidades.');
      return;
    }
    if (amountNum > utilidadPendiente) {
      if (!window.confirm(`El monto a retirar (${formatCurrency(amountNum)}) supera la utilidad disponible (${formatCurrency(utilidadPendiente)}). ¿Desea continuar de todos modos?`)) {
        return;
      }
    } else {
      if (!window.confirm(`¿Confirmar retiro/pago de utilidades por un valor de ${formatCurrency(amountNum)}?`)) {
        return;
      }
    }

    setSubmittingWithdraw(true);
    try {
      const todayStr = getLocalDateString();
      const expense = {
        fecha: todayStr,
        categoria: 'Utilidades',
        descripcion: withdrawDescription || `Pago de Utilidades / Retiro de Socios`,
        monto: amountNum,
        usuario: user.usuario
      };

      await api.saveExpense(expense);
      setWithdrawAmount('');
      setWithdrawDescription('');
      setWithdrawingUtilities(false);
      if (onRefresh) onRefresh();
      alert('Retiro/Pago de utilidades registrado con éxito como egreso del negocio.');
    } catch (err: any) {
      alert('Error al registrar retiro de utilidades: ' + (err.message || err));
    } finally {
      setSubmittingWithdraw(false);
    }
  };

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
        usuario: user.usuario
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
            <span className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Gastos Directos (Costos)</span>
          </div>
          <p className="text-2xl font-black text-txt font-mono">{formatCurrency(totalOperationalExpenses)}</p>
          <p className="text-[9px] text-muted font-bold mt-1.5 uppercase">Arriendo, Servicios e Insumos</p>
        </div>

        <div className="bg-d1 border-l-4 border-l-success border border-d3 rounded-xl p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-success/10 text-success rounded-lg">
              <ArrowUpRight size={16} />
            </div>
            <span className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Utilidad Operativa</span>
          </div>
          <p className="text-2xl font-black text-txt font-mono">{formatCurrency(utilidadGenerada)}</p>
          <p className="text-[9px] text-muted font-bold mt-1.5 uppercase">Fórmula: Ventas - Costos - Comisiones</p>
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
              
              {/* Desglose de Utilidades */}
              <div className="p-5 bg-d2 border border-d3 rounded-xl space-y-4 shadow-inner">
                <div className="flex justify-between items-center text-xs pb-2.5 border-b border-d3/40">
                  <span className="text-muted font-bold uppercase tracking-wider">Utilidad Generada (Bruta):</span>
                  <span className="text-txt font-bold font-mono text-sm">{formatCurrency(utilidadGenerada)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2.5 border-b border-d3/40">
                  <span className="text-muted font-bold uppercase tracking-wider">Utilidades Retiradas/Pagadas:</span>
                  <span className="text-danger font-bold font-mono text-sm">-{formatCurrency(totalUtilidadesRetiradas)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-brand-gold/10 border border-brand-gold/25 rounded-lg">
                  <div>
                    <span className="text-brand-gold font-bold uppercase tracking-widest text-[9px] block">Disponible para Socios:</span>
                    <span className="text-[9px] text-muted font-medium block">Ventas - Costos - Comisiones - Retiros</span>
                  </div>
                  <span className="text-lg font-black font-mono text-brand-gold">{formatCurrency(utilidadPendiente)}</span>
                </div>

                {/* Botón e Inline Form para Retirar / Registrar pago de Utilidades */}
                {withdrawingUtilities ? (
                  <form onSubmit={handleWithdrawUtilities} className="p-3 bg-bg/60 border border-brand-gold/20 rounded-lg space-y-3 mt-3">
                    <span className="text-[10px] font-black uppercase text-brand-gold block">Registrar Retiro de Utilidad</span>
                    <div className="space-y-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase font-bold text-muted">Monto (COP)</label>
                        <input
                          type="number"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="Monto a retirar"
                          required
                          className="bg-bg border border-d3 rounded px-2.5 py-1.5 text-xs text-txt font-bold outline-none focus:border-brand-gold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase font-bold text-muted">Nota/Descripción</label>
                        <input
                          type="text"
                          value={withdrawDescription}
                          onChange={(e) => setWithdrawDescription(e.target.value)}
                          placeholder="P. ej., Retiro de utilidades Mayo - Socio X"
                          className="bg-bg border border-d3 rounded px-2.5 py-1.5 text-xs text-txt font-medium outline-none focus:border-brand-gold"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setWithdrawingUtilities(false)}
                        className="bg-d3/80 hover:bg-d3 text-muted px-3 py-1.5 rounded text-[9px] font-bold uppercase"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={submittingWithdraw}
                        className="bg-brand-gold text-bg font-black uppercase text-[9px] px-3 py-1.5 rounded hover:bg-[#ffdf66] transition-all flex items-center gap-1"
                      >
                        {submittingWithdraw && <Loader2 className="animate-spin" size={10} />}
                        Registrar Egreso
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      setWithdrawAmount(Math.round(utilidadPendiente).toString());
                      setWithdrawingUtilities(true);
                    }}
                    className="w-full bg-brand-gold hover:bg-[#ffdf66] text-bg py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/10"
                  >
                    <Coins size={12} /> Registrar Retiro / Pago de Utilidad
                  </button>
                )}
              </div>

              <div className="p-5 bg-d2 border border-d3 rounded-xl space-y-4">
                <p className="text-[9px] text-muted uppercase font-black tracking-widest border-b border-d3/50 pb-2">
                  Reparto Equitativo de Utilidad Disponible
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
                          <span className="text-[8px] text-muted block font-semibold uppercase tracking-wider">Socio Propietario ({(100 / owners.length).toFixed(0)}%)</span>
                          <span className="text-brand-gold font-mono font-black text-sm">{formatCurrency(utilidadPendiente / owners.length)}</span>
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
                        <span className="text-brand-gold font-mono font-black">{formatCurrency(utilidadPendiente * 0.5)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold p-3 bg-bg/40 rounded-lg border border-d3/30">
                      <div>
                        <span className="text-txt font-black uppercase tracking-wide">Socio B</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] text-muted block font-semibold uppercase">Porcentaje (50%)</span>
                        <span className="text-brand-gold font-mono font-black">{formatCurrency(utilidadPendiente * 0.5)}</span>
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
