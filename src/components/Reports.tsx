import React, { useState } from 'react';
import { motion } from 'motion/react';
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
  Coins,
  Receipt,
  Plus
} from 'lucide-react';
import { AppData, User } from '../types';
import { formatCurrency, cn, getBogotaDateString, getWeeklyDateRange } from '../utils';
import { api } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import SalesDetailModal from './SalesDetailModal';

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
  
  const getRecentWeeks = () => {
    const list = [];
    const bogotaDateStr = getBogotaDateString();
    const parts = bogotaDateStr.split('-');
    const bYear = parseInt(parts[0], 10);
    const bMonth = parseInt(parts[1], 10) - 1;
    const bDay = parseInt(parts[2], 10);
    
    // Base UTC at 12:00
    const todayUTC = new Date(Date.UTC(bYear, bMonth, bDay, 12, 0, 0));
    const dayOfWeek = todayUTC.getUTCDay(); // 0 = Sun, 1 = Mon ...
    
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentMonday = new Date(todayUTC.getTime() - mondayOffset * 24 * 60 * 60 * 1000);
    
    const formatLabelDate = (d: Date): string => {
      const monthsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${d.getUTCDate()} ${monthsEs[d.getUTCMonth()]}`;
    };

    const formatISO = (d: Date): string => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    
    for (let i = 0; i < 8; i++) {
      const mon = new Date(currentMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const sun = new Date(mon.getTime() + 6 * 24 * 60 * 60 * 1000);
      
      const startISO = formatISO(mon);
      const endISO = formatISO(sun);
      
      let label = `Sema: ${formatLabelDate(mon)} al ${formatLabelDate(sun)}`;
      if (i === 0) {
        label = `Esta Semana (${formatLabelDate(mon)} al ${formatLabelDate(sun)})`;
      } else if (i === 1) {
        label = `Semana Pasada (${formatLabelDate(mon)} al ${formatLabelDate(sun)})`;
      }
      
      list.push({
        value: `${startISO}_${endISO}`,
        label,
        start: startISO,
        end: endISO
      });
    }
    return list;
  };

  const getRecentMonths = () => {
    const monthsEs = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const list = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      const temp = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const year = temp.getFullYear();
      const monthIdx = temp.getMonth();
      const monthNum = String(monthIdx + 1).padStart(2, '0');
      const label = `${monthsEs[monthIdx]} ${year}`;
      list.push({
        value: `${year}-${monthNum}`,
        label
      });
    }
    return list;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const todayStr = getBogotaDateString();
    return todayStr.substring(0, 7);
  });

  const [selectedWeek, setSelectedWeek] = useState<string>(() => {
    const weeks = getRecentWeeks();
    return weeks[0]?.value || '';
  });

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalTab, setDetailModalTab] = useState<'todos' | 'servicios' | 'productos'>('todos');
  const [payingUser, setPayingUser] = useState<string | null>(null);
  const [commissionConfirm, setCommissionConfirm] = useState<{
    isOpen: boolean;
    payout: any | null;
    status: 'idle' | 'loading' | 'success' | 'error';
    errorMessage?: string;
  }>({
    isOpen: false,
    payout: null,
    status: 'idle'
  });

  // New Operational Expense states
  const [addingCustomExpense, setAddingCustomExpense] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('Servicios Públicos');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => getBogotaDateString());
  const [submittingExpense, setSubmittingExpense] = useState(false);

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
      const parts = selectedWeek.split('_');
      const start = parts[0];
      const end = parts[1];
      if (start && end) {
        return sales.filter(v => v.fecha >= start && v.fecha <= end);
      }
      const { start: sStart, end: sEnd } = getWeeklyDateRange();
      return sales.filter(v => v.fecha >= sStart && v.fecha <= sEnd);
    }
    
    if (filter === 'mes') {
      return sales.filter(v => v.fecha && v.fecha.startsWith(selectedMonth));
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
  
  // Margins calculations for sold products
  const totalProductCost = filteredSales
    .filter(v => v.tipo === 'producto')
    .reduce((acc, v) => {
      const p = data.productos.find(prod => prod.id === v.item_id);
      const unitCost = p ? (p.costo || 0) : 0;
      return acc + (unitCost * v.cantidad);
    }, 0);
  const productProfit = productSales - totalProductCost;
  const productMarginPercent = productSales > 0 ? Math.round((productProfit / productSales) * 100) : 0;
  
  const getFilteredExpenses = () => {
    const expenses = data.gastos;
    const todayStr = getLocalDateString();

    if (filter === 'hoy') {
      return expenses.filter(g => g.fecha === todayStr);
    }
    
    if (filter === 'semana') {
      const parts = selectedWeek.split('_');
      const start = parts[0];
      const end = parts[1];
      if (start && end) {
        return expenses.filter(g => g.fecha >= start && g.fecha <= end);
      }
      const { start: sStart, end: sEnd } = getWeeklyDateRange();
      return expenses.filter(g => g.fecha >= sStart && g.fecha <= sEnd);
    }
    
    if (filter === 'mes') {
      return expenses.filter(g => g.fecha && g.fecha.startsWith(selectedMonth));
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
        const parts = selectedWeek.split('_');
        const start = parts[0];
        const end = parts[1];
        if (start && end) {
          matchesPeriod = a.fecha >= start && a.fecha <= end;
        } else {
          const { start: sStart, end: sEnd } = getWeeklyDateRange();
          matchesPeriod = a.fecha >= sStart && a.fecha <= sEnd;
        }
      } else if (filter === 'mes') {
        matchesPeriod = a.fecha && a.fecha.startsWith(selectedMonth);
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
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [expenseError, setExpenseError] = useState<string | null>(null);

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
    setWithdrawError(null);
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
      console.error(err);
      setWithdrawError(err.message || String(err));
      alert('Error al registrar retiro de utilidades: ' + (err.message || err));
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const handleSaveCustomExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(expenseAmount);
    if (!amountNum || amountNum <= 0) {
      alert('Por favor ingrese un monto válido.');
      return;
    }

    setSubmittingExpense(true);
    setExpenseError(null);
    try {
      const newExpense = {
        fecha: expenseDate || getLocalDateString(),
        categoria: expenseCategory,
        descripcion: expenseDescription.trim(),
        monto: amountNum,
        usuario: user.usuario
      };

      await api.saveExpense(newExpense);
      setExpenseAmount('');
      setExpenseDescription('');
      setAddingCustomExpense(false);
      if (onRefresh) onRefresh();
      alert('Gasto registrado con éxito como egreso del negocio.');
    } catch (err: any) {
      console.error(err);
      setExpenseError(err.message || String(err));
      alert('Error al registrar gasto: ' + (err.message || err));
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Open modal for registering commission payment
  const handlePayCommission = (payout: any) => {
    setCommissionConfirm({
      isOpen: true,
      payout,
      status: 'idle'
    });
  };

  // Perform backend call to save commission payment
  const executePayCommission = async () => {
    const payout = commissionConfirm.payout;
    if (!payout || !onRefresh) return;

    setPayingUser(payout.username);
    setCommissionConfirm(prev => ({ ...prev, status: 'loading' }));

    try {
      const todayStr = getLocalDateString();
      const rangeLabel = filter === 'rango' 
        ? `${startDate} al ${endDate}` 
        : filter === 'hoy' 
          ? todayStr 
          : filter === 'semana' 
            ? (() => {
                const currentWeekLabel = getRecentWeeks().find(w => w.value === selectedWeek)?.label;
                return currentWeekLabel || 'Semana';
              })()
            : filter === 'mes' 
              ? (() => {
                  const currentMonthLabel = getRecentMonths().find(m => m.value === selectedMonth)?.label;
                  return currentMonthLabel || 'Mes';
                })()
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
      setCommissionConfirm(prev => ({ ...prev, status: 'success' }));
    } catch (err: any) {
      console.error(err);
      setCommissionConfirm(prev => ({ 
        ...prev, 
        status: 'error', 
        errorMessage: err.message || String(err) 
      }));
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
              {f === 'rango' ? 'Calendario' : f === 'historico' ? 'Histórico' : f === 'semana' ? 'Semanas' : f === 'mes' ? 'Mes Cursado' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Semana Selector */}
      {filter === 'semana' && (
        <div className="bg-d1 border border-brand-blue/10 p-5 rounded-2xl flex flex-wrap items-center gap-6 shadow-inner animate-fade-in">
          <div className="flex flex-col gap-1.5 min-w-[280px]">
            <span className="text-[9px] font-black uppercase tracking-widest text-brand-blue flex items-center gap-1">
              <Calendar size={10} /> Seleccionar Rango de Semana:
            </span>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="bg-bg border border-d3 text-txt text-xs font-bold rounded-lg px-4 py-2.5 outline-none focus:border-brand-blue cursor-pointer"
            >
              {getRecentWeeks().map(w => (
                <option key={w.value} value={w.value} className="bg-d1 text-txt font-bold">
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col justify-end h-full pt-4 md:pt-0">
            <span className="text-[10px] font-bold text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-4 py-2.5 rounded-xl">
              Rango Activo: {filteredSales.length} transacciones cobradas ({(() => {
                const [s, e] = selectedWeek.split('_');
                return `${s} al ${e}`;
              })()})
            </span>
          </div>
        </div>
      )}

      {/* Mes Selector */}
      {filter === 'mes' && (
        <div className="bg-d1 border border-brand-gold/10 p-5 rounded-2xl flex flex-wrap items-center gap-6 shadow-inner animate-fade-in">
          <div className="flex flex-col gap-1.5 min-w-[280px]">
            <span className="text-[9px] font-black uppercase tracking-widest text-brand-gold flex items-center gap-1">
              <Calendar size={10} /> Seleccionar Mes Específico:
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-bg border border-d3 text-txt text-xs font-bold rounded-lg px-4 py-2.5 outline-none focus:border-brand-gold cursor-pointer"
            >
              {getRecentMonths().map(m => (
                <option key={m.value} value={m.value} className="bg-d1 text-txt font-bold">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col justify-end h-full pt-4 md:pt-0">
            <span className="text-[10px] font-bold text-brand-blue bg-brand-blue/10 border border-brand-blue/20 px-4 py-2.5 rounded-xl">
              Rango Activo: {filteredSales.length} transacciones cobradas
            </span>
          </div>
        </div>
      )}

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
        <div 
          onClick={() => {
            setDetailModalTab('todos');
            setDetailModalOpen(true);
          }}
          className="bg-d1 border-l-4 border-l-brand-blue border border-d3 rounded-xl p-5 shadow-sm cursor-pointer hover:border-brand-blue/50 active:scale-[0.98] transition-all relative group"
          title="Ver desglose detallado de ventas"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-lg">
                <TrendingUp size={16} />
              </div>
              <span className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Ingresos Brutos</span>
            </div>
            <span className="text-[9px] font-black text-brand-blue uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              Desglose ↗
            </span>
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
        <>
          {/* SECCIÓN: CONTROL Y REGISTRO DE GASTOS OPERATIVOS */}
          <div className="bg-d1 border border-d3 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-d3/50 pb-4">
              <div>
                <h3 className="text-sm font-black text-txt uppercase tracking-widest flex items-center gap-2">
                  <Receipt size={16} className="text-brand-blue" /> Gestión de Gastos Operativos ({filter})
                </h3>
                <p className="text-[10px] text-muted font-semibold mt-0.5 uppercase tracking-wide">
                  Arriendos, servicios públicos, insumos de barbería y gastos directos del salón
                </p>
              </div>
              <button
                onClick={() => setAddingCustomExpense(!addingCustomExpense)}
                className="bg-brand-blue hover:bg-brand-blue2 text-bg text-[10px] font-black uppercase px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-brand-blue/10"
              >
                <Plus size={12} /> Registrar Gasto
              </button>
            </div>

            {addingCustomExpense && (
              <form onSubmit={handleSaveCustomExpense} className="p-5 bg-bg/50 border border-brand-blue/20 rounded-xl space-y-4 animate-fade-in">
                <h4 className="text-xs font-black uppercase tracking-widest text-brand-blue mb-2 flex items-center gap-1">
                  <Receipt size={14} /> Ingresar Nuevo Gasto
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted">Categoría del Gasto</label>
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="bg-d2 border border-d3 rounded-lg px-3.5 py-2.5 text-xs text-txt font-bold outline-none focus:border-brand-blue cursor-pointer"
                    >
                      <option value="Servicios Públicos">Servicios Públicos</option>
                      <option value="Arriendo">Arriendo</option>
                      <option value="Insumos o Suministros">Insumos o Suministros</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                      <option value="Publicidad">Publicidad</option>
                      <option value="Otros Gastos">Otros Gastos</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted">Fecha del Gasto</label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      required
                      className="bg-d2 border border-d3 rounded-lg px-3.5 py-2 text-xs text-txt font-bold outline-none focus:border-brand-blue"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted">Monto (COP)</label>
                    <input
                      type="number"
                      placeholder="P. ej. 150000"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      required
                      className="bg-d2 border border-d3 rounded-lg px-3.5 py-2 text-xs text-txt font-bold outline-none focus:border-brand-blue"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted">Descripción / Detalle</label>
                    <input
                      type="text"
                      placeholder="P. ej. Pago recibo de luz de Mayo"
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                      required
                      className="bg-d2 border border-d3 rounded-lg px-3.5 py-2 text-xs text-txt font-medium outline-none focus:border-brand-blue"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddingCustomExpense(false);
                      setExpenseAmount('');
                      setExpenseDescription('');
                      setExpenseError(null);
                    }}
                    className="bg-d3/80 hover:bg-d3 text-muted px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingExpense}
                    className="bg-brand-blue text-bg font-black uppercase text-[10px] px-5 py-2 rounded-lg hover:bg-[#66c3ff] transition-all flex items-center gap-1.5 shadow-lg shadow-brand-blue/10"
                  >
                    {submittingExpense ? (
                      <>
                        <Loader2 className="animate-spin" size={10} />
                        Procesando...
                      </>
                    ) : (
                      'Guardar Gasto'
                    )}
                  </button>
                </div>

                {expenseError && (expenseError.includes("Acción no reconocida") || expenseError.includes("guardarGasto")) && (
                  <div className="p-3 bg-brand-gold/10 border border-brand-gold/25 rounded-lg text-left text-[11px] leading-relaxed text-txt select-text animate-fade-in">
                    <strong className="text-brand-gold block font-black mb-1 uppercase tracking-wider text-[10px]">💡 CÓMO SOLUCIONAR:</strong>
                    Tu versión de <strong className="text-brand-gold">Google Apps Script</strong> está desactualizada y no tiene la acción <code className="bg-bg px-1 py-0.5 rounded text-brand-gold font-mono">guardarGasto</code>.
                    <ol className="list-decimal list-inside mt-1.5 space-y-1 text-muted">
                      <li>Abre el editor de Google Apps Script.</li>
                      <li>Haz clic en <strong className="text-txt">Implementar &gt; Administrar implementaciones</strong>.</li>
                      <li>Edita la versión activa seleccionando <strong className="text-txt font-bold">"Nueva versión"</strong>.</li>
                      <li>Haz clic en <strong className="text-txt">Implementar</strong> y copia la nueva URL generada.</li>
                      <li>Pégala en la pestaña <strong className="text-txt">Configuración</strong> y haz clic en "Guardar Cambios".</li>
                    </ol>
                  </div>
                )}
              </form>
            )}

            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase text-muted tracking-widest block">Historial de egresos directos (Periodo seleccionado)</span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-1">
                {operationalExpensesList.map((g, idx) => (
                  <div key={idx} className="bg-d2 border border-d3 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-brand-blue/20 transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="bg-danger/10 text-danger text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border border-danger/20">
                          {g.categoria}
                        </span>
                        <p className="text-xs font-bold text-txt mt-2.5 tracking-tight line-clamp-2">{g.descripcion}</p>
                      </div>
                      <span className="text-sm font-black font-mono text-danger">-{formatCurrency(g.monto)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-muted font-extrabold border-t border-d3/30 pt-2 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Calendar size={10} />
                        <span>{g.fecha}</span>
                      </div>
                      {g.usuario && (
                        <span className="font-mono">Socio: {g.usuario}</span>
                      )}
                    </div>
                  </div>
                ))}
                {operationalExpensesList.length === 0 && (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted border border-dashed border-d3 rounded-xl bg-d2/30 gap-2 opacity-50">
                    <Receipt size={32} strokeWidth={1.5} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Sin gastos directos detectados en este periodo</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DISTRIBUCIÓN Y LIQUIDACIÓN DE COMISIONES */}
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
            {(filter === 'rango' || filter === 'semana' || filter === 'mes') && (
              <span className="text-[9px] text-brand-gold font-bold bg-brand-gold/10 px-2.5 py-1.5 rounded-lg border border-brand-gold/20 font-mono">
                {filter === 'semana' 
                  ? (() => {
                      const parts = selectedWeek.split('_');
                      return `${parts[0]} a ${parts[1]}`;
                    })()
                  : filter === 'mes'
                    ? (() => {
                        const currentMonthLabel = getRecentMonths().find(m => m.value === selectedMonth)?.label;
                        return currentMonthLabel || selectedMonth;
                      })()
                    : `${startDate} / ${endDate}`
                }
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
                        onClick={() => {
                          setWithdrawingUtilities(false);
                          setWithdrawError(null);
                        }}
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

                    {withdrawError && (withdrawError.includes("Acción no reconocida") || withdrawError.includes("guardarGasto")) && (
                      <div className="p-3 bg-brand-gold/10 border border-brand-gold/25 rounded-lg text-left text-[11px] leading-relaxed text-txt select-text animate-fade-in mt-2">
                        <strong className="text-brand-gold block font-black mb-1 uppercase tracking-wider text-[10px]">💡 CÓMO SOLUCIONAR:</strong>
                        Tu versión de <strong className="text-brand-gold">Google Apps Script</strong> está desactualizada y no tiene la acción <code className="bg-bg px-1 py-0.5 rounded text-brand-gold font-mono">guardarGasto</code>.
                        <ol className="list-decimal list-inside mt-1 space-y-0.5 text-muted">
                          <li>Abre el editor de Google Apps Script.</li>
                          <li>Haz clic en <strong className="text-txt">Implementar &gt; Administrar implementaciones</strong>.</li>
                          <li>Edita la versión activa seleccionando <strong className="text-txt font-bold">"Nueva versión"</strong>.</li>
                          <li>Haz clic en <strong className="text-txt">Implementar</strong> y copia la nueva URL generada.</li>
                          <li>Pégala en la pestaña <strong className="text-txt">Configuración</strong> y haz clic en "Guardar Cambios".</li>
                        </ol>
                      </div>
                    )}
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
      </>
    )}

      {/* Origen de Ingresos/Detalle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div 
          onClick={() => {
            setDetailModalTab('todos');
            setDetailModalOpen(true);
          }}
          className="bg-d1 border border-d3 rounded-2xl p-6 sm:p-8 cursor-pointer hover:border-brand-gold/30 transition-all group"
          title="Ver desglose detallado por categoría"
        >
          <div className="flex items-center justify-between mb-6 border-b border-d3/30 pb-3">
            <h3 className="text-sm font-black text-txt uppercase tracking-widest">Origen de Ingresos</h3>
            <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              Ver Gráfico Expandido ↗
            </span>
          </div>
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

        <div 
          onClick={() => {
            setDetailModalTab('todos');
            setDetailModalOpen(true);
          }}
          className="bg-d1 border border-d3 rounded-2xl p-6 sm:p-8 space-y-6 cursor-pointer hover:border-brand-gold/30 transition-all group"
          title="Ver desglose de transacciones"
        >
          <div className="flex items-center justify-between border-b border-d3/30 pb-3">
            <h3 className="text-sm font-black text-txt uppercase tracking-widest">Resumen de Ventas</h3>
            <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              Ver Detalles ↗
            </span>
          </div>
          <div className="space-y-4">
             <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailModalTab('servicios');
                  setDetailModalOpen(true);
                }}
                className="flex items-center justify-between p-4 bg-d2 rounded-xl border border-d3 shadow-sm hover:border-brand-blue/40 cursor-pointer active:scale-98 transition-all group/item"
                title="Haga clic para ver servicios realizados"
             >
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-lg group-hover/item:scale-110 transition-transform"><Scissors size={18} /></div>
                   <p className="text-sm font-black text-txt uppercase tracking-tight group-hover/item:text-brand-blue transition-colors">Venta de Servicios ↗</p>
                </div>
                <span className="font-mono font-black text-brand-blue">{formatCurrency(serviceSales)}</span>
             </div>
             
             <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailModalTab('productos');
                  setDetailModalOpen(true);
                }}
                className="p-4 bg-d2 rounded-xl border border-d3 shadow-sm space-y-3 hover:border-brand-gold/40 cursor-pointer active:scale-98 transition-all group/item"
                title="Haga clic para ver productos vendidos"
             >
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-lg group-hover/item:scale-110 transition-transform"><ShoppingBag size={18} /></div>
                      <p className="text-sm font-black text-txt uppercase tracking-tight group-hover/item:text-brand-gold transition-colors">Venta de Productos ↗</p>
                   </div>
                   <span className="font-mono font-black text-brand-gold">{formatCurrency(productSales)}</span>
                </div>
                {isOwner && productSales > 0 && (
                   <div className="pt-2.5 border-t border-d3/30 grid grid-cols-2 gap-3 text-xs font-semibold uppercase tracking-wider">
                      <div className="bg-bg/40 p-2 rounded-lg border border-d3/20">
                         <span className="text-[8px] text-muted block mb-0.5">Costo Total</span>
                         <span className="font-mono font-bold text-txt text-[11px]">{formatCurrency(totalProductCost)}</span>
                      </div>
                      <div className="bg-success/5 p-2 rounded-lg border border-success/15">
                         <span className="text-[8px] text-success/80 block mb-0.5">Ganancia Real</span>
                         <span className="font-mono font-black text-success text-[11px]">
                            {formatCurrency(productProfit)} <span className="text-[9px] text-muted font-normal">({productMarginPercent}%)</span>
                         </span>
                      </div>
                   </div>
                )}
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

      {/* VENTANA DE CONFIRMACIÓN DE COMISIONES (IN-APP) */}
      {commissionConfirm.isOpen && commissionConfirm.payout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
          <div 
            className="absolute inset-0 bg-black/85 backdrop-blur-sm" 
            onClick={() => {
              if (commissionConfirm.status !== 'loading') {
                setCommissionConfirm({ isOpen: false, payout: null, status: 'idle' });
              }
            }}
          ></div>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-d2 border border-white/10 rounded-3xl p-6 relative z-10 shadow-2xl space-y-5 text-left"
          >
            {/* Modal Header */}
            <div className="text-center">
              <span className="text-[9px] bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-3 py-1 rounded-full font-bold uppercase tracking-widest animate-pulse">
                Confirmación de Pago
              </span>
              <h3 className="text-lg font-black text-txt uppercase tracking-tight mt-3 text-center">
                Liquidar Comisión
              </h3>
            </div>

            {/* Modal Body depending on status */}
            {commissionConfirm.status === 'idle' && (
              <>
                <div className="bg-bg/60 p-4 rounded-xl border border-d3/30 space-y-3.5">
                  <div className="flex justify-between items-center pb-2 border-b border-d3/10">
                    <span className="text-xs text-muted uppercase font-bold text-left">Barbero</span>
                    <span className="text-sm font-black text-txt uppercase text-right">{commissionConfirm.payout.name}</span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-d3/10">
                    <span className="text-xs text-muted uppercase font-bold text-left">Usuario</span>
                    <span className="text-xs font-mono font-bold text-brand-blue text-right">@{commissionConfirm.payout.username}</span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-d3/10">
                    <span className="text-xs text-muted uppercase font-bold text-left">Periodo</span>
                    <span className="text-[10px] text-brand-blue font-bold uppercase tracking-wider text-right">
                      {filter === 'rango' 
                        ? `${startDate} al ${endDate}` 
                        : filter === 'hoy' 
                          ? 'Hoy' 
                          : filter === 'semana' 
                            ? (() => {
                                const currentWeekLabel = getRecentWeeks().find(w => w.value === selectedWeek)?.label;
                                return currentWeekLabel || 'Semana';
                              })()
                            : filter === 'mes' 
                              ? (() => {
                                  const currentMonthLabel = getRecentMonths().find(m => m.value === selectedMonth)?.label;
                                  return currentMonthLabel || 'Mes';
                                })()
                              : 'Histórico'}
                    </span>
                  </div>

                  <div className="flex flex-col items-center pt-2">
                    <span className="text-[10px] text-muted uppercase font-bold tracking-widest">Monto a Liquidar</span>
                    <span className="text-xl font-black text-brand-gold font-mono tracking-tighter mt-1">
                      {formatCurrency(commissionConfirm.payout.pending)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCommissionConfirm({ isOpen: false, payout: null, status: 'idle' })}
                    className="flex-1 bg-d1 hover:bg-bg border border-white/5 hover:border-white/10 text-muted hover:text-txt py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={executePayCommission}
                    className="flex-1 bg-brand-gold hover:bg-brand-gold/90 text-bg py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-brand-gold/10"
                  >
                    Confirmar Pago 💳
                  </button>
                </div>
              </>
            )}

            {commissionConfirm.status === 'loading' && (
              <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center animate-pulse">
                <Loader2 className="animate-spin text-brand-gold" size={40} />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-txt uppercase tracking-wider text-center">Registrando Pago en Google Sheets</p>
                  <p className="text-[10px] text-muted font-medium text-center">Sincronizando datos con el servidor...</p>
                </div>
              </div>
            )}

            {commissionConfirm.status === 'success' && (
              <div className="py-4 flex flex-col items-center justify-center space-y-5 text-center">
                <div className="w-14 h-14 bg-success/15 border border-success/30 rounded-full flex items-center justify-center text-success animate-bounce mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-txt uppercase tracking-wider text-center">Pago Exitoso</p>
                  <p className="text-xs text-muted text-center leading-relaxed">
                    La comisión para <strong className="text-txt">{commissionConfirm.payout.name}</strong> por valor de <strong className="text-brand-gold font-mono">{formatCurrency(commissionConfirm.payout.pending)}</strong> ha sido registrada como un egreso del negocio.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCommissionConfirm({ isOpen: false, payout: null, status: 'idle' })}
                  className="w-full bg-success hover:bg-success/90 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Entendido / Continuar
                </button>
              </div>
            )}

            {commissionConfirm.status === 'error' && (
              <div className="py-4 flex flex-col items-center justify-center space-y-5 text-center">
                <div className="w-14 h-14 bg-danger/15 border border-danger/30 rounded-full flex items-center justify-center text-danger mx-auto">
                  <span className="text-lg font-black font-mono">!</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-danger uppercase tracking-wider text-center">Error de Registro</p>
                  <p className="text-xs text-muted leading-relaxed text-center font-medium">
                    No se pudo guardar el pago. Detalle técnico: <br />
                    <span className="text-txt font-mono block bg-bg/50 p-2 rounded-lg mt-2 text-[10px] border border-white/5 break-all max-h-[100px] overflow-y-auto select-text">
                      {commissionConfirm.errorMessage || 'Error de conexión o acción no reconocida.'}
                    </span>
                  </p>

                  {commissionConfirm.errorMessage && (commissionConfirm.errorMessage.includes("Acción no reconocida") || commissionConfirm.errorMessage.includes("guardarGasto")) && (
                    <div className="mt-3 p-3 bg-brand-gold/10 border border-brand-gold/20 rounded-xl text-left text-[11px] leading-relaxed text-txt select-text max-h-[160px] overflow-y-auto">
                      <strong className="text-brand-gold block font-black mb-1 uppercase tracking-wider text-[10px]">💡 CÓMO SOLUCIONAR:</strong>
                      Tu versión de <strong className="text-brand-gold">Google Apps Script</strong> está desactualizada y no tiene la acción <code className="bg-bg px-1 py-0.5 rounded text-brand-gold font-mono">guardarGasto</code>.
                      <ol className="list-decimal list-inside mt-1.5 space-y-1 text-muted">
                        <li>Abre el editor de Google Apps Script.</li>
                        <li>Haz clic en <strong className="text-txt">Implementar &gt; Administrar implementaciones</strong>.</li>
                        <li>Edita la versión activa seleccionando <strong className="text-txt">"Nueva versión"</strong>.</li>
                        <li>Haz clic en <strong className="text-txt">Implementar</strong> y copia la nueva URL generada.</li>
                        <li>Pega la URL en la pestaña <strong className="text-txt">Configuración</strong> de esta app y haz clic en "Guardar Cambios".</li>
                      </ol>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setCommissionConfirm({ isOpen: false, payout: null, status: 'idle' })}
                    className="flex-1 bg-d1 border border-white/5 text-muted hover:text-txt py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Salir
                  </button>
                  <button
                    type="button"
                    onClick={executePayCommission}
                    className="flex-1 bg-danger hover:bg-danger/90 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Sales Detail Modal for Drill-Down Reports */}
      <SalesDetailModal 
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        sales={filteredSales}
        products={data.productos || []}
        services={data.servicios || []}
        initialTab={detailModalTab}
        filterLabel={
          filter === 'rango' 
            ? `${startDate} al ${endDate}` 
            : filter === 'hoy' 
              ? getBogotaDateString() 
              : filter === 'semana' 
                ? (() => {
                    const currentWeekLabel = getRecentWeeks().find(w => w.value === selectedWeek)?.label;
                    return currentWeekLabel || 'Semana';
                  })()
                : filter === 'mes' 
                  ? (() => {
                      const currentMonthLabel = getRecentMonths().find(m => m.value === selectedMonth)?.label;
                      return currentMonthLabel || 'Mes';
                    })()
                  : 'Histórico'
        }
      />
    </div>
  );
}
