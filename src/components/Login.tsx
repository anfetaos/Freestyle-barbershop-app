import React, { useState } from 'react';
import { api } from '../api';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await api.login(usuario, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Usuario inactivo o credenciales incorrectas');
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 flex-col">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-d1 border border-d3 rounded-2xl p-10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-blue via-brand-gold to-brand-blue" />
        
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 mb-4 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-gold flex items-center justify-center text-3xl font-bold text-bg shadow-neon">
            F
          </div>
          <h1 className="text-xl font-bold text-txt mb-1 uppercase tracking-[0.1em]">Freestyle Barbershop</h1>
          <p className="text-brand-gold text-[10px] font-bold uppercase tracking-[0.3em]">URBAN GROOMING</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-muted mb-2 uppercase tracking-widest">Usuario</label>
            <input 
              type="text" 
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full bg-bg border border-d3 rounded-lg px-4 py-3 text-txt focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all outline-none text-sm"
              placeholder="ANDRÉS_ADMIN"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-muted mb-2 uppercase tracking-widest">Contraseña</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg border border-d3 rounded-lg px-4 py-3 text-txt focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all outline-none text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-[11px] p-4 rounded-xl flex flex-col gap-1 font-bold uppercase tracking-wide animate-shake">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} />
                <span>Error de Acceso</span>
              </div>
              <p className="font-normal normal-case opacity-90">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-blue hover:bg-brand-blue2 disabled:opacity-50 text-bg font-black py-4 rounded-lg flex items-center justify-center gap-2 transition-all neon-border text-sm uppercase tracking-widest mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
            Acceder al Sistema
          </button>
        </form>
      </motion.div>
      
      <p className="mt-8 text-muted/30 text-[9px] uppercase tracking-[0.4em] font-bold">Freestyle Admin v2.0 • Geometric Edition</p>
    </div>
  );
}
