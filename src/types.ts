/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  usuario: string;
  password?: string;
  nombre: string;
  role: 'owner' | 'barber' | 'barbero';
  activo: boolean;
  porcentaje: number;
}

export interface Service {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  duracion: number; // in minutes
  activo: boolean;
}

export interface Product {
  id: string;
  nombre: string;
  categoria: string;
  costo: number;
  venta: number;
  stock: number;
  activo: boolean;
}

export interface SaleItem {
  id: string;
  nombre: string;
  tipo: 'servicio' | 'producto';
  valor: number;
  cantidad: number;
  comisionable: boolean;
}

export interface Sale {
  fecha: string;
  tipo: 'servicio' | 'producto';
  item_id: string;
  item_nombre: string;
  valor: number;
  cantidad: number;
  usuario: string;
  comisionable: boolean;
}

export interface Appointment {
  id?: string;
  fecha: string;
  hora: string;
  cliente: string;
  telefono: string;
  servicio_id: string;
  servicio: string;
  barbero: string;
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'finalizada' | 'no_asistio';
}

export interface Expense {
  fecha: string;
  categoria: string;
  descripcion: string;
  monto: number;
  usuario: string;
}

export interface Config {
  key: string;
  value: string;
  tipo: 'string' | 'number' | 'boolean';
}

export interface AppData {
  usuarios: User[];
  servicios: Service[];
  productos: Product[];
  ventas: Sale[];
  citas: Appointment[];
  gastos: Expense[];
  config: Config[];
}
