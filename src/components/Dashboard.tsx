import React from 'react';
import { 
  TrendingUp, 
  Users as UsersIcon, 
  Calendar as CalendarIcon, 
  ShoppingBag, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { AppData, User } from '../types';
import { formatCurrency, cn, getBogotaDateString } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard({ data, user, onTabChange }: { data: AppData, user: User, onTabChange: (tab: string) => void }) {
  const isOwner = user.role === 'owner';
  const [period, setPeriod] = React.useState<'day' | 'week' | 'month' | 'year' | 'custom'>('week');

  const getLocalDateString = (d: Date = new Date()) => {
    return getBogotaDateString(d);
  };

  const [startDate, setStartDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getLocalDateString(d);
  });

  const [endDate, setEndDate] = React.useState<string>(() => {
    return getLocalDateString();
  });
  
  // Filtering data by period
  const filterByPeriod = (itemDate: string) => {
    const localTodayStr = getLocalDateString();
    
    if (period === 'day') {
      return itemDate === localTodayStr;
    }

    if (period === 'custom') {
      if (!startDate) return true;
      if (!endDate) return itemDate >= startDate;
      return itemDate >= startDate && itemDate <= endDate;
    }

    const date = new Date(itemDate + 'T00:00:00');
    const todayMidnight = new Date(getBogotaDateString() + 'T00:00:00');

    if (period === 'week') {
      const weekAgo = new Date(todayMidnight.getTime() - 7 * 24 * 60 * 60 * 1000);
      return date >= weekAgo;
    }
    if (period === 'month') {
      const monthAgo = new Date(todayMidnight.getFullYear(), todayMidnight.getMonth() - 1, todayMidnight.getDate());
      return date >= monthAgo;
    }
    if (period === 'year') {
      const yearAgo = new Date(todayMidnight.getFullYear() - 1, todayMidnight.getMonth(), todayMidnight.getDate());
      return date >= yearAgo;
    }
    return true;
  };

  // Filtering data for barbers - Map both 'barber' or 'barbero' roles for sales
  const userSales = (isOwner ? data.ventas : data.ventas.filter(v => v.usuario === user.usuario))
    .filter(v => filterByPeriod(v.fecha));
  
  const userAppointments = isOwner 
    ? data.citas 
    : data.citas.filter(c => c.barbero === user.nombre || c.barbero === user.usuario || c.barbero === 'Cualquier barbero');
  const filteredAppointments = userAppointments.filter(c => filterByPeriod(c.fecha));

  // Stats calculation
  const totalVentas = userSales.reduce((acc, v) => acc + (v.valor * v.cantidad), 0);
  const totalCitasPeriodo = filteredAppointments.length;
  const totalCitasHoy = userAppointments.filter(c => c.fecha === getLocalDateString()).length;
  
  const totalComision = userSales.reduce((acc, v) => {
    if (v.tipo === 'servicio' || v.comisionable) {
      if (isOwner) {
        const barbero = data.usuarios.find(u => u.usuario === v.usuario);
        if (barbero && barbero.porcentaje > 0) {
          return acc + (v.valor * v.cantidad * (barbero.porcentaje / 100));
        }
      } else {
        return acc + (v.valor * v.cantidad * (user.porcentaje / 100));
      }
    }
    return acc;
  }, 0);

  const stats = [
    { 
      label: isOwner ? 'Ventas Totales' : 'Mis Ventas', 
      value: formatCurrency(totalVentas), 
      icon: TrendingUp, 
      color: 'text-success', 
      bg: 'bg-success/10' 
    },
    { 
      label: isOwner ? 'Comisiones por Pagar' : 'Mi Comisión', 
      value: formatCurrency(totalComision), 
      icon: ShoppingBag, 
      color: 'text-brand-blue', 
      bg: 'bg-brand-blue/10' 
    },
    { 
      label: 'Citas en Periodo', 
      value: totalCitasPeriodo.toString(), 
      icon: CalendarIcon, 
      color: 'text-brand-gold', 
      bg: 'bg-brand-gold/10' 
    },
    { 
      label: 'Servicios Realizados', 
      value: userSales.filter(v => v.tipo === 'servicio').length.toString(), 
      icon: UsersIcon, 
      color: 'text-brand-blue2', 
      bg: 'bg-brand-blue2/10' 
    },
  ];

  // Top Barbers performance using active sales (userSales) for the period, case-insensitive
  const barberPerformance = React.useMemo(() => {
    return data.usuarios
      .filter(u => u.role === 'barber' || u.role === 'barbero')
      .map(u => {
        const salesForUser = userSales.filter(v => 
          v.usuario?.toLowerCase().trim() === u.usuario?.toLowerCase().trim() ||
          v.usuario?.toLowerCase().trim() === u.nombre?.toLowerCase().trim() ||
          v.usuario?.toLowerCase().trim() === u.id?.toLowerCase().trim()
        );
        return {
          name: u.nombre,
          username: u.usuario,
          porcentaje: u.porcentaje,
          total: salesForUser.reduce((acc, v) => acc + (v.valor * v.cantidad), 0)
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [data.usuarios, userSales]);

  // Chart data
  const chartData = React.useMemo(() => {
    if (isOwner) {
      return barberPerformance;
    } else {
      // For barbers, show daily sales for the filtered period
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return getLocalDateString(d);
      }).reverse();

      return last7Days.map(date => ({
        name: new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short' }),
        total: userSales.filter(v => v.fecha === date).reduce((acc, v) => acc + (v.valor * v.cantidad), 0)
      }));
    }
  }, [isOwner, barberPerformance, userSales]);

  // Cook aggregated services and products sales analytics for the active selection period
  const soldAnalytics = React.useMemo(() => {
    const services: { [key: string]: { id: string, name: string, qty: number, revenue: number, dates: { fecha: string, qty: number }[] } } = {};
    const products: { [key: string]: { id: string, name: string, qty: number, revenue: number, dates: { fecha: string, qty: number }[] } } = {};

    userSales.forEach(val => {
      const isServ = val.tipo === 'servicio';
      const map = isServ ? services : products;
      const key = val.item_nombre || val.item_id || 'Desconocido';
      
      if (!map[key]) {
        map[key] = {
          id: val.item_id || key,
          name: key,
          qty: 0,
          revenue: 0,
          dates: []
        };
      }
      const q = Number(val.cantidad || 1);
      map[key].qty += q;
      map[key].revenue += Number((val.valor || 0) * q);

      const existingDate = map[key].dates.find((d) => d.fecha === val.fecha);
      if (existingDate) {
        existingDate.qty += q;
      } else {
        map[key].dates.push({ fecha: val.fecha, qty: q });
      }
    });

    const sortDates = (arr: { fecha: string, qty: number }[]) => {
      return arr.sort((a, b) => b.fecha.localeCompare(a.fecha));
    };

    return {
      services: Object.values(services).map(s => ({...s, dates: sortDates(s.dates)})).sort((a, b) => b.revenue - a.revenue),
      products: Object.values(products).map(p => ({...p, dates: sortDates(p.dates)})).sort((a, b) => b.revenue - a.revenue)
    };
  }, [userSales]);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h2 className="text-xl font-black text-txt uppercase tracking-tighter">Resumen de Actividad</h2>
          <p className="text-xs text-muted font-medium">
            {period === 'custom' 
              ? `Personalizado: ${startDate} al ${endDate}` 
              : `Visualizando datos por ${period === 'day' ? 'día' : period === 'week' ? 'semana' : period === 'month' ? 'mes' : period === 'year' ? 'año' : ''}`}
          </p>
        </div>
        <div className="flex bg-d1 p-1 rounded-lg border border-d3 scale-90 sm:scale-100 origin-left">
          {(['day', 'week', 'month', 'year', 'custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all",
                period === p ? "bg-brand-blue text-bg shadow-lg" : "text-muted hover:text-txt"
              )}
            >
              {p === 'day' ? 'Hoy' : p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : p === 'year' ? 'Año' : 'Rango'}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de Rango de Fechas */}
      {period === 'custom' && (
        <div className="bg-d2/50 border border-d3 p-4 rounded-xl flex flex-wrap items-center gap-4 animate-fade-in shadow-inner">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Desde:</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-bg border border-d3 text-txt text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-brand-blue cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Hasta:</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-bg border border-d3 text-txt text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-brand-blue cursor-pointer"
            />
          </div>
          <div className="flex flex-col justify-end h-full pt-4 md:pt-0">
            <span className="text-[10px] font-bold text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-3 py-2 rounded-lg">
              Resumen del Rango: {userSales.length} ventas cobradas
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-d1 p-3 sm:p-5 border border-d3 rounded-xl flex flex-col justify-between h-28 sm:h-32">
            <div className="flex justify-between items-start">
              <span className="text-[8px] sm:text-[10px] uppercase font-bold text-muted tracking-widest truncate">{stat.label}</span>
              <span className="text-base sm:text-lg">{i === 0 ? '💵' : i === 1 ? '✨' : i === 2 ? '🗓️' : '✂️'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-2xl font-black text-txt leading-none mb-1 truncate">{stat.value}</span>
              <div className="flex items-center gap-1">
                <span className={cn("text-[8px] sm:text-[10px] font-bold truncate", i === 0 ? "text-success" : "text-muted")}>
                  {i === 0 ? "+12.5% vs ayer" : i === 1 ? "Estimación real" : i === 2 ? `Ref: ${period}` : "Día normal"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-d1 border border-d3 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-d3 flex justify-between items-center bg-d2/50">
            <h3 className="text-sm font-bold uppercase tracking-widest text-txt">{isOwner ? 'Rendimiento Barberos' : 'Mis Ventas Diarias'}</h3>
            <span className="text-[10px] text-brand-blue font-bold uppercase tracking-wider">
              {period === 'day' ? 'Hoy' : period === 'week' ? '7 días' : period === 'month' ? '30 días' : 'Este año'}
            </span>
          </div>
          <div className="p-4 sm:p-6 h-[250px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#182347" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#8d9ab8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
                />
                <YAxis 
                  stroke="#8d9ab8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `$${val > 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#0c1026', border: '1px solid #182347', borderRadius: '8px' }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 && isOwner ? '#3ea6ff' : '#3ea6ff'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vertical Sidebar Info */}
        <div className="space-y-6">
          {/* Commissions Widget */}
          <div className="bg-d1 border border-d3 rounded-2xl p-6 flex flex-col flex-1">
            <h3 className="text-sm font-bold uppercase tracking-widest text-txt mb-4">Comisiones Barberos</h3>
            <div className="space-y-5">
              {barberPerformance.slice(0, 3).map((barbero, i) => (
                <div key={i} className="flex flex-col space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{barbero.name}</span>
                    <span>{formatCurrency(barbero.total * ((barbero.porcentaje || 60) / 100))}</span>
                  </div>
                  <div className="w-full h-1.5 bg-d3 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full bg-gradient-to-r", i === 0 ? "from-[#3ea6ff] to-[#66c3ff]" : "from-[#d6b06a] to-[#f5f7ff]")} 
                      style={{ width: `${85 - (i * 15)}%` }}
                    ></div>
                  </div>
                  <div className="text-[9px] text-muted flex justify-between uppercase tracking-wider font-semibold">
                    <span>Meta: {formatCurrency(1000000)}</span>
                    <span>{85 - (i * 15)}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto pt-6 border-t border-d3">
              <div className="flex justify-between items-center bg-d2 p-3 rounded-lg border border-brand-blue/10">
                <span className="text-[10px] font-bold uppercase text-muted">Total Comisiones</span>
                <span className="text-lg font-black text-brand-blue">{formatCurrency(totalComision)}</span>
              </div>
            </div>
          </div>

          {/* Inventory Alert Card */}
          <div className="bg-gradient-to-br from-d2 to-d1 border border-brand-gold/20 rounded-2xl p-6 h-40 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -bottom-4 -right-4 text-6xl opacity-10 grayscale group-hover:scale-110 transition-transform">📦</div>
            <div className="relative z-10">
              <h4 className="text-xs font-bold text-brand-gold uppercase tracking-widest">Estado de Inventario</h4>
              <p className="text-sm font-bold mt-2 leading-tight">Controla stock de productos</p>
              <button 
                onClick={() => onTabChange('productos')}
                className="mt-3 text-[10px] bg-brand-gold text-bg px-3 py-1.5 rounded font-bold uppercase shadow-lg shadow-brand-gold/20 hover:scale-105 transition-transform"
              >
                Ver Inventario
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visualización de Servicios y Productos Vendidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Servicios Vendidos */}
        <div className="bg-d1 border border-d3 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-d3/50">
            <div className="flex items-center gap-2">
              <span className="text-lg">✂️</span>
              <h3 className="text-sm font-bold uppercase tracking-widest text-txt">Servicios Realizados</h3>
            </div>
            <span className="text-[10px] bg-brand-blue/10 text-brand-blue font-bold px-2 py-1 rounded">
              {soldAnalytics.services.length} únicos
            </span>
          </div>

          <div className="space-y-4 flex-1">
            {soldAnalytics.services.map((serv, index) => {
              const maxRevenue = soldAnalytics.services[0]?.revenue || 1;
              const ratio = Math.max(5, Math.min(100, (serv.revenue / maxRevenue) * 100));
              return (
                <div key={serv.id || index} className="space-y-2 pb-2 border-b border-d3/20 last:border-none">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-txt uppercase tracking-wide">{serv.name}</span>
                      <span className="text-[10px] bg-white/5 text-muted px-1.5 py-0.5 rounded-md font-mono font-bold">
                        x{serv.qty}
                      </span>
                    </div>
                    <span className="font-bold text-brand-blue font-mono">{formatCurrency(serv.revenue)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-d3/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-blue rounded-full transition-all duration-500"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                  
                  {/* Fechas de Realización */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[8px] uppercase tracking-widest font-black text-muted mr-1">Fechas:</span>
                    {serv.dates.map((d, di) => (
                      <span key={di} className="text-[9px] bg-brand-blue/10 border border-brand-blue/25 text-brand-blue font-mono font-bold px-1.5 py-0.5 rounded shadow-sm">
                        {d.fecha} <span className="opacity-75 font-medium">(x{d.qty})</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

            {soldAnalytics.services.length === 0 && (
              <div className="h-24 flex items-center justify-center text-xs text-muted font-bold uppercase tracking-widest italic opacity-50">
                Sin servicios cobrados en este periodo
              </div>
            )}
          </div>
        </div>

        {/* Productos Vendidos */}
        <div className="bg-d1 border border-d3 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-d3/50">
            <div className="flex items-center gap-2">
              <span className="text-lg">📦</span>
              <h3 className="text-sm font-bold uppercase tracking-widest text-txt">Productos Vendidos</h3>
            </div>
            <span className="text-[10px] bg-brand-gold/10 text-brand-gold font-bold px-2 py-1 rounded">
              {soldAnalytics.products.length} únicos
            </span>
          </div>

          <div className="space-y-4 flex-1">
            {soldAnalytics.products.map((prod, index) => {
              const maxRevenue = soldAnalytics.products[0]?.revenue || 1;
              const ratio = Math.max(5, Math.min(100, (prod.revenue / maxRevenue) * 100));
              return (
                <div key={prod.id || index} className="space-y-2 pb-2 border-b border-d3/20 last:border-none">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-txt uppercase tracking-wide">{prod.name}</span>
                      <span className="text-[10px] bg-white/5 text-muted px-1.5 py-0.5 rounded-md font-mono font-bold">
                        x{prod.qty}
                      </span>
                    </div>
                    <span className="font-bold text-brand-gold font-mono">{formatCurrency(prod.revenue)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-d3/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-gold rounded-full transition-all duration-500"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>

                  {/* Fechas de Venta */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[8px] uppercase tracking-widest font-black text-muted mr-1">Fechas:</span>
                    {prod.dates.map((d, di) => (
                      <span key={di} className="text-[9px] bg-brand-gold/10 border border-brand-gold/25 text-brand-gold font-mono font-bold px-1.5 py-0.5 rounded shadow-sm">
                        {d.fecha} <span className="opacity-75 font-medium">(x{d.qty})</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

            {soldAnalytics.products.length === 0 && (
              <div className="h-24 flex items-center justify-center text-xs text-muted font-bold uppercase tracking-widest italic opacity-50">
                Sin productos vendidos en este periodo
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Next Appointments Table Style */}
      <div className="bg-d1 border border-d3 rounded-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-d3 flex justify-between items-center bg-d2/50">
          <h3 className="text-sm font-bold uppercase tracking-widest text-txt">Próximas Citas</h3>
          <button 
            onClick={() => onTabChange('citas')} 
            className="text-[10px] text-brand-blue font-bold uppercase hover:underline tracking-wider"
          >
            Ver Agenda Completa
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[700px] lg:min-w-0">
            <table className="w-full text-left border-collapse">
              <thead className="bg-bg text-muted text-[10px] uppercase font-bold sticky top-0">
                <tr className="border-b border-d3">
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Servicio</th>
                  <th className="px-6 py-3">Barbero</th>
                  <th className="px-6 py-3">Hora</th>
                  <th className="px-6 py-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-d3">
                {userAppointments.slice(0, 5).map((cita, i) => (
                  <tr key={i} className="hover:bg-d3/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-txt uppercase tracking-wide">{cita.cliente}</div>
                      <div className="text-[10px] text-muted">{cita.telefono}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-brand-blue font-semibold">{cita.servicio}</td>
                    <td className="px-6 py-4 text-muted font-medium">{cita.barbero}</td>
                    <td className="px-6 py-4 font-bold text-txt font-mono">{cita.hora}</td>
                    <td className="px-6 py-4 text-right flex flex-col items-end gap-1">
                      <span className={cn(
                        "px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest",
                        cita.estado === 'confirmada' ? "bg-brand-blue/20 text-brand-blue" :
                        cita.estado === 'pendiente' ? "bg-brand-gold/20 text-brand-gold" :
                        cita.estado === 'finalizada' ? "bg-success/20 text-success" :
                        "bg-danger/20 text-danger"
                      )}>
                        {cita.estado}
                      </span>
                      {cita.estado === 'confirmada' && (
                        <button 
                          onClick={() => onTabChange('citas')}
                          className="text-[8px] font-bold text-brand-blue uppercase hover:underline"
                        >
                          Ir a cobrar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {userAppointments.length === 0 && (
            <div className="py-12 text-center text-muted uppercase text-[10px] font-bold tracking-widest italic opacity-50">
              No hay citas programadas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
