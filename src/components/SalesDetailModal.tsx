import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Scissors, 
  ShoppingBag, 
  Users, 
  TrendingUp, 
  Coins, 
  ArrowUpDown, 
  Layers,
  ChevronRight,
  Package,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Sale, Product, Service } from '../types';
import { formatCurrency, cn } from '../utils';

interface SalesDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  products: Product[];
  services: Service[];
  initialTab?: 'todos' | 'servicios' | 'productos';
  filterLabel: string;
}

type SortField = 'nombre' | 'subtotal' | 'cantidad';
type SortOrder = 'asc' | 'desc';

export default function SalesDetailModal({
  isOpen,
  onClose,
  sales,
  products,
  services,
  initialTab = 'todos',
  filterLabel
}: SalesDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'todos' | 'servicios' | 'productos'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('subtotal');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Keep internal tab in sync if initialTab changes
  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Global counts & stats
  const totalSalesCount = sales.length;
  const totalSalesVal = sales.reduce((acc, v) => acc + (v.valor * v.cantidad), 0);
  
  const serviceSalesCount = sales.filter(s => s.tipo === 'servicio').length;
  const serviceSalesVal = sales.filter(s => s.tipo === 'servicio').reduce((acc, v) => acc + (v.valor * v.cantidad), 0);
  
  const productSalesCount = sales.filter(s => s.tipo === 'producto').length;
  const productSalesVal = sales.filter(s => s.tipo === 'producto').reduce((acc, v) => acc + (v.valor * v.cantidad), 0);

  // Profitability calculations
  const productCostSum = sales
    .filter(s => s.tipo === 'producto')
    .reduce((acc, s) => {
      const p = products.find(prod => prod.id === s.item_id);
      const unitCost = p ? (p.costo || 0) : 0;
      return acc + (unitCost * s.cantidad);
    }, 0);
  const netProductProfit = productSalesVal - productCostSum;

  // Grouped Services Analysis
  const groupedServices = useMemo(() => {
    const map: Record<string, {
      id: string;
      nombre: string;
      cantidad: number;
      valorUnitario: number;
      subtotal: number;
      barberos: Record<string, number>; // username -> count
    }> = {};

    sales.filter(s => s.tipo === 'servicio').forEach(sale => {
      const key = sale.item_id || sale.item_nombre;
      if (!map[key]) {
        map[key] = {
          id: sale.item_id,
          nombre: sale.item_nombre || 'Servicio Desconocido',
          cantidad: 0,
          valorUnitario: sale.valor,
          subtotal: 0,
          barberos: {}
        };
      }
      map[key].cantidad += sale.cantidad;
      map[key].subtotal += (sale.valor * sale.cantidad);
      
      const bUsername = sale.usuario || 'Socio';
      map[key].barberos[bUsername] = (map[key].barberos[bUsername] || 0) + sale.cantidad;
    });

    return Object.values(map);
  }, [sales]);

  // Grouped Products Analysis
  const groupedProducts = useMemo(() => {
    const map: Record<string, {
      id: string;
      nombre: string;
      cantidad: number;
      valorUnitario: number;
      subtotal: number;
      costoUnitario: number;
      costoTotal: number;
      utilidad: number;
      stockActual: number;
      activo: boolean;
      barberos: Record<string, number>; // who sold it
    }> = {};

    sales.filter(s => s.tipo === 'producto').forEach(sale => {
      const key = sale.item_id || sale.item_nombre;
      if (!map[key]) {
        const matchingProd = products.find(p => p.id === sale.item_id);
        map[key] = {
          id: sale.item_id,
          nombre: sale.item_nombre || 'Producto Desconocido',
          cantidad: 0,
          valorUnitario: sale.valor,
          subtotal: 0,
          costoUnitario: matchingProd ? matchingProd.costo : 0,
          costoTotal: 0,
          utilidad: 0,
          stockActual: matchingProd ? matchingProd.stock : 0,
          activo: matchingProd ? matchingProd.activo : true,
          barberos: {}
        };
      }
      map[key].cantidad += sale.cantidad;
      map[key].subtotal += (sale.valor * sale.cantidad);
      map[key].costoTotal += (map[key].costoUnitario * sale.cantidad);
      map[key].utilidad = map[key].subtotal - map[key].costoTotal;
      
      const bUsername = sale.usuario || 'Socio';
      map[key].barberos[bUsername] = (map[key].barberos[bUsername] || 0) + sale.cantidad;
    });

    return Object.values(map);
  }, [sales, products]);

  // Grouped Barbers Performance Analysis
  const barberPerformance = useMemo(() => {
    const map: Record<string, {
      usuario: string;
      totalServicios: number;
      totalProductos: number;
      ingresoServicios: number;
      ingresoProductos: number;
      ingresoTotal: number;
    }> = {};

    sales.forEach(sale => {
      const u = sale.usuario || 'Socio';
      if (!map[u]) {
        map[u] = {
          usuario: u,
          totalServicios: 0,
          totalProductos: 0,
          ingresoServicios: 0,
          ingresoProductos: 0,
          ingresoTotal: 0
        };
      }

      const totalItemVal = sale.valor * sale.cantidad;
      map[u].ingresoTotal += totalItemVal;

      if (sale.tipo === 'servicio') {
        map[u].totalServicios += sale.cantidad;
        map[u].ingresoServicios += totalItemVal;
      } else {
        map[u].totalProductos += sale.cantidad;
        map[u].ingresoProductos += totalItemVal;
      }
    });

    return Object.values(map).sort((a, b) => b.ingresoTotal - a.ingresoTotal);
  }, [sales]);

  // Filtering list items based on search and active tab
  const filteredListItems = useMemo(() => {
    if (activeTab === 'servicios') {
      let result = groupedServices.filter(item => 
        item.nombre.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      return result.sort((a, b) => {
        let valA = a[sortField] as any;
        let valB = b[sortField] as any;
        if (typeof valA === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
    }

    if (activeTab === 'productos') {
      let result = groupedProducts.filter(item => 
        item.nombre.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      return result.sort((a, b) => {
        let valA = a[sortField] as any;
        let valB = b[sortField] as any;
        if (typeof valA === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
    }

    return [];
  }, [activeTab, groupedServices, groupedProducts, searchQuery, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-d1 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-4 animate-fade-in">
        
        {/* Header Block */}
        <div className="p-6 bg-d2 border-b border-d3 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-brand-gold tracking-widest bg-brand-gold/10 px-2.5 py-1 rounded-md flex items-center gap-1 w-max">
              <Calendar size={10} /> Análisis: {filterLabel}
            </span>
            <h3 className="text-lg font-black text-txt uppercase tracking-tight flex items-center gap-2">
              <TrendingUp className="text-brand-blue" size={18} /> Detalle de Ventas e Ingresos
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-bg hover:bg-d3 text-muted hover:text-txt rounded-xl transition-all cursor-pointer border border-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-d3 bg-[#0a0d1e] px-4 pt-2">
          {[
            { id: 'todos', label: 'Resumen General', icon: <Layers size={14} /> },
            { id: 'servicios', label: `Servicios (${groupedServices.length})`, icon: <Scissors size={14} /> },
            { id: 'productos', label: `Productos (${groupedProducts.length})`, icon: <ShoppingBag size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchQuery('');
              }}
              className={cn(
                "px-5 py-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer text-left",
                activeTab === tab.id 
                  ? "border-brand-gold text-brand-gold font-black bg-d1" 
                  : "border-transparent text-muted hover:text-txt hover:bg-d1/10"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* TAB 1: OVERALL METRICS */}
          {activeTab === 'todos' && (
            <div className="space-y-6">
              
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Total */}
                <div className="bg-bg/40 border border-d3 rounded-2xl p-5 relative overflow-hidden group hover:border-brand-gold/30 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-brand-gold">Total Cobrado</span>
                    <Coins size={16} className="text-brand-gold shrink-0" />
                  </div>
                  <p className="text-2xl font-black font-mono text-txt leading-none">{formatCurrency(totalSalesVal)}</p>
                  <p className="text-[10px] text-muted font-bold mt-2 uppercase tracking-tight">
                    {totalSalesCount} transacciones en el periodo
                  </p>
                </div>

                {/* Servicios */}
                <div 
                  onClick={() => setActiveTab('servicios')}
                  className="bg-bg/40 border border-d3 rounded-2xl p-5 relative overflow-hidden group hover:border-brand-blue/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-brand-blue">Servicios Realizados</span>
                    <Scissors size={16} className="text-brand-blue shrink-0 animate-pulse" />
                  </div>
                  <p className="text-2xl font-black font-mono text-txt leading-none">{formatCurrency(serviceSalesVal)}</p>
                  <p className="text-[10px] text-muted font-bold mt-2 uppercase tracking-tight flex items-center gap-1">
                    {serviceSalesCount} cortes/servicios <ChevronRight size={10} className="text-brand-blue" />
                  </p>
                </div>

                {/* Productos */}
                <div 
                  onClick={() => setActiveTab('productos')}
                  className="bg-bg/40 border border-d3 rounded-2xl p-5 relative overflow-hidden group hover:border-brand-gold/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#ffdf66]">Productos Vendidos</span>
                    <ShoppingBag size={16} className="text-brand-gold shrink-0" />
                  </div>
                  <p className="text-2xl font-black font-mono text-txt leading-none">{formatCurrency(productSalesVal)}</p>
                  <p className="text-[10px] text-muted font-bold mt-2 uppercase tracking-tight flex items-center gap-1">
                    {productSalesCount} artículos despachados <ChevronRight size={10} className="text-brand-gold" />
                  </p>
                </div>

              </div>

              {/* Product Profitability Box */}
              {productSalesVal > 0 && (
                <div className="bg-success/5 border border-success/20 rounded-2xl p-5">
                  <h4 className="text-xs font-black text-success uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Coins size={14} /> Rentabilidad del Inventario Vendido
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-bg/85 p-3.5 rounded-xl border border-d3">
                      <span className="text-[8px] text-muted uppercase font-bold tracking-wider block mb-1">Venta de Productos</span>
                      <span className="text-sm font-bold font-mono text-brand-gold">{formatCurrency(productSalesVal)}</span>
                    </div>
                    <div className="bg-bg/85 p-3.5 rounded-xl border border-d3">
                      <span className="text-[8px] text-muted uppercase font-bold tracking-wider block mb-1">Costo de Adquisición</span>
                      <span className="text-sm font-bold font-mono text-txt">{formatCurrency(productCostSum)}</span>
                    </div>
                    <div className="bg-bg/85 p-3.5 rounded-xl border border-d3">
                      <span className="text-[8px] text-muted uppercase font-bold tracking-wider block mb-1">Ganancia Neta</span>
                      <span className="text-sm font-black font-mono text-success">{formatCurrency(netProductProfit)}</span>
                    </div>
                    <div className="bg-bg/85 p-3.5 rounded-xl border border-d3">
                      <span className="text-[8px] text-muted uppercase font-bold tracking-wider block mb-1">Margen Comercial Promedio</span>
                      <span className="text-sm font-black text-success">
                        {Math.round((netProductProfit / productSalesVal) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Barber Contribution */}
              <div className="bg-d2 border border-d3 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={16} className="text-brand-blue" />
                  <h4 className="text-xs font-black text-txt uppercase tracking-widest">Aporte de Barberos en Ventas (Periodo)</h4>
                </div>
                {barberPerformance.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {barberPerformance.map((bp) => (
                      <div key={bp.usuario} className="p-4 bg-bg/40 rounded-xl border border-d3/50 flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-black text-txt uppercase text-xs">@{bp.usuario}</span>
                          <span className="font-mono font-black text-brand-gold text-sm">{formatCurrency(bp.ingresoTotal)}</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px] text-muted">
                            <span>Servicios ({bp.totalServicios})</span>
                            <span className="font-mono text-txt">{formatCurrency(bp.ingresoServicios)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-muted">
                            <span>Productos ({bp.totalProductos})</span>
                            <span className="font-mono text-txt">{formatCurrency(bp.ingresoProductos)}</span>
                          </div>
                        </div>
                        {/* Simple progress track */}
                        <div className="w-full bg-d3/30 h-1 rounded-full mt-3 overflow-hidden">
                          <div 
                            className="bg-brand-blue h-full" 
                            style={{ width: `${Math.min(100, (bp.ingresoTotal / (totalSalesVal || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted font-bold text-center py-4">No hay ventas registradas por cooperadores en este rango.</p>
                )}
              </div>

            </div>
          )}

          {/* TAB 2 & 3: DETAILS & LIST TABLES WITH FILTER/SEARCH */}
          {activeTab !== 'todos' && (
            <div className="space-y-4">
              
              {/* Search Bar & Sorter Header */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                
                {/* Search Input */}
                <div className="w-full sm:max-w-xs relative">
                  <span className="absolute left-3 top-2.5 text-muted">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Buscar ${activeTab === 'servicios' ? 'servicio' : 'producto'}...`}
                    className="w-full bg-bg border border-d3 text-xs rounded-xl px-9 py-2.5 text-txt outline-none focus:border-brand-blue"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-muted hover:text-txt"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Sorters Row */}
                <div className="flex items-center gap-1 select-none">
                  <span className="text-[10px] text-muted uppercase font-black tracking-wider mr-2">Ordenar por:</span>
                  <button
                    onClick={() => toggleSort('subtotal')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border",
                      sortField === 'subtotal'
                        ? 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue'
                        : 'bg-transparent border-white/5 text-muted hover:text-txt'
                    )}
                  >
                    Ingresos <ArrowUpDown size={10} />
                  </button>
                  <button
                    onClick={() => toggleSort('cantidad')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border",
                      sortField === 'cantidad'
                        ? 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue'
                        : 'bg-transparent border-white/5 text-muted hover:text-txt'
                    )}
                  >
                    Unidades <ArrowUpDown size={10} />
                  </button>
                  <button
                    onClick={() => toggleSort('nombre')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border",
                      sortField === 'nombre'
                        ? 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue'
                        : 'bg-transparent border-white/5 text-muted hover:text-txt'
                    )}
                  >
                    Nombre <ArrowUpDown size={10} />
                  </button>
                </div>

              </div>

              {/* Data Table */}
              {filteredListItems.length > 0 ? (
                <div className="space-y-3">
                  {activeTab === 'servicios' ? (
                    // SERVICES VIEW
                    filteredListItems.map((item: any) => {
                      return (
                        <div key={item.id || item.nombre} className="bg-bg/40 border border-d3 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-brand-blue/10 text-brand-blue rounded-xl shrink-0 mt-0.5">
                              <Scissors size={16} />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-black text-txt uppercase tracking-tight">{item.nombre}</h4>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[9px] bg-d3/30 text-muted border border-white/5 px-2 py-0.5 rounded-md font-bold uppercase">
                                  {item.cantidad} servicios realizados
                                </span>
                                <span className="text-[9px] text-muted">
                                  Precio Base: {formatCurrency(item.valorUnitario)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                            <span className="text-[9px] text-muted uppercase font-bold sm:hidden">Total generado:</span>
                            <div className="space-y-0.5 text-right">
                              <p className="font-mono font-black text-brand-blue text-sm">{formatCurrency(item.subtotal)}</p>
                              
                              {/* Cooperators who did it */}
                              <div className="flex flex-wrap gap-1 mt-1 justify-end">
                                {Object.entries(item.barberos).map(([barbero, qty]) => (
                                  <span key={barbero} className="text-[8px] bg-bg px-1.5 py-0.5 rounded border border-white/5 text-muted font-mono">
                                    @{barbero}: <strong className="text-[#a0aec0] font-black">{qty as any}</strong>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // PRODUCTS VIEW
                    filteredListItems.map((item: any) => {
                      const isLowStock = item.stockActual <= 3;
                      const isOut = item.stockActual <= 0;

                      return (
                        <div key={item.id || item.nombre} className="bg-bg/40 border border-d3 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-brand-gold/10 text-[#ffdf66] rounded-xl shrink-0 mt-0.5">
                              <ShoppingBag size={16} />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-black text-txt uppercase tracking-tight">{item.nombre}</h4>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[9px] bg-d3/30 text-muted border border-white/5 px-2 py-0.5 rounded-md font-bold uppercase">
                                  {item.cantidad} unidades vendidas
                                </span>
                                <span className="text-[9px] text-muted">
                                  Venta Unit.: {formatCurrency(item.valorUnitario)}
                                </span>
                                
                                {/* Stock Alerts */}
                                {isOut ? (
                                  <span className="text-[8px] bg-danger/10 border border-danger/20 text-danger font-black uppercase px-2 py-0.5 rounded">
                                    Agotado
                                  </span>
                                ) : isLowStock ? (
                                  <span className="text-[8px] bg-brand-gold/15 border border-brand-gold/20 text-brand-gold font-black uppercase px-2 py-0.5 rounded animate-pulse">
                                    Bajo Stock ({item.stockActual} u)
                                  </span>
                                ) : (
                                  <span className="text-[8px] bg-success/10 border border-success/20 text-success font-black uppercase px-2 py-0.5 rounded">
                                    Stock: {item.stockActual} u
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start border-t sm:border-t-0 pt-2.5 sm:pt-0 border-white/5 w-full sm:w-auto">
                            <div className="text-left sm:text-right">
                              <span className="text-[8px] text-muted block uppercase font-bold tracking-wider sm:hidden">Valores de Venta</span>
                              <p className="font-mono font-black text-brand-gold text-sm leading-tight">{formatCurrency(item.subtotal)}</p>
                              
                              {/* Profit markup representation for owners */}
                              {item.utilidad > 0 && (
                                <p className="text-[8px] text-success font-bold mt-0.5">
                                  Ganancia Neta: {formatCurrency(item.utilidad)} ({Math.round((item.utilidad / item.subtotal) * 100)}%)
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-bg/20 rounded-xl border border-d3/30">
                  <p className="text-xs text-muted font-bold uppercase">No se hallaron resultados para la búsqueda.</p>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer info bar */}
        <div className="p-4 bg-[#090c1a] border-t border-d3 text-center">
          <p className="text-[10px] text-muted font-bold uppercase tracking-wider">
            Total de datos en pantalla calculados para el periodo activo
          </p>
        </div>

      </div>
    </div>
  );
}
