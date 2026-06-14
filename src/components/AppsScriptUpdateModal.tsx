import React, { useState } from 'react';
import { X, Clipboard, Check, HelpCircle, ExternalLink, RefreshCw } from 'lucide-react';
// @ts-ignore
import rawAppsScript from '../../BACKEND_APPS_SCRIPT.gs?raw';

interface AppsScriptUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage?: string;
}

export default function AppsScriptUpdateModal({ isOpen, onClose, errorMessage }: AppsScriptUpdateModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawAppsScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-d1 border border-brand-gold/30 rounded-2xl shadow-2xl p-6 sm:p-8 animate-fade-in relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-txt transition-colors p-1"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-brand-gold/10 text-brand-gold rounded-xl shrink-0">
            <HelpCircle size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-txt uppercase leading-tight">
              Se requiere actualización en Google Sheets
            </h3>
            <p className="text-xs text-muted mt-1">
              Tu versión actual de Google Apps Script es antigua y no soporta registrar gastos, adelantos o comisiones directamente.
            </p>
          </div>
        </div>

        {/* Error Detail Display */}
        {errorMessage && (
          <div className="bg-danger/5 border border-danger/20 rounded-xl p-4 mb-6">
            <span className="text-[10px] font-black uppercase text-danger tracking-wider block mb-1">Error devuelto por Google:</span>
            <p className="text-[11px] font-mono text-txt leading-tight max-h-[60px] overflow-y-auto pr-1">
              {errorMessage}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Instructions Block */}
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase text-brand-gold tracking-widest block">
              Sigue estos 5 pasos para solucionar esto en 1 minuto:
            </span>

            <div className="space-y-3.5">
              <div className="flex gap-3 text-xs leading-relaxed text-muted">
                <span className="w-5 h-5 rounded-full bg-brand-gold text-bg font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  <button
                    onClick={handleCopy}
                    className="text-brand-gold font-bold hover:underline inline-flex items-center gap-1"
                  >
                    Copia el código actualizado aquí {copied ? <Check size={12} className="inline" /> : <Clipboard size={12} className="inline" />}
                  </button>
                  <p className="text-[11px] mt-0.5">Haz clic arriba para copiar el código completo de la versión v2.0 (con soporte para Gastos, Adelantos y Comisiones).</p>
                </div>
              </div>

              <div className="flex gap-3 text-xs leading-relaxed text-muted">
                <span className="w-5 h-5 rounded-full bg-brand-gold text-bg font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <p className="font-semibold text-txt">Abre tu editor de Google Apps Script</p>
                  <p className="text-[11px] mt-0.5">Ve a tu Google Sheet vinculada, haz clic en el menú superior <b>"Extensiones" ➔ "Apps Script"</b>.</p>
                </div>
              </div>

              <div className="flex gap-3 text-xs leading-relaxed text-muted">
                <span className="w-5 h-5 rounded-full bg-brand-gold text-bg font-bold flex items-center justify-center shrink-0">3</span>
                <div>
                  <p className="font-semibold text-txt">Reemplaza el código anterior</p>
                  <p className="text-[11px] mt-0.5 font-medium">Borra por completo todo el código existente en tu editor (Control+A y Suprimir) y pega el código que acabas de copiar.</p>
                </div>
              </div>

              <div className="flex gap-3 text-xs leading-relaxed text-muted font-bold text-txt">
                <span className="w-5 h-5 rounded-full bg-brand-gold text-bg font-bold flex items-center justify-center shrink-0">4</span>
                <div>
                  <p className="font-semibold text-brand-blue">Publica una "Nueva versión" (¡Crucial!)</p>
                  <p className="text-[11px] text-muted font-normal mt-0.5">
                    Google Sheets no activa los cambios de código si no creas una nueva versión:
                  </p>
                  <ol className="list-decimal list-inside ml-2 mt-1 text-[11px] text-muted space-y-1 font-semibold">
                    <li>Haz clic en el botón azul <b className="text-txt">"Implementar" (Deploy) ➔ "Administrar implementaciones"</b>.</li>
                    <li>Haz clic en el icono del <b className="text-txt">Lápiz de edición</b> al lado de tu implementación actual de Aplicación Web.</li>
                    <li>En el selector de "Versión" (Version), cámbialo obligatoriamente a <b className="text-brand-gold">"Nueva versión" (New version)</b>.</li>
                    <li>Haz clic en el botón azul de abajo <b className="text-txt">"Implementar" (Deploy)</b>.</li>
                    <li>Copia la <b>URL de Aplicación Web</b> generada.</li>
                  </ol>
                </div>
              </div>

              <div className="flex gap-3 text-xs leading-relaxed text-muted">
                <span className="w-5 h-5 rounded-full bg-brand-blue text-bg font-bold flex items-center justify-center shrink-0">5</span>
                <div>
                  <p className="font-semibold text-txt">Actualiza la conexión en la App</p>
                  <p className="text-[11px] mt-0.5">Ve a la sección <b>Configuración</b> de esta aplicación móvil, pega la nueva URL de la web app en el campo correspondiente y haz clic en <b>"Guardar Cambios"</b>.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button Strip */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
            <button
              onClick={handleCopy}
              className={`flex-1 ${copied ? 'bg-success text-white' : 'bg-brand-gold text-bg'} font-black text-xs uppercase tracking-wider py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2`}
            >
              {copied ? (
                <>
                  <Check size={16} /> ¡CÓDIGO DE BACKEND COPIADO!
                </>
              ) : (
                <>
                  <Clipboard size={16} /> COPIAR CÓDIGO DE BACKEND (v2.0)
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3.5 bg-d3 border border-white/5 text-xs text-muted hover:text-txt uppercase font-black tracking-wider rounded-xl transition-all"
            >
              Cerrar e intentar luego
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
