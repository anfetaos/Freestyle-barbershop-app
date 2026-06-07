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
      const isUnrecognizedFallback = (msg.includes("Acción no reconocida") || msg.includes("guardarGasto") || msg.includes("guardarAdelanto") || msg.includes("editarAdelanto")) && (action === "guardarGasto" || action === "guardarAdelanto" || action === "editarAdelanto");
      if (isUnrecognizedFallback) {
        console.warn(`[API Info] La acción '${action}' no está disponible en este backend. Activando fallback local.`);
        return { _isFallbackError: true, message: msg };
      }

      if (msg.includes("Acción no reconocida") || msg.includes("guardarGasto")) {
        msg += "\n\n💡 SOLUCIÓN: Tu versión de Google Apps Script está desactualizada y no tiene la acción o tabla requerida. Abre el editor de Apps Script, ingresa a 'Implementar' > 'Administrar implementaciones', edita la implementación activa seleccionando obligatoriamente 'Nueva versión', haz clic en 'Implementar', copia la nueva URL generada y pégala en la pestaña de Configuración.";
      }
      throw new Error(msg);
    }
    
    console.log(`[API Response] ${action}`, result.data);
    return result.data;
  } catch (error: any) {
    const isUnrecognized = error.message && (error.message.includes("Acción no reconocida") || error.message.includes("guardarGasto") || error.message.includes("guardarAdelanto") || error.message.includes("editarAdelanto")) && (action === "guardarGasto" || action === "guardarAdelanto" || action === "editarAdelanto");
    if (!isUnrecognized) {
      console.error(`Error en API [${action}]:`, error);
    } else {
      console.warn(`[API Notice] Error manejado de acción no reconocida en '${action}':`, error.message);
    }
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

    let localExpenses: any[] = [];
    let localAdelantos: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        localExpenses = JSON.parse(localStorage.getItem('LOCAL_EXPENSES') || '[]');
      } catch (e) {
        console.error("Error reading LOCAL_EXPENSES:", e);
      }
      try {
        localAdelantos = JSON.parse(localStorage.getItem('LOCAL_ADELANTOS') || '[]');
      } catch (e) {
        console.error("Error reading LOCAL_ADELANTOS:", e);
      }
    }

    if (data.gastos && Array.isArray(data.gastos)) {
      data.gastos = [
        ...data.gastos.map((g: any) => ({
          ...g,
          fecha: parseFechaBogota(g.fecha),
          monto: Number(g.monto || 0)
        })),
        ...localExpenses
      ];
    } else {
      data.gastos = localExpenses;
    }
    
    if (data.adelantos && Array.isArray(data.adelantos)) {
      data.adelantos = [
        ...data.adelantos.map((a: any) => ({
          ...a,
          id: String(a.id || ''),
          fecha: parseFechaBogota(a.fecha),
          usuario: String(a.usuario || '').trim(),
          nombre: String(a.nombre || '').trim(),
          monto: Number(a.monto || 0),
          tipo: String(a.tipo || 'dia').toLowerCase().trim() as any,
          motivo: String(a.motivo || '').trim(),
          estado: String(a.estado || 'pendiente').toLowerCase().trim() as any
        })),
        ...localAdelantos
      ];
    } else {
      data.adelantos = localAdelantos;
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
    try {
      const res = await gasFetch('guardarGasto', { expense });
      if (res && res._isFallbackError) {
        console.warn("La acción 'guardarGasto' retornó error de fallback. Guardando localmente en localStorage...");
        if (typeof window !== 'undefined') {
          let localExpenses = [];
          try {
            localExpenses = JSON.parse(localStorage.getItem('LOCAL_EXPENSES') || '[]');
          } catch (e) {}
          localExpenses.push({
            ...expense,
            id: `local_g_${Date.now()}`,
            fecha: expense.fecha || new Date().toISOString().split('T')[0],
            monto: Number(expense.monto || 0),
            categoria: expense.categoria || 'Varios',
            descripcion: expense.descripcion || '',
            usuario: expense.usuario || 'Socio'
          });
          localStorage.setItem('LOCAL_EXPENSES', JSON.stringify(localExpenses));
        }
        return { status: "success", local: true };
      }
      return res;
    } catch (err: any) {
      if (err.message && (err.message.includes("Acción no reconocida") || err.message.includes("guardarGasto"))) {
        console.warn("La acción 'guardarGasto' falló. Guardando localmente en localStorage...");
        if (typeof window !== 'undefined') {
          let localExpenses = [];
          try {
            localExpenses = JSON.parse(localStorage.getItem('LOCAL_EXPENSES') || '[]');
          } catch (e) {}
          localExpenses.push({
            ...expense,
            id: `local_g_${Date.now()}`,
            fecha: expense.fecha || new Date().toISOString().split('T')[0],
            monto: Number(expense.monto || 0),
            categoria: expense.categoria || 'Varios',
            descripcion: expense.descripcion || '',
            usuario: expense.usuario || 'Socio'
          });
          localStorage.setItem('LOCAL_EXPENSES', JSON.stringify(localExpenses));
        }
        return { status: "success", local: true };
      }
      throw err;
    }
  },
  
  saveAdelanto: async (adelanto: any) => {
    try {
      const res = await gasFetch('guardarAdelanto', { adelanto });
      if (res && res._isFallbackError) {
        console.warn("La acción 'guardarAdelanto' retornó error de fallback. Guardando localmente en localStorage...");
        if (typeof window !== 'undefined') {
          let localAdelantos = [];
          try {
            localAdelantos = JSON.parse(localStorage.getItem('LOCAL_ADELANTOS') || '[]');
          } catch (e) {}
          localAdelantos.push({
            ...adelanto,
            id: adelanto.id || `local_ad_${Date.now()}`,
            fecha: adelanto.fecha || new Date().toISOString().split('T')[0],
            usuario: String(adelanto.usuario || '').trim(),
            nombre: String(adelanto.nombre || '').trim(),
            monto: Number(adelanto.monto || 0),
            tipo: String(adelanto.tipo || 'dia').toLowerCase().trim() as any,
            motivo: String(adelanto.motivo || '').trim(),
            estado: String(adelanto.estado || 'pendiente').toLowerCase().trim() as any
          });
          localStorage.setItem('LOCAL_ADELANTOS', JSON.stringify(localAdelantos));
        }
        return { status: "success", local: true };
      }
      return res;
    } catch (err: any) {
      if (err.message && (err.message.includes("Acción no reconocida") || err.message.includes("guardarAdelanto"))) {
        console.warn("La acción 'guardarAdelanto' falló. Guardando localmente.");
        if (typeof window !== 'undefined') {
          let localAdelantos = [];
          try {
            localAdelantos = JSON.parse(localStorage.getItem('LOCAL_ADELANTOS') || '[]');
          } catch (e) {}
          localAdelantos.push({
            ...adelanto,
            id: adelanto.id || `local_ad_${Date.now()}`,
            fecha: adelanto.fecha || new Date().toISOString().split('T')[0],
            usuario: String(adelanto.usuario || '').trim(),
            nombre: String(adelanto.nombre || '').trim(),
            monto: Number(adelanto.monto || 0),
            tipo: String(adelanto.tipo || 'dia').toLowerCase().trim() as any,
            motivo: String(adelanto.motivo || '').trim(),
            estado: String(adelanto.estado || 'pendiente').toLowerCase().trim() as any
          });
          localStorage.setItem('LOCAL_ADELANTOS', JSON.stringify(localAdelantos));
        }
        return { status: "success", local: true };
      }
      throw err;
    }
  },
  
  editAdelanto: async (id: string, adelanto: any) => {
    try {
      const res = await gasFetch('editarAdelanto', { id, adelanto });
      if (res && res._isFallbackError) {
        console.warn("La acción 'editarAdelanto' retornó error de fallback. Guardando localmente...");
        if (typeof window !== 'undefined') {
          let localAdelantos = [];
          try {
            localAdelantos = JSON.parse(localStorage.getItem('LOCAL_ADELANTOS') || '[]');
          } catch (e) {}
          
          localAdelantos = localAdelantos.map((item: any) => {
            if (String(item.id) === String(id)) {
              return { ...item, ...adelanto };
            }
            return item;
          });
          localStorage.setItem('LOCAL_ADELANTOS', JSON.stringify(localAdelantos));
        }
        return { status: "success", local: true };
      }
      return res;
    } catch (err: any) {
      if (err.message && (err.message.includes("Acción no reconocida") || err.message.includes("editarAdelanto") || err.message.includes("guardarAdelanto"))) {
        console.warn("La acción 'editarAdelanto' falló. Editando localmente...");
        if (typeof window !== 'undefined') {
          let localAdelantos = [];
          try {
            localAdelantos = JSON.parse(localStorage.getItem('LOCAL_ADELANTOS') || '[]');
          } catch (e) {}
          
          localAdelantos = localAdelantos.map((item: any) => {
            if (String(item.id) === String(id)) {
              return { ...item, ...adelanto };
            }
            return item;
          });
          localStorage.setItem('LOCAL_ADELANTOS', JSON.stringify(localAdelantos));
        }
        return { status: "success", local: true };
      }
      throw err;
    }
  },
  
  updateConfig: async (config: any) => {
    return gasFetch('actualizarConfig', { config });
  }
};
