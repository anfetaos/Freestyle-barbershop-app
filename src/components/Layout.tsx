import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Calendar, 
  Package, 
  Scissors, 
  Users as UsersIcon, 
  BarChart3, 
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Bell,
  Loader2,
  Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { AppData, User } from '../types';
import { cn } from '../utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  data: AppData | null;
  loading: boolean;
}

export default function Layout({ children, activeTab, setActiveTab, data, loading, error, onLogout, onRefresh }: any) {
  const { user, isAdmin } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'barber'] },
    { id: 'ventas', label: 'Ventas', icon: ShoppingCart, roles: ['owner', 'barber'] },
    { id: 'citas', label: 'Agenda', icon: Calendar, roles: ['owner', 'barber'] },
    { id: 'productos', label: 'Productos', icon: Package, roles: ['owner', 'barber'] },
    { id: 'servicios', label: 'Servicios', icon: Scissors, roles: ['owner', 'barber'] },
    { id: 'usuarios', label: 'Usuarios', icon: UsersIcon, roles: ['owner'] },
    { id: 'reportes', label: 'Reportes', icon: BarChart3, roles: ['owner'] },
    { id: 'config', label: 'Configuración', icon: SettingsIcon, roles: ['owner'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        className={cn(
          "fixed inset-y-0 left-0 w-[240px] bg-d1 border-r border-d3 z-50 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:block flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-8 flex flex-col items-center border-b border-d3">
            <div className="w-12 h-12 bg-gradient-to-tr from-brand-blue to-brand-gold rounded-lg mb-3 flex items-center justify-center text-2xl font-bold text-bg shadow-neon">
              F
            </div>
            <h1 className="text-lg font-bold tracking-tight uppercase leading-tight text-txt">Freestyle</h1>
            <p className="text-[10px] text-brand-gold uppercase tracking-[0.2em] font-semibold">Urban Grooming</p>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1 mt-4">
            {filteredMenu.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group",
                  activeTab === item.id 
                    ? "bg-brand-blue/10 border border-brand-blue/30 text-brand-blue" 
                    : "text-muted hover:bg-d2 hover:text-txt"
                )}
              >
                <item.icon size={18} className={activeTab === item.id ? "text-brand-blue" : "group-hover:text-brand-blue"} />
                <span className="text-sm font-medium uppercase tracking-wide">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-d3 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-d3 border border-brand-gold flex items-center justify-center text-[10px]">
              {user?.nombre.charAt(0)}
            </div>
            <div className="flex flex-col overflow-hidden">
               <span className="text-xs font-semibold text-txt truncate">{user?.nombre}</span>
               <span className="text-[10px] text-muted uppercase">{user?.role === 'owner' ? 'Owner' : 'Barber'}</span>
            </div>
            <button 
              onClick={onLogout}
              className="ml-auto text-danger opacity-70 hover:opacity-100 italic text-[10px]"
            >
              Salir
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-d3 bg-bg/80 backdrop-blur-xl flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 lg:hidden text-muted hover:text-brand-blue"
            >
              <Menu size={24} />
            </button>
            <div 
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 cursor-pointer group truncate"
            >
              <Home size={18} className={cn("shrink-0 transition-colors", activeTab === 'dashboard' ? "text-brand-blue" : "text-muted group-hover:text-brand-blue")} />
              <div className="truncate">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-txt capitalize truncate group-hover:text-brand-blue transition-colors">
                  {activeTab.replace('-', ' ')}
                </h2>
                <p className="hidden sm:block text-[10px] text-muted font-medium uppercase tracking-wider">
                  Freestyle Urban Grooming
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] text-muted uppercase tracking-wider">Estado del Sistema</span>
                <div className="flex items-center space-x-2">
                  <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px]", error ? "bg-danger shadow-danger" : "bg-success shadow-success")}></div>
                  <span className={cn("text-xs font-bold uppercase", error ? "text-danger" : "text-success")}>
                    {error ? "Offline" : "Online"}
                  </span>
                </div>
             </div>
             <div className="hidden sm:block w-px h-8 bg-d3"></div>
             <button 
               onClick={() => setActiveTab('ventas')}
               className="btn-primary px-3 sm:px-6 text-[10px] sm:text-xs"
             >
               <span className="sm:hidden">+ Venta</span>
               <span className="hidden sm:inline">+ Nueva Venta</span>
             </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-brand-blue" size={40} />
                <p className="text-muted text-sm uppercase tracking-widest font-medium">Conectando...</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <div className="max-w-md w-full bg-d1 border border-danger/30 p-8 rounded-2xl text-center">
                <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-6">
                  <X size={32} />
                </div>
                <h3 className="text-xl font-bold text-txt mb-2 uppercase tracking-tight">Error de Conexión</h3>
                <p className="text-muted text-sm mb-6">{error}</p>
                <div className="space-y-4">
                  <button 
                    onClick={onRefresh}
                    className="w-full bg-brand-blue text-bg py-3 rounded-lg font-bold uppercase text-xs tracking-widest hover:bg-brand-blue2 transition-all shadow-neon"
                  >
                    Reintentar Conexión
                  </button>
                  <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">
                    Asegúrate de que el Apps Script esté publicado como "Web App" para "Cualquier persona".
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in max-w-7xl mx-auto text-txt">
              {children}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

