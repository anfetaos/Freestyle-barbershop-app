import React, { useState } from 'react';
import { Save, LogOut, Settings as SettingsIcon, Globe, Instagram, MessageSquare, CreditCard, Percent, Loader2, Share2, Clipboard } from 'lucide-react';
import { AppData, Config } from '../types';
import { api } from '../api';

export default function Settings({ data, onRefresh }: { data: AppData, onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  
  // Define expected configuration keys
  const defaultKeys = [
    { key: 'nombre_barberia', label: 'Nombre de la Barbería', tipo: 'text' },
    { key: 'telefono', label: 'Teléfono', tipo: 'text' },
    { key: 'direccion', label: 'Dirección', tipo: 'text' },
    { key: 'instagram', label: 'Instagram', tipo: 'text' },
    { key: 'whatsapp', label: 'WhatsApp', tipo: 'text' },
    { key: 'iva', label: 'IVA (%)', tipo: 'number' },
    { key: 'moneda', label: 'Moneda (Símbolo)', tipo: 'text' },
  ];

  // Initialize state ensuring all keys exist
  const [configs, setConfigs] = useState<Config[]>(() => {
    const existing = data.config || [];
    return defaultKeys.map(d => {
      const found = existing.find(c => c.key === d.key);
      return found || { key: d.key, value: '', tipo: d.tipo };
    });
  });

  const updateVal = (key: string, val: string) => {
    setConfigs(configs.map(c => c.key === key ? { ...c, value: val } : c));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.updateConfig(configs);
      onRefresh();
      alert('Configuración actualizada');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const bookingUrl = window.location.href.split('#')[0].split('?')[0] + '#/reservar';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookingUrl);
    alert('Link copiado al portapapeles');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Link de Agendamiento Section */}
      <div className="glass-card p-8 border-brand-blue/30 bg-brand-blue/5">
        <h3 className="text-lg font-bold text-txt mb-4 flex items-center gap-2 uppercase tracking-tighter">
          <Share2 size={20} className="text-brand-blue" /> Link de Agendamiento Online
        </h3>
        <p className="text-xs text-muted mb-6">Comparte este link con tus clientes en Instagram o WhatsApp para que ellos mismos agenden sus citas.</p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 bg-bg border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-brand-blue truncate">
            {bookingUrl}
          </div>
          <button 
            onClick={copyToClipboard}
            className="btn-primary py-3 px-6 text-xs flex items-center justify-center gap-2"
          >
            <Clipboard size={16} /> COPIAR LINK
          </button>
        </div>
      </div>

      <div className="glass-card p-8">
        <h3 className="text-lg font-bold text-txt mb-8 flex items-center gap-2 uppercase tracking-tighter">
          <Globe size={20} className="text-brand-blue" /> INFORMACIÓN DE LA BARBERÍA
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-4">
              {configs.filter(c => ['nombre_barberia', 'telefono', 'direccion', 'whatsapp', 'instagram'].includes(c.key)).map((config) => {
                const label = defaultKeys.find(k => k.key === config.key)?.label || config.key;
                return (
                  <div key={config.key}>
                    <label className="block text-[10px] uppercase font-bold text-muted mb-2 tracking-widest">{label}</label>
                    <input 
                      type="text" 
                      value={config.value}
                      onChange={(e) => updateVal(config.key, e.target.value)}
                      className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt outline-none focus:border-brand-blue"
                    />
                  </div>
                );
              })}
           </div>
           
           <div className="space-y-4">
              <div className="p-6 bg-brand-blue/5 border border-brand-blue/10 rounded-2xl flex flex-col items-center justify-center text-center h-full">
                 <div className="w-16 h-16 rounded-full border-2 border-dashed border-brand-blue/30 flex items-center justify-center text-brand-blue/50 mb-3">
                   <SettingsIcon size={32} />
                 </div>
                 <p className="text-xs text-muted">Ajusta los detalles visuales y de contacto de tu negocio.</p>
              </div>
           </div>
        </div>
      </div>

      <div className="glass-card p-8">
         <h3 className="text-lg font-bold text-txt mb-8 flex items-center gap-2">
          <Percent size={20} className="text-brand-gold" /> PARÁMETROS DE OPERACIÓN
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {configs.filter(c => ['iva', 'moneda'].includes(c.key)).map((config) => {
                const label = defaultKeys.find(k => k.key === config.key)?.label || config.key;
                return (
                  <div key={config.key}>
                    <label className="block text-[10px] uppercase font-bold text-muted mb-2 tracking-widest">{label}</label>
                    <div className="relative">
                        <input 
                          type="text" 
                          value={config.value}
                          onChange={(e) => updateVal(config.key, e.target.value)}
                          className="w-full bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-txt outline-none focus:border-brand-blue pr-12"
                        />
                        <span className="absolute right-4 top-2.5 text-muted text-xs font-bold uppercase">
                          {config.key === 'iva' ? '%' : ''}
                        </span>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleSave}
          disabled={loading}
          className="bg-brand-blue hover:bg-brand-blue2 text-bg px-12 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg neon-border"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          GUARDAR CAMBIOS
        </button>
      </div>
    </div>
  );
}

