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
    return gasFetch('loadAllData');
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
    return gasFetch('guardarCita', { appointment });
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
