import { AppData, User } from './types';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyVXijFTgUwIKKA9wxCoQ-McPeu3oSw2tzIKNmaliLDkmhY0RCHKbSqKA5Tj_TRjO3D6A/exec';

/**
 * Enhanced fetch for Google Apps Script
 * Note: We send as plain text (no header) to avoid CORS preflight (OPTIONS) which GAS doesn't handle.
 */
const gasFetch = async (action: string, payload: any = {}) => {
  try {
    console.log(`[API Request] ${action}`, payload);
    const response = await fetch(GAS_URL, {
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

    if (result.status === "error") throw new Error(result.message);
    
    console.log(`[API Response] ${action}`, result.data);
    return result.data;
  } catch (error: any) {
    console.error(`Error en API [${action}]:`, error);
    throw error;
  }
};

export const api = {
  login: async (usuario: string, password: string): Promise<User> => {
    return gasFetch('login', { usuario, password });
  },
  
  loadAllData: async (): Promise<AppData> => {
    const data = await gasFetch('loadAllData');
    if (!data) return { usuarios: [], servicios: [], productos: [], ventas: [], citas: [], gastos: [], config: [] };
    
    if (data.citas && Array.isArray(data.citas)) {
      data.citas = data.citas.map((c: any) => {
        // Normalize fecha: extract YYYY-MM-DD if it's a full ISO string
        let normalizedDate = c.fecha;
        if (typeof normalizedDate === 'string' && normalizedDate.match(/^\d{4}-\d{2}-\d{2}T/)) {
          normalizedDate = normalizedDate.split('T')[0];
        } else if (typeof normalizedDate === 'string' && normalizedDate.includes('1899-12-30')) {
          // This happens when Sheets has a time value in a date column
          // We might need to look at another column or just default to today
          normalizedDate = new Date().toISOString().split('T')[0];
        }

        // Normalize hora: extract time if it's a full ISO string
        let normalizedTime = c.hora;
        if (typeof normalizedTime === 'string' && normalizedTime.match(/^\d{4}-\d{2}-\d{2}T/)) {
          normalizedTime = normalizedTime.split('T')[1].substring(0, 5);
        }

        return {
          id: c.id || String(c.fecha) + String(c.hora) + String(c.cliente),
          fecha: normalizedDate || new Date().toISOString().split('T')[0],
          hora: normalizedTime || '09:00',
          cliente: c.cliente || 'Sin nombre',
          telefono: c.telefono || '',
          servicio_id: c.servicio_id || '',
          servicio: c.servicio || '',
          estado: c.estado || 'pendiente',
          barbero: c.barbero || 'Cualquier barbero'
        };
      });
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
  
  saveExpense: async (expense: any) => {
    return gasFetch('guardarGasto', { expense });
  },
  
  updateConfig: async (config: any) => {
    return gasFetch('actualizarConfig', { config });
  }
};
