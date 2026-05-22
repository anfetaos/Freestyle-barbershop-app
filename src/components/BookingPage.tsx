import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { AppData, Service, User, Appointment } from '../types';
import { formatCurrency, cn } from '../utils';
import { 
  Calendar, 
  Clock, 
  User as UserIcon, 
  Users as UsersIcon,
  Scissors, 
  CheckCircle2, 
  Loader2,
  ChevronRight,
  ChevronLeft,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BookingPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState(false);

  // Selection state
  const [service, setService] = useState<Service | null>(null);
  const [barber, setBarber] = useState<string>('Cualquier barbero'); // barber nombre
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('');
  const [customer, setCustomer] = useState({ nombre: '', telefono: '' });
  const [submitting, setSubmitting] = useState(false);

  const [view, setView] = useState<'booking' | 'my-bookings'>('booking');
  const [searchPhone, setSearchPhone] = useState('');
  const [myCitas, setMyCitas] = useState<Appointment[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchPhone) return;
    setSearching(true);
    try {
      const res = await api.loadAllData();
      const filtered = res.citas.filter(c => c.telefono === searchPhone && c.estado !== 'cancelada');
      setMyCitas(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleCancelByClient = async (id: string) => {
    if (!confirm('¿Estás seguro que deseas cancelar tu cita?')) return;
    try {
      await api.editAppointment(id, { estado: 'cancelada' });
      alert('Cita cancelada correctamente');
      handleSearch();
    } catch (err) {
      console.error(err);
      alert('Error al cancelar la cita');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.loadAllData();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const barbers = data?.usuarios.filter(u => (u.role === 'barber' || u.role === 'barbero') && u.activo) || [];
  const services = data?.servicios.filter(s => s.activo) || [];

  const timeSlots = [
    '09:30', '10:00', '10:30', '11:00', '11:30', 
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30'
  ];

  // Helper to determine if a slot is busy on the selected date for the selected barber or overall
  const getSlotStatus = (t: string) => {
    if (!data?.citas) return { isBusy: false, reason: '' };
    
    // Find all active non-cancelled appointments at this exact date and hourly slot
    const appointmentsOnSlot = data.citas.filter(c => 
      c.fecha === date && 
      c.hora === t && 
      c.estado !== 'cancelada'
    );
    
    if (barber === 'Cualquier barbero') {
      // If client chose "Any barber", it represents a full block only if all active barbers are busy
      if (appointmentsOnSlot.length >= barbers.length) {
        return { isBusy: true, reason: 'Todos ocupados' };
      }
      return { isBusy: false, reason: '' };
    } else {
      // If a specific barber is chosen:
      // It is busy if that barber already has an appointment, or if overall slots are full
      const hasSpecificBooking = appointmentsOnSlot.some(c => c.barbero === barber);
      if (hasSpecificBooking) {
        return { isBusy: true, reason: 'Ocupado' };
      }
      if (appointmentsOnSlot.length >= barbers.length) {
        return { isBusy: true, reason: 'Lleno' };
      }
      return { isBusy: false, reason: '' };
    }
  };

  // Safe lock state: reset chosen time if it becomes busy or occupied on a barber/date change
  useEffect(() => {
    if (time) {
      const { isBusy } = getSlotStatus(time);
      if (isBusy) {
        setTime('');
      }
    }
  }, [barber, date]);

  const handleBooking = async () => {
    if (!service || !date || !time || !customer.nombre || !customer.telefono) return;
    setSubmitting(true);
    try {
      await api.saveAppointment({
        id: `cita_${Date.now()}`,
        fecha: date,
        hora: time,
        cliente: customer.nombre,
        telefono: customer.telefono,
        servicio_id: service.id,
        servicio: service.nombre,
        barbero: barber,
        estado: 'pendiente'
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Error al agendar la cita. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-blue" size={40} />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 max-w-md w-full border-brand-blue/30"
        >
          <div className="w-20 h-20 bg-brand-blue/20 text-brand-blue rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(62,166,255,0.3)]">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-txt mb-2 uppercase tracking-tight">¡Cita Agendada!</h2>
          <p className="text-muted mb-8 italic">Nos vemos pronto en Freestyle Urban Grooming.</p>
          <div className="bg-d2/50 p-4 rounded-xl text-left space-y-2 mb-8">
            <p className="text-xs text-brand-gold font-bold uppercase tracking-widest">{service?.nombre}</p>
            <p className="text-sm font-semibold text-txt">{new Date(date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las {time}</p>
          </div>

          {service && (
            <a 
              href={(() => {
                const shopWhatsApp = data?.config?.find(c => c.key === 'whatsapp')?.value || '';
                const shopName = data?.config?.find(c => c.key === 'nombre_barberia')?.value || 'Freestyle Urban Grooming';
                const msg = `Hola, acabo de agendar mi cita por la web:\n\n` +
                  `✂️ *Servicio:* ${service.nombre}\n` +
                  `📅 *Fecha:* ${date}\n` +
                  `⏰ *Hora:* ${time}\n` +
                  `💈 *Barbero:* ${barber}\n` +
                  `👤 *Cliente:* ${customer.nombre}\n` +
                  `📱 *Teléfono:* ${customer.telefono}\n\n` +
                  `Por favor confirmen mi reserva. ¡Muchas gracias!`;
                
                let phone = shopWhatsApp.replace(/[^\d+]/g, '');
                if (phone.length === 10 && phone.startsWith('3')) {
                  phone = '57' + phone;
                }
                return `https://wa.me/${phone || '573000000000'}?text=${encodeURIComponent(msg)}`;
              })()}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20BA56] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all my-4 inline-flex shadow-lg"
            >
              <Smartphone size={18} /> CONFIRMAR CITA POR WHATSAPP
            </a>
          )}

          <button 
            onClick={() => window.location.reload()}
            className="w-full btn-primary py-4 mt-2"
          >
            Agendar otra cita
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-txt font-sans selection:bg-brand-blue/30">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12 text-center relative">
          <div className="absolute right-0 top-0">
             <button 
                onClick={() => setView(view === 'booking' ? 'my-bookings' : 'booking')}
                className="text-[10px] font-bold uppercase tracking-widest text-brand-blue border border-brand-blue/30 px-3 py-1.5 rounded-lg hover:bg-brand-blue hover:text-bg transition-all"
             >
                {view === 'booking' ? 'Mis Reservas' : 'Nueva Reserva'}
             </button>
          </div>
          <div className="w-16 h-16 bg-gradient-to-tr from-brand-blue to-brand-gold rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl font-bold text-bg shadow-neon rotate-3 hover:rotate-0 transition-transform cursor-default">
            F
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase leading-none mb-1">
            {view === 'booking' ? 'Reserva Tu Estilo' : 'Mis Citas'}
          </h1>
          <p className="text-brand-gold text-[10px] font-bold uppercase tracking-[0.3em]">Freestyle Urban Grooming</p>
        </header>

        {view === 'my-bookings' ? (
          <div className="space-y-8">
             <div className="glass-card p-6 border-white/5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-4">Ingresa tu número de teléfono</label>
                <div className="flex gap-2">
                   <input 
                      type="tel" 
                      placeholder="Ej. 300 000 0000"
                      className="flex-1 bg-d1 border border-white/5 rounded-xl p-4 text-txt outline-none focus:border-brand-blue/50 transition-all font-mono"
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                   />
                   <button 
                      onClick={handleSearch}
                      disabled={searching}
                      className="bg-brand-blue text-bg px-6 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-brand-blue2 transition-all flex items-center justify-center"
                   >
                      {searching ? <Loader2 size={20} className="animate-spin" /> : 'Buscar'}
                   </button>
                </div>
             </div>

             <div className="space-y-4">
                {myCitas.map(c => (
                   <div key={c.id} className="glass-card p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:border-white/20">
                      <div>
                         <p className="text-xs text-brand-gold font-bold uppercase tracking-widest mb-1">{c.servicio}</p>
                         <p className="text-sm font-bold text-txt">{new Date(c.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                         <div className="flex items-center gap-4 mt-1 text-[10px] text-muted font-bold uppercase">
                            <span className="flex items-center gap-1"><Clock size={12}/> {c.hora}</span>
                            <span className="flex items-center gap-1"><UserIcon size={12}/> {c.barbero}</span>
                         </div>
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                         <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
                            c.estado === 'pendiente' ? "bg-brand-gold/20 text-brand-gold" :
                            c.estado === 'confirmada' ? "bg-brand-blue/20 text-brand-blue" :
                            "bg-success/20 text-success"
                         )}>
                            {c.estado}
                         </span>
                         {(c.estado === 'pendiente' || c.estado === 'confirmada') && (
                            <button 
                               onClick={() => handleCancelByClient(c.id!)}
                               className="text-[10px] font-bold text-danger uppercase hover:underline"
                            >
                               Cancelar
                            </button>
                         )}
                      </div>
                   </div>
                ))}
                {myCitas.length === 0 && searchPhone && !searching && (
                   <div className="text-center py-12 text-muted uppercase text-[10px] font-bold tracking-widest italic opacity-50">
                      No se encontraron citas activas para este número
                   </div>
                )}
             </div>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="flex justify-between items-center mb-12 relative px-4">
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-d3 -translate-y-1/2 z-0" />
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm z-10 transition-all duration-500",
                step >= s ? "bg-brand-blue text-bg shadow-neon" : "bg-d3 text-muted border border-white/5"
              )}
            >
              {s}
            </div>
          ))}
        </div>

        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Scissors className="text-brand-blue" size={20} />
                  <h3 className="text-xl font-bold uppercase tracking-tight">Elige un Servicio</h3>
                </div>
                <div className="grid gap-4">
                  {services.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setService(s); nextStep(); }}
                      className={cn(
                        "glass-card p-6 flex items-center justify-between group transition-all hover:scale-[1.02] active:scale-[0.98]",
                        service?.id === s.id ? "border-brand-blue bg-brand-blue/5" : "border-white/5 hover:border-brand-blue/30"
                      )}
                    >
                      <div className="text-left">
                        <p className="font-bold text-txt group-hover:text-brand-blue transition-colors">{s.nombre}</p>
                        <p className="text-xs text-muted flex items-center gap-2 mt-1 italic">
                          <Clock size={12} /> {s.duracion} min
                        </p>
                      </div>
                      <span className="text-lg font-mono font-bold text-brand-gold">{formatCurrency(s.precio)}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                    <div className="flex items-center gap-3 mb-6 font-bold uppercase tracking-tight">
                    <UserIcon size={20} className="text-brand-blue" />
                    <h3>Barbero (Opcional)</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <button
                            onClick={() => setBarber('Cualquier barbero')}
                            className={cn(
                                "p-4 rounded-xl border text-sm font-bold uppercase transition-all flex flex-col items-center gap-2",
                                barber === 'Cualquier barbero' ? "bg-brand-blue text-bg border-brand-blue shadow-neon" : "bg-d1 border-white/5 text-muted hover:border-brand-blue/30"
                            )}
                        >
                            <UsersIcon size={18} />
                            <span>Cualquiera</span>
                        </button>
                        {barbers.map(b => (
                            <button
                                key={b.usuario || b.nombre}
                                onClick={() => setBarber(b.nombre)}
                                className={cn(
                                    "p-4 rounded-xl border text-sm font-bold uppercase transition-all flex flex-col items-center gap-2",
                                    barber === b.nombre ? "bg-brand-blue text-bg border-brand-blue shadow-neon" : "bg-d1 border-white/5 text-muted hover:border-brand-blue/30"
                                )}
                            >
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">
                                    {b.nombre.charAt(0)}
                                </div>
                                <span className="truncate w-full">{b.nombre}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-3 font-bold uppercase tracking-tight">
                        <Calendar size={20} className="text-brand-blue" />
                        <h3>Fecha y Hora</h3>
                    </div>
                    <input 
                        type="date" 
                        min={new Date().toISOString().split('T')[0]}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-d1 border border-white/5 rounded-xl p-4 text-txt outline-none focus:border-brand-blue/50 transition-all font-bold"
                    />
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {timeSlots.map(t => {
                            const { isBusy } = getSlotStatus(t);
                            return (
                                <button
                                    key={t}
                                    disabled={isBusy}
                                    onClick={() => setTime(t)}
                                    className={cn(
                                        "py-3.5 rounded-xl border text-xs font-mono font-bold transition-all flex flex-col items-center justify-center gap-1 relative overflow-hidden",
                                        isBusy 
                                            ? "bg-danger/5 border-danger/20 text-muted/40 cursor-not-allowed opacity-40 line-through" 
                                            : time === t 
                                                ? "bg-brand-gold text-bg border-brand-gold shadow-xs" 
                                                : "bg-d1 border-white/5 text-muted hover:border-brand-gold/30"
                                    )}
                                >
                                    <span>{t}</span>
                                    {isBusy && (
                                      <span className="block text-[8px] font-sans tracking-wide uppercase font-black text-danger leading-none no-underline">
                                        Ocupado
                                      </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={prevStep} className="flex-1 py-4 rounded-xl border border-white/5 font-bold uppercase text-xs tracking-widest text-muted hover:bg-d2 hover:text-txt transition-all">
                    Atrás
                  </button>
                  <button 
                    disabled={!date || !time}
                    onClick={nextStep} 
                    className="flex-[2] btn-primary py-4"
                  >
                    Siguiente
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-3 mb-2 font-bold uppercase tracking-tight">
                  <Smartphone className="text-brand-blue" size={20} />
                  <h3>Tus Datos</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Nombre Completo</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Juan Pérez"
                      className="w-full bg-d1 border border-white/5 rounded-xl p-4 text-txt outline-none focus:border-brand-blue/50 transition-all"
                      value={customer.nombre}
                      onChange={(e) => setCustomer({...customer, nombre: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Teléfono</label>
                    <input 
                      type="tel" 
                      placeholder="Ej. 300 123 4567"
                      className="w-full bg-d1 border border-white/5 rounded-xl p-4 text-txt outline-none focus:border-brand-blue/50 transition-all"
                      value={customer.telefono}
                      onChange={(e) => setCustomer({...customer, telefono: e.target.value})}
                    />
                  </div>
                </div>

                <div className="glass-card p-6 bg-brand-blue/5 border-brand-blue/20">
                  <h4 className="text-[10px] font-bold text-brand-blue uppercase tracking-widest mb-4">Resumen de Cita</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted">Servicio</span>
                      <span className="text-xs font-bold text-txt">{service?.nombre}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted">Barbero</span>
                      <span className="text-xs font-bold text-txt">{barber || 'Por asignar'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted">Fecha</span>
                      <span className="text-xs font-bold text-txt">{date} a las {time}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={prevStep} className="flex-1 py-4 rounded-xl border border-white/5 font-bold uppercase text-xs tracking-widest text-muted hover:bg-d2 hover:text-txt transition-all">
                    Atrás
                  </button>
                  <button 
                    disabled={!customer.nombre || !customer.telefono || submitting}
                    onClick={handleBooking} 
                    className="flex-[2] btn-primary py-4 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="animate-spin mx-auto" /> : 'Confirmar Reserva'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>
    )}
      </div>
    </div>
  );
}
