import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User as UserIcon, 
  Phone, 
  Scissors, 
  Plus, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  Check,
  X,
  History,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppData, Appointment, Service, User as BarberUser } from '../types';
import { formatCurrency, cn, formatWhatsAppPhone, getBogotaDateString } from '../utils';
import { api } from '../api';

export default function Appointments({ data, onRefresh, user }: { data: AppData, onRefresh: () => void, user: BarberUser }) {
  const [selectedDate, setSelectedDate] = useState(getBogotaDateString());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<string>('todos');

  const [newCita, setNewCita] = useState<Partial<Appointment>>({
    fecha: selectedDate,
    hora: '09:30',
    cliente: '',
    telefono: '',
    servicio_id: '',
    barbero: user.nombre,
    estado: 'pendiente'
  });

  // Keep newCita fecha in sync when selectedDate changes and modal is closed
  React.useEffect(() => {
    if (!isModalOpen) {
      setNewCita(prev => ({ ...prev, fecha: selectedDate }));
    }
  }, [selectedDate, isModalOpen]);

  // Generate day details for a scannable day strip
  const getDayDetails = (dateStr: string, offset: number) => {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
    const dayNum = d.getDate();
    const fullDate = getBogotaDateString(d);
    return { dayName, dayNum, fullDate, isToday: fullDate === getBogotaDateString() };
  };

  const daysList = React.useMemo(() => {
    const list = [];
    for (let i = -3; i <= 5; i++) {
      list.push(getDayDetails(selectedDate, i));
    }
    return list;
  }, [selectedDate]);

  const filteredAppointments = data.citas
    .filter(c => c.fecha === selectedDate && (selectedBarber === 'todos' || c.barbero === selectedBarber))
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const service = data.servicios.find(s => s.id === newCita.servicio_id);
      await api.saveAppointment({
        ...newCita,
        servicio: service?.nombre || '',
      });
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async (cita: Appointment) => {
    setLoading(true);
    try {
      // 1. Mark as finalized
      await api.editAppointment(cita.id!, { estado: 'finalizada' });
      
      // 2. Create a sale with items array as expected by GAS
      const service = data.servicios.find(s => s.id === cita.servicio_id);
      await api.saveSale({
        fecha: getBogotaDateString(),
        usuario: data.usuarios.find(u => u.nombre === cita.barbero)?.usuario || user.usuario,
        items: [{
          id: cita.servicio_id,
          nombre: cita.servicio,
          tipo: 'servicio',
          valor: service?.precio || 0,
          cantidad: 1,
          comisionable: true
        }]
      });
      
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Error al cobrar el servicio');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: Appointment['estado']) => {
    try {
      await api.editAppointment(id, { estado: status });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDateChange = (days: number) => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(getBogotaDateString(current));
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-bg px-4 py-2 rounded-lg border border-white/5">
            <CalendarIcon size={18} className="text-brand-blue" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-txt font-bold"
            />
          </div>
          <div className="flex items-center gap-1">
             <button 
                onClick={onRefresh}
                className="p-2 hover:bg-white/5 rounded-lg text-muted"
                title="Actualizar datos"
             >
                <History size={20}/>
             </button>
             <button 
                onClick={() => handleDateChange(-1)}
                className="p-2 hover:bg-white/5 rounded-lg text-muted"
                title="Día anterior"
             >
                <ChevronLeft size={20}/>
             </button>
             <button 
                onClick={() => handleDateChange(1)}
                className="p-2 hover:bg-white/5 rounded-lg text-muted"
                title="Siguiente día"
             >
                <ChevronRight size={20}/>
             </button>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-blue hover:bg-brand-blue2 text-bg px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all transition-all"
        >
          <Plus size={18} /> NUEVA CITA
        </button>
      </div>

      {/* Calendar Strip & Quick Filters */}
      <div className="flex flex-col gap-4 bg-d1/30 p-4 border border-d3 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Acceso rápido:</span>
            <button 
              onClick={() => setSelectedDate(getBogotaDateString())}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg border transition-all uppercase tracking-wide",
                selectedDate === getBogotaDateString()
                  ? "bg-brand-blue text-bg border-brand-blue shadow-lg shadow-brand-blue/10"
                  : "bg-d1 border-d3 text-txt hover:bg-d2"
              )}
            >
              Hoy
            </button>
            <button 
              onClick={() => {
                const tomorrow = new Date(Date.now() + 86400000);
                setSelectedDate(getBogotaDateString(tomorrow));
              }}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg border transition-all uppercase tracking-wide",
                selectedDate === getBogotaDateString(new Date(Date.now() + 86400000))
                  ? "bg-brand-blue text-bg border-brand-blue shadow-lg shadow-brand-blue/10"
                  : "bg-d1 border-d3 text-txt hover:bg-d2"
              )}
            >
              Mañana
            </button>
          </div>
          
          {/* Barber filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Barbero:</span>
            <select
              value={selectedBarber}
              onChange={(e) => setSelectedBarber(e.target.value)}
              className="bg-d1 border border-d3 text-txt text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:border-brand-blue cursor-pointer"
            >
              <option value="todos">Todos los Barberos</option>
              {data.usuarios.filter(u => u.role === 'barber' || u.role === 'barbero').map(u => (
                <option key={u.usuario || u.nombre} value={u.nombre}>{u.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Days Strip Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none scrollbar-thin">
          {daysList.map((day) => (
            <button
              key={day.fullDate}
              onClick={() => setSelectedDate(day.fullDate)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[55px] p-2 rounded-xl border transition-all relative shrink-0",
                selectedDate === day.fullDate
                  ? "bg-brand-blue/20 text-brand-blue border-brand-blue"
                  : "bg-d1 border-d3 hover:bg-d2 text-txt"
              )}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">{day.dayName}</span>
              <span className="text-sm font-black tracking-tight">{day.dayNum}</span>
              {day.isToday && (
                <span className="absolute bottom-1 w-1 h-1 bg-brand-gold rounded-full animate-pulse"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Appointments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredAppointments.length > 0 ? filteredAppointments.map((cita, idx) => (
          <div key={idx} className="glass-card overflow-hidden flex flex-col group hover:border-brand-blue/30 transition-all border border-transparent">
            <div className="p-3 sm:p-4 bg-white/5 flex items-center justify-between border-b border-white/5">
               <div className="flex items-center gap-2">
                 <Clock size={12} className="sm:w-[14px] text-brand-blue" />
                 <span className="text-base sm:text-lg font-mono font-bold text-brand-blue">{cita.hora}</span>
               </div>
               <div className={cn(
                 "px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold uppercase tracking-widest",
                 cita.estado === 'pendiente' ? "bg-brand-gold/10 text-brand-gold" :
                 cita.estado === 'confirmada' ? "bg-brand-blue/10 text-brand-blue" :
                 cita.estado === 'finalizada' ? "bg-success/10 text-success" :
                 "bg-danger/10 text-danger"
               )}>
                 {cita.estado}
               </div>
            </div>
            
            <div className="p-4 sm:p-5 flex-1 space-y-3 sm:space-y-4">
               <div>
                  <h4 className="text-[10px] text-muted uppercase font-bold tracking-widest mb-1">Cliente</h4>
                  <p className="text-txt font-bold text-sm sm:text-base flex items-center gap-2 uppercase tracking-wide truncate">
                    <UserIcon size={14} className="text-muted" /> {cita.cliente}
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 mt-1 pb-1">
                    <span className="text-[10px] sm:text-xs text-muted flex items-center gap-1 bg-bg/85 border border-white/5 px-2 py-0.5 rounded">
                      <Phone size={10} /> {cita.telefono}
                    </span>
                    {cita.telefono && (
                      <div className="flex items-center gap-1.5">
                        <a 
                          href={(() => {
                            const shopName = data?.config?.find(c => c.key === 'nombre_barberia')?.value || 'Freestyle Urban Grooming';
                            const msg = `Hola ${cita.cliente}, te escribimos de *${shopName}* para confirmar tu cita del día *${cita.fecha}* a las *${cita.hora}* para el servicio de *${cita.servicio}* con el barbero *${cita.barbero}*. ¿Nos confirmas tu asistencia? 👍🏻`;
                            const phone = formatWhatsAppPhone(cita.telefono);
                            return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
                          })()}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-bg px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wide transition-all flex items-center gap-0.5 border border-[#25D366]/20 uppercase"
                          title="Confirmar por WhatsApp con el cliente"
                        >
                          Confirmar WA
                        </a>
                        <a 
                          href={(() => {
                            const shopName = data?.config?.find(c => c.key === 'nombre_barberia')?.value || 'Freestyle Urban Grooming';
                            const bookingUrl = window.location.href.split('#')[0].split('?')[0] + '#/reservar';
                            const msg = `Hola ${cita.cliente}, te escribimos de *${shopName}* para informarte que tu cita programada del *${cita.fecha}* a las *${cita.hora}* ha sido cancelada. Si deseas reagendar, puedes ver los horarios disponibles aquí: ${bookingUrl}`;
                            const phone = formatWhatsAppPhone(cita.telefono);
                            return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
                          })()}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-danger/10 text-danger hover:bg-danger hover:text-bg px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wide transition-all flex items-center gap-0.5 border border-danger/20 uppercase"
                          title="Avisar cancelación por WhatsApp"
                        >
                          Avisar Cancelación
                        </a>
                      </div>
                    )}
                  </div>
               </div>

               <div>
                  <h4 className="text-xs text-muted uppercase font-bold tracking-widest mb-1">Servicio</h4>
                  <p className="text-sm font-medium text-txt bg-bg border border-white/5 p-2 rounded-lg inline-block">
                    {cita.servicio}
                  </p>
               </div>

               <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-d3 flex items-center justify-center text-[10px] font-bold">
                      {cita.barbero?.charAt(0)}
                    </div>
                    <span className="text-[10px] uppercase text-muted font-bold">{cita.barbero}</span>
                  </div>
                  
                  <div className="flex gap-2">
                     {cita.estado === 'pendiente' && (
                       <button 
                        onClick={() => updateStatus(cita.id!, 'confirmada')}
                        className="p-1.5 rounded-lg bg-brand-blue/10 text-brand-blue hover:bg-brand-blue hover:text-bg transition-all"
                       >
                         <Check size={16} />
                       </button>
                     )}
                     {cita.estado === 'confirmada' && (
                       <button 
                        onClick={() => handleFinalize(cita)}
                        className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success hover:text-bg transition-all flex items-center gap-1 px-3"
                        title="Cobrar servicio"
                       >
                         <Check size={16} />
                         <span className="text-[10px] font-bold">COBRAR</span>
                       </button>
                     )}
                     {(cita.estado === 'pendiente' || cita.estado === 'confirmada') && (
                       <button 
                        onClick={() => updateStatus(cita.id!, 'cancelada')}
                        className="p-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-bg transition-all"
                       >
                         <X size={16} />
                       </button>
                     )}
                  </div>
               </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted gap-4 glass-card">
              <History size={48} className="opacity-10" />
              <p className="text-sm uppercase font-bold tracking-widest">Sin citas agendadas para este día</p>
          </div>
        )}
      </div>

      {/* Modal Nueva Cita */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-d2 border border-white/10 rounded-2xl p-8 relative z-10 shadow-2xl"
          >
            <h2 className="text-xl font-bold text-txt mb-6 flex items-center gap-2">
               <CalendarIcon className="text-brand-blue" /> NUEVA CITA
            </h2>
            
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-muted mb-2">Fecha</label>
                  <input type="date" required value={newCita.fecha} onChange={e => setNewCita({...newCita, fecha: e.target.value})} className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt text-sm outline-none focus:border-brand-blue" />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-muted mb-2">Hora</label>
                  <input type="time" required value={newCita.hora} onChange={e => setNewCita({...newCita, hora: e.target.value})} className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt text-sm outline-none focus:border-brand-blue" />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-muted mb-2">Cliente</label>
                <input type="text" required placeholder="Nombre completo" value={newCita.cliente} onChange={e => setNewCita({...newCita, cliente: e.target.value})} className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt text-sm outline-none focus:border-brand-blue" />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-muted mb-2">Teléfono (10 dígitos)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-muted/70 text-sm font-mono select-none pointer-events-none">+57</span>
                  <input 
                    type="tel" 
                    required 
                    placeholder="300 000 0000" 
                    value={newCita.telefono || ''} 
                    onChange={e => {
                      const val = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
                      setNewCita({...newCita, telefono: val});
                    }} 
                    className="w-full bg-bg border border-white/10 rounded-lg pl-[46px] pr-4 py-2.5 text-txt text-sm outline-none focus:border-brand-blue font-mono tracking-wide" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-muted mb-2">Servicio</label>
                  <select required value={newCita.servicio_id} onChange={e => setNewCita({...newCita, servicio_id: e.target.value})} className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt text-sm outline-none focus:border-brand-blue cursor-pointer">
                    <option value="">Seleccionar...</option>
                    {data.servicios.filter(s=>s.activo).map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-muted mb-2">Barbero</label>
                  <select required value={newCita.barbero} onChange={e => setNewCita({...newCita, barbero: e.target.value})} className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt text-sm outline-none focus:border-brand-blue cursor-pointer">
                     <option value="Cualquier barbero">Cualquier barbero</option>
                     {data.usuarios.filter(u => u.role === 'barber' || u.role === 'barbero').map(u => (
                       <option key={u.usuario || u.nombre} value={u.nombre}>{u.nombre}</option>
                     ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-white/10 text-muted rounded-xl hover:bg-white/5 transition-all font-bold">CANCELAR</button>
                <button type="submit" disabled={loading} className="flex-1 bg-brand-blue text-bg px-4 py-3 rounded-xl font-bold hover:bg-brand-blue2 transition-all shadow-lg flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={20} className="animate-spin" /> : 'AGENDAR'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

