import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { AppData, Service, User } from '../types';
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

  const barbers = data?.usuarios.filter(u => u.role === 'barber' && u.activo) || [];
  const services = data?.servicios.filter(s => s.activo) || [];

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30'
  ];

  const handleBooking = async () => {
    if (!service || !date || !time || !customer.nombre || !customer.telefono) return;
    setSubmitting(true);
    try {
      await api.saveAppointment({
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
          <button 
            onClick={() => window.location.reload()}
            className="w-full btn-primary py-4"
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
        <header className="mb-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-brand-blue to-brand-gold rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl font-bold text-bg shadow-neon rotate-3 hover:rotate-0 transition-transform cursor-default">
            F
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase leading-none mb-1">Reserva Tu Estilo</h1>
          <p className="text-brand-gold text-[10px] font-bold uppercase tracking-[0.3em]">Freestyle Urban Grooming</p>
        </header>

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
                                key={b.id}
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
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {timeSlots.map(t => (
                            <button
                                key={t}
                                onClick={() => setTime(t)}
                                className={cn(
                                    "py-3 rounded-lg border text-xs font-mono font-bold transition-all",
                                    time === t ? "bg-brand-gold text-bg border-brand-gold" : "bg-d1 border-white/5 text-muted hover:border-brand-gold/30"
                                )}
                            >
                                {t}
                            </button>
                        ))}
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
      </div>
    </div>
  );
}
