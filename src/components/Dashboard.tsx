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
import { formatCurrency, cn } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard({ data, user, onTabChange }: { data: AppData, user: User, onTabChange: (tab: string) => void }) {
  const isOwner = user.role === 'owner';
  const [period, setPeriod] = React.useState<'day' | 'week' | 'month' | 'year'>('week');
  
  // Filtering data by period
  const filterByPeriod = (itemDate: string) => {
    const now = new Date();
    const date = new Date(itemDate);
    
    if (period === 'day') {
      return itemDate === now.toISOString().split('T')[0];
    }
    if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return date >= weekAgo;
    }
    if (period === 'month') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      return date >= monthAgo;
    }
    if (period === 'year') {
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      return date >= yearAgo;
    }
    return true;
  };

  // Filtering data for barbers
  const userSales = (isOwner ? data.ventas : data.ventas.filter(v => v.usuario === user.usuario))
    .filter(v => filterByPeriod(v.fecha));
  
  const userAppointments = isOwner ? data.citas : data.citas.filter(c => c.barbero === user.nombre || c.barbero === user.usuario);
  const filteredAppointments = userAppointments.filter(c => filterByPeriod(c.fecha));

  // Stats calculation
  const totalVentas = userSales.reduce((acc, v) => acc + (v.valor * v.cantidad), 0);
  const totalCitasPeriodo = filteredAppointments.length;
  const totalCitasHoy = userAppointments.filter(c => c.fecha === new Date().toISOString().split('T')[0]).length;
  
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

  // Top Barbers chart data
  const barberPerformance = data.usuarios
    .filter(u => u.role === 'barber')
    .map(u => ({
      name: u.nombre,
      total: data.ventas.filter(v => v.usuario === u.usuario).reduce((acc, v) => acc + (v.valor * v.cantidad), 0)
    }))
    .sort((a, b) => b.total - a.total);

  // Chart data
  const chartData = React.useMemo(() => {
    if (isOwner) {
      return barberPerformance;
    } else {
      // For barbers, show daily sales for the filtered period
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      return last7Days.map(date => ({
        name: new Date(date).toLocaleDateString('es-ES', { weekday: 'short' }),
        total: userSales.filter(v => v.fecha === date).reduce((acc, v) => acc + (v.valor * v.cantidad), 0)
      }));
    }
  }, [isOwner, barberPerformance, userSales]);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h2 className="text-xl font-black text-txt uppercase tracking-tighter">Resumen de Actividad</h2>
          <p className="text-xs text-muted font-medium">Visualizando datos por {period === 'day' ? 'día' : period === 'week' ? 'semana' : period === 'month' ? 'mes' : 'año'}</p>
        </div>
        <div className="flex bg-d1 p-1 rounded-lg border border-d3 scale-90 sm:scale-100 origin-left">
          {(['day', 'week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all",
                period === p ? "bg-brand-blue text-bg shadow-lg" : "text-muted hover:text-txt"
              )}
            >
              {p === 'day' ? 'Hoy' : p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>
      </div>

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
                    <span>{formatCurrency(barbero.total * 0.6)}</span>
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
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest",
                        cita.estado === 'confirmada' ? "bg-brand-blue/20 text-brand-blue" :
                        cita.estado === 'pendiente' ? "bg-brand-gold/20 text-brand-gold" :
                        cita.estado === 'finalizada' ? "bg-success/20 text-success" :
                        "bg-danger/20 text-danger"
                      )}>
                        {cita.estado}
                      </span>
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
