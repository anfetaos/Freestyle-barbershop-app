import React, { useState } from 'react';
import { Save, LogOut, Settings as SettingsIcon, Globe, Instagram, MessageSquare, CreditCard, Percent, Loader2, Share2, Clipboard, Server, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { AppData, Config } from '../types';
import { api, getGasUrl, setGasUrl } from '../api';
// @ts-ignore
import rawAppsScript from '../../BACKEND_APPS_SCRIPT.gs?raw';

export default function Settings({ data, onRefresh }: { data: AppData, onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [customGasUrl, setCustomGasUrl] = useState(() => getGasUrl());
  const [showCode, setShowCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
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

  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleTestConnection = async () => {
    const trimmedUrl = customGasUrl.trim();
    if (!trimmedUrl) {
      setTestState('error');
      setTestMessage('Por favor ingresa una URL válida.');
      return;
    }
    
    setTestState('testing');
    setTestMessage('');
    try {
      setGasUrl(trimmedUrl);
      const res = await api.ping(trimmedUrl);
      setTestState('success');
      setTestMessage(`¡Conexión Exitosa con Google Sheet! Versión detectada: ${res.version || '2.0'}. Esta versión ya soporta plenamente el registro de Gastos, Adelantos y Comisiones de Barberos.`);
      onRefresh();
    } catch (err: any) {
      console.error("Test connection error:", err);
      const errMsg = err.message || String(err);
      setTestState('error');
      
      if (errMsg.includes("Acción no reconocida") || errMsg.includes("ping")) {
        setTestMessage("⚠️ VERSIÓN OBSOLETA EN GOOGLE DOCS: Tu Google Sheet respondió correctamente, pero tiene grabada una versión vieja del código. Recuerda que al actualizar el código en Google Apps Script, es OBLIGATORIO ir a 'Implementar' > 'Administrar implementaciones', editar la Web App activa y seleccionar 'Nueva versión' en el selector de versión antes de presionar 'Implementar'. De lo contrario Google seguirá ejecutando tu código antiguo.");
      } else if (errMsg.includes("JSON") || errMsg.includes("preflight") || errMsg.includes("CORS") || errMsg.includes("no es un JSON válido")) {
        setTestMessage("❌ ENLACE INCORRECTO: La respuesta de Google no es del tipo esperado. Esto suele ocurrir cuando pegas el enlace normal del navegador del Google Sheet (con /edit) en vez del enlace de Aplicación Web (Web App URL que termina en /exec) generado tras 'Implementar' en el editor de Apps Script.");
      } else {
        setTestMessage(`❌ ERROR DE ACCESO: ${errMsg}. Asegúrate de haber publicado la Web App con acceso configurado para 'Cualquier persona' (Anyone), de lo contrario la aplicación web pública del salón no tendrá permisos para registrar los datos.`);
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      setGasUrl(customGasUrl);
      await api.updateConfig(configs);
      onRefresh();
      alert('Configuración actualizada con éxito');
    } catch (err: any) {
      console.error(err);
      alert('Error guardando configuración: ' + (err.message || err));
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

      {/* Google Apps Script Backend Connection card */}
      <div className="glass-card p-8 border-brand-gold/30 bg-brand-gold/5">
        <h3 className="text-lg font-bold text-txt mb-4 flex items-center gap-2 uppercase tracking-tighter">
          <Server size={20} className="text-brand-gold" /> Conexión con Google Sheets (Backend)
        </h3>
        <p className="text-xs text-muted mb-6">
          La base de datos de esta aplicación está en Google Sheets mediante un script de Google Apps Script. 
          Si hiciste cambios en el código de tu Apps Script y creaste una nueva implementación o cambiaste de hoja, pega aquí la nueva <b>URL de Web App</b>.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-muted mb-2 tracking-widest">URL de Web App (Google Apps Script)</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={customGasUrl}
                onChange={(e) => {
                  setCustomGasUrl(e.target.value);
                  setTestState('idle');
                }}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 bg-bg border border-white/10 rounded-lg px-4 py-2.5 text-[11px] text-txt outline-none focus:border-brand-blue font-mono text-brand-gold truncate"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testState === 'testing'}
                className="bg-brand-gold text-bg px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shrink-0 flex items-center justify-center gap-1.5"
              >
                {testState === 'testing' ? <Loader2 size={14} className="animate-spin" /> : null}
                {testState === 'testing' ? 'PROBANDO...' : 'PROBAR CONEXIÓN'}
              </button>
            </div>

            {/* Connection Test Result Messages */}
            {testState === 'success' && (
              <div className="mt-3 p-4 bg-success/10 border border-success/20 rounded-xl text-xs text-emerald-400 animate-fade-in leading-relaxed">
                ✔️ {testMessage}
              </div>
            )}
            {testState === 'error' && (
              <div className="mt-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 animate-fade-in leading-relaxed">
                {testMessage}
              </div>
            )}
          </div>
          <div className="p-4 bg-bg/50 border border-white/5 rounded-xl text-xs leading-relaxed text-muted space-y-2">
            <p>
              💡 <b>¿Por qué sale el error "Acción no reconocida"?</b><br />
              Google Apps Script de manera predeterminada ejecuta la foto de código (versión snapshot) que estaba guardada cuando realizaste la implementación. 
              Si editas el script (por ejemplo, para agregar <code>guardarGasto</code> o <code>guardarAdelanto</code>):
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-1 font-semibold text-txt">
              <li>Haz clic en <b>"Implementar" (Deploy)</b> en el editor de Apps Script.</li>
              <li>Selecciona <b>"Administrar implementaciones" (Manage deployments)</b>.</li>
              <li>Haz clic en el lápiz para <b>editar</b> la implementación activa de tipo "Aplicación web" (Web App).</li>
              <li>En "Versión" (Version), selecciona obligatoriamente <b>"Nueva versión" (New version)</b>.</li>
              <li>Haz clic en <b>"Implementar" (Deploy)</b> y asegúrate de copiar la URL generada.</li>
            </ol>
            <p className="pt-1 text-[11px]">
              Una vez implementada la nueva versión, pega la URL arriba y haz clic en "Guardar Cambios".
            </p>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-3">
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="flex items-center justify-between w-full p-3 bg-bg/40 hover:bg-bg/80 border border-white/5 rounded-xl text-xs text-muted hover:text-txt uppercase font-black tracking-widest transition-all"
            >
              <span className="flex items-center gap-2">
                📋 Código de Google Apps Script (v2.0)
              </span>
              {showCode ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showCode && (
              <div className="space-y-3 animate-fade-in text-left">
                <p className="text-[11px] text-muted leading-relaxed">
                  Copia este código e ingrésalo en tu editor de Google Apps Script para actualizar la API de tu hoja de cálculo a la versión <b>v2.0</b>. Esto habilitará todas las nuevas funciones como la <b>Liquidación de Comisiones</b> y el registro de egresos de caja.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(rawAppsScript);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2500);
                    }}
                    className="flex items-center justify-center gap-2 bg-brand-gold hover:bg-brand-gold/90 text-bg text-[11px] font-black uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all"
                  >
                    {copiedCode ? (
                      <>
                        <Check size={14} /> ¡Copiado con Éxito!
                      </>
                    ) : (
                      <>
                        <Clipboard size={14} /> Copiar Código Completo
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-bg/95 border border-white/10 rounded-xl p-4 overflow-x-auto max-h-[300px] overflow-y-auto font-mono text-[10px] text-brand-gold leading-tight select-all">
                  <pre>{rawAppsScript}</pre>
                </div>
              </div>
            )}
          </div>
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

