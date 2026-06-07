import { AppData, User } from './types';
import { parseFechaBogota, parseHoraBogota } from './utils';

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbyVXijFTgUwIKKA9wxCoQ-McPeu3oSw2tzIKNmaliLDkmhY0RCHKbSqKA5Tj_TRjO3D6A/exec';

export const getGasUrl = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('CUSTOM_GAS_URL') || DEFAULT_GAS_URL;
  }
  return DEFAULT_GAS_URL;
};

export const setGasUrl = (url: string) => {
  if (typeof window !== 'undefined') {
    const trimmed = url.trim();
    if (trimmed) {
      localStorage.setItem('CUSTOM_GAS_URL', trimmed);
    } else {
      localStorage.removeItem('CUSTOM_GAS_URL');
    }
  }
};

/**
 * Enhanced fetch for Google Apps Script
 * Note: We send as plain text (no header) to avoid CORS preflight (OPTIONS) which GAS doesn't handle.
 */
const gasFetch = async (action: string, payload: any = {}) => {
  try {
    const url = getGasUrl();
    console.log(`[API Request] ${action} to ${url}`, payload);
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({ action, ...payload }),
    });

    if (!response.ok) {
      throw new Error(`Error de red: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error("Error parseando respuesta:", text);
      throw new Error("La respuesta del servidor no es un JSON válido");
    }

    if (result.status === "error") {
      let msg = result.message || '';
      if (msg.includes("Acción no reconocida") || msg.includes("guardarGasto") || msg.includes("guardarAdelanto") || msg.includes("editarAdelanto")) {
        msg += "\n\n💡 SOLUCIÓN: Tu versión de Google Apps Script está desactualizada y no tiene la acción o tabla requerida. Abre el editor de Apps Script, ingresa a 'Implementar' > 'Administrar implementaciones', edita la implementación activa seleccionando obligatoriamente 'Nueva versión', haz clic en 'Implementar', copia la nueva URL generada y pégala en la pestaña de Configuración.";
      }
      throw new Error(msg);
    }
    
    console.log(`[API Response] ${action}`, result.data);
    return result.data;
  } catch (error: any) {
    console.error(`Error en API [${action}]:`, error);
    throw error;
  }
};

export const api = {
  login: async (usuario: string, password: string): Promise<User> => {
    const u = await gasFetch('login', { usuario, password });
    return {
      ...u,
      id: String(u.id || ''),
      usuario: String(u.usuario || '').trim(),
      nombre: String(u.nombre || '').trim(),
      role: String(u.role || 'barber').toLowerCase().trim() as any,
      activo: u.activo === true || String(u.activo).toUpperCase().trim() === 'TRUE' || String(u.activo).trim() === '1',
      porcentaje: Number(u.porcentaje || 0)
    };
  },
  
  loadAllData: async (): Promise<AppData> => {
    const data = await gasFetch('loadAllData');
    if (!data) return { usuarios: [], servicios: [], productos: [], ventas: [], citas: [], gastos: [], config: [], adelantos: [] };
    
    // Normalize usuarios
    if (data.usuarios && Array.isArray(data.usuarios)) {
      data.usuarios = data.usuarios.map((u: any) => ({
        ...u,
        id: String(u.id || ''),
        usuario: String(u.usuario || '').trim(),
        nombre: String(u.nombre || '').trim(),
        role: String(u.role || 'barber').toLowerCase().trim() as any,
        activo: u.activo === true || String(u.activo).toUpperCase().trim() === 'TRUE' || String(u.activo).trim() === '1',
        porcentaje: Number(u.porcentaje || 0)
      }));
    }
    
    if (data.citas && Array.isArray(data.citas)) {
      data.citas = data.citas.map((c: any) => {
        const normalizedDate = parseFechaBogota(c.fecha);
        const normalizedTime = parseHoraBogota(c.hora);

        const safeTime = normalizedTime || '09:30';
        const safeCliente = c.cliente || 'Sin nombre';
        const fallbackId = `${normalizedDate}_${safeTime}_${String(safeCliente).trim()}`;

        return {
          id: c.id || fallbackId,
          fecha: normalizedDate,
          hora: safeTime,
          cliente: safeCliente,
          telefono: c.telefono || '',
          servicio_id: c.servicio_id || '',
          servicio: c.servicio || '',
          estado: c.estado || 'pendiente',
          barbero: c.barbero || 'Cualquier barbero'
        };
      });
    }

    if (data.ventas && Array.isArray(data.ventas)) {
      data.ventas = data.ventas.map((v: any) => ({
        ...v,
        fecha: parseFechaBogota(v.fecha),
        valor: Number(v.valor || 0),
        cantidad: Number(v.cantidad || 1)
      }));
    }

    if (data.gastos && Array.isArray(data.gastos)) {
      data.gastos = data.gastos.map((g: any) => ({
        ...g,
        fecha: parseFechaBogota(g.fecha),
        monto: Number(g.monto || 0)
      }));
    } else {
      data.gastos = [];
    }
    
    if (data.adelantos && Array.isArray(data.adelantos)) {
      data.adelantos = data.adelantos.map((a: any) => ({
        ...a,
        id: String(a.id || ''),
        fecha: parseFechaBogota(a.fecha),
        usuario: String(a.usuario || '').trim(),
        nombre: String(a.nombre || '').trim(),
        monto: Number(a.monto || 0),
        tipo: String(a.tipo || 'dia').toLowerCase().trim() as any,
        motivo: String(a.motivo || '').trim(),
        estado: String(a.estado || 'pendiente').toLowerCase().trim() as any
      }));
    } else {
      data.adelantos = [];
    }
    
    return data;
  },
  
  saveSale: async (sale: any) => {
    return gasFetch('guardarVenta', { sale });
  },
  
  saveProduct: async (product: any) => {
    return gasFetch('guardarProducto', { product });
  },
  
  editProduct: async (id: string, product: any) => {
    return gasFetch('editarProducto', { id, product });
  },
  
  saveService: async (service: any) => {
    return gasFetch('guardarServicio', { service });
  },
  
  editService: async (id: string, service: any) => {
    return gasFetch('editarServicio', { id, service });
  },
  
  saveUser: async (user: any) => {
    return gasFetch('guardarUsuario', { user });
  },
  
  editUser: async (id: string, user: any) => {
    return gasFetch('editarUsuario', { id, user });
  },
  
  saveAppointment: async (appointment: any) => {
    // Explicitly order keys to match spreadsheet columns A-H from screenshot:
    // A: fecha, B: hora, C: cliente, D: telefono, E: servicio_id, F: servicio, G: estado, H: barbero
    const orderedAppointment = {
      fecha: appointment.fecha,
      hora: appointment.hora,
      cliente: appointment.cliente,
      telefono: appointment.telefono,
      servicio_id: appointment.servicio_id,
      servicio: appointment.servicio,
      estado: appointment.estado || 'pendiente',
      barbero: appointment.barbero,
      id: appointment.id || `cita_${Date.now()}`
    };
    return gasFetch('guardarCita', { appointment: orderedAppointment });
  },
  
  editAppointment: async (id: string, appointment: any) => {
    return gasFetch('editarCita', { id, appointment });
  },
  
  deleteAppointment: async (id: string) => {
    return gasFetch('eliminarCita', { id });
  },
  
  saveExpense: async (expense: any) => {
    return gasFetch('guardarGasto', { expense });
  },
  
  saveAdelanto: async (adelanto: any) => {
    return gasFetch('guardarAdelanto', { adelanto });
  },
  
  editAdelanto: async (id: string, adelanto: any) => {
    return gasFetch('editarAdelanto', { id, adelanto });
  },
  
  updateConfig: async (config: any) => {
    return gasFetch('actualizarConfig', { config });
  }
};
