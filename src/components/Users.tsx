import React, { useState } from 'react';
import { Plus, Edit2, Users as UsersIcon, Search, Loader2, Shield, Percent } from 'lucide-react';
import { AppData, User } from '../types';
import { api } from '../api';
import { cn } from '../utils';
import { motion } from 'motion/react';

export default function Users({ data, onRefresh }: { data: AppData, onRefresh: () => void }) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<User>>({
    usuario: '',
    password: '',
    nombre: '',
    role: 'barber',
    activo: true,
    porcentaje: 60
  });

  const filtered = data.usuarios.filter(u => 
    u.nombre.toLowerCase().includes(search.toLowerCase()) ||
    u.usuario.toLowerCase().includes(search.toLowerCase())
  );

  const openForm = (user?: User) => {
    if (user) {
      setSelectedUser(user);
      setFormData(user);
    } else {
      setSelectedUser(null);
      setFormData({
        usuario: '',
        password: '',
        nombre: '',
        role: 'barber',
        activo: true,
        porcentaje: 60
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (selectedUser) {
        await api.editUser(selectedUser.id, formData);
      } else {
        await api.saveUser(formData);
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="glass-card flex-1 px-4 py-2 flex items-center gap-3">
          <Search className="text-muted" size={18} />
          <input 
            type="text" 
            placeholder="Buscar personal..."
            className="bg-transparent border-none outline-none text-txt text-sm w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => openForm()}
          className="bg-brand-blue hover:bg-brand-blue2 text-bg px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg neon-border"
        >
          <Plus size={18} /> AGREGAR PERSONAL
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(u => (
          <div key={u.id} className="glass-card overflow-hidden group">
            <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
               <div className="w-12 h-12 rounded-full bg-d3 flex items-center justify-center text-brand-blue font-bold text-xl border border-white/10">
                 {u.nombre.charAt(0)}
               </div>
               <div className={cn(
                 "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                 u.activo ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
               )}>
                 {u.activo ? 'ACTIVO' : 'INACTIVO'}
               </div>
            </div>
            
            <div className="p-5">
              <p className="text-lg font-bold text-txt mb-1 uppercase tracking-wide">{u.nombre}</p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex-1">
                   <p className="text-[10px] text-muted uppercase font-bold flex items-center gap-1"><Shield size={10} /> ROL</p>
                   <p className="text-xs font-bold text-brand-blue uppercase">{u.role}</p>
                </div>
                {u.role === 'barber' && (
                  <div className="flex-1">
                    <p className="text-[10px] text-muted uppercase font-bold flex items-center gap-1"><Percent size={10} /> COMISIÓN</p>
                    <p className="text-xs font-bold text-brand-gold">{u.porcentaje}%</p>
                  </div>
                )}
                <button 
                  onClick={() => openForm(u)}
                  className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-brand-blue transition-all"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-d2 border border-white/10 rounded-2xl p-8 relative z-10"
          >
            <h2 className="text-xl font-bold text-txt mb-6 text-center uppercase tracking-widest">
              {selectedUser ? 'EDITAR USUARIO' : 'NUEVO USUARIO'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs uppercase font-bold text-muted mb-2">Nombre Completo</label>
                  <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt outline-none focus:border-brand-blue" />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-muted mb-2">Usuario</label>
                  <input type="text" required value={formData.usuario} onChange={e => setFormData({...formData, usuario: e.target.value})} className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt outline-none focus:border-brand-blue" />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-muted mb-2">Contraseña</label>
                  <input type="password" required={!selectedUser} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt outline-none focus:border-brand-blue" />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-muted mb-2">Rol</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})} className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt outline-none focus:border-brand-blue appearance-none">
                    <option value="barber">Barbero</option>
                    <option value="owner">Dueño / Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-muted mb-2">Comisión (%)</label>
                  <input type="number" value={formData.porcentaje} onChange={e => setFormData({...formData, porcentaje: parseInt(e.target.value)})} className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt outline-none focus:border-brand-blue" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="activeUser" checked={formData.activo} onChange={e => setFormData({...formData, activo: e.target.checked})} className="w-4 h-4 rounded bg-bg border-white/10 text-brand-blue" />
                <label htmlFor="activeUser" className="text-xs uppercase font-bold text-muted">Usuario Activo</label>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 text-muted border border-white/10 rounded-xl font-bold hover:bg-white/5">CANCELAR</button>
                <button type="submit" disabled={loading} className="flex-1 bg-brand-blue text-bg px-4 py-3 rounded-xl font-bold shadow-lg hover:bg-brand-blue2 flex items-center justify-center gap-2">
                   {loading ? <Loader2 size={20} className="animate-spin" /> : 'GUARDAR'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
