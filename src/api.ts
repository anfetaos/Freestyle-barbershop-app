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
    if (!data) return { usuarios: [], servicios: [], productos: [], ventas: [], citas: [], gastos: [], config: [] };
    
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
    
    const normalizeDateStr = (rawDate: any): string => {
      if (!rawDate) return new Date().toISOString().split('T')[0];
      const dateStr = String(rawDate).trim();
      
      // If it contains a date that has 1899-12-30 (Google representation of time value without a date)
      if (dateStr.includes('1899-12-30')) {
        // Use today's local date
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }

      // If it's a full ISO string (e.g., 2026-05-20T01:46:40.000Z)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}T/)) {
        return dateStr.split('T')[0];
      }
      
      // Try to parse standard representation safely in local timezone
      try {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          const yyyy = parsed.getFullYear();
          const mm = String(parsed.getMonth() + 1).padStart(2, '0');
          const dd = String(parsed.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        }
      } catch (e) {}

      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }
      return dateStr;
    };

    if (data.citas && Array.isArray(data.citas)) {
      data.citas = data.citas.map((c: any) => {
        const normalizedDate = normalizeDateStr(c.fecha);
        
        // Normalize hora: extract time if it's a full ISO string
        let normalizedTime = c.hora;
        if (typeof normalizedTime === 'string' && normalizedTime.match(/^\d{4}-\d{2}-\d{2}T/)) {
          normalizedTime = normalizedTime.split('T')[1].substring(0, 5);
        }

        return {
          id: c.id || String(c.fecha) + String(c.hora) + String(c.cliente),
          fecha: normalizedDate,
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

    if (data.ventas && Array.isArray(data.ventas)) {
      data.ventas = data.ventas.map((v: any) => ({
        ...v,
        fecha: normalizeDateStr(v.fecha),
        valor: Number(v.valor || 0),
        cantidad: Number(v.cantidad || 1)
      }));
    }

    if (data.gastos && Array.isArray(data.gastos)) {
      data.gastos = data.gastos.map((g: any) => ({
        ...g,
        fecha: normalizeDateStr(g.fecha),
        monto: Number(g.monto || 0)
      }));
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
