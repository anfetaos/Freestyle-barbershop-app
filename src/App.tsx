import React, { useState, useEffect } from 'react';
import { api } from './api';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Sales from './components/Sales';
import Appointments from './components/Appointments';
import Products from './components/Products';
import Services from './components/Services';
import Users from './components/Users';
import Reports from './components/Reports';
import Settings from './components/Settings';
import BookingPage from './components/BookingPage';
import { AppData, User } from './types';

export default function App() {
  const { user, login, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for public booking route
  const isBookingPage = window.location.pathname.endsWith('/reservar') || window.location.pathname.endsWith('/book');

  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.loadAllData();
      setData(res);
    } catch (e: any) {
      console.error('Failed to load data', e);
      setError(e.message || 'Error al conectar con Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  if (authLoading) return null;

  if (isBookingPage) {
    return <BookingPage />;
  }

  if (!user) {
    return <Login onLogin={login} />;
  }

  const renderContent = () => {
    if (!data) return null;

    switch (activeTab) {
      case 'dashboard': return <Dashboard data={data} user={user} onTabChange={setActiveTab} />;
      case 'ventas': return <Sales data={data} onRefresh={loadData} user={user} onBack={() => setActiveTab('dashboard')} />;
      case 'citas': return <Appointments data={data} onRefresh={loadData} user={user} />;
      case 'productos': return <Products data={data} onRefresh={loadData} isAdmin={user.role === 'owner'} />;
      case 'servicios': return <Services data={data} onRefresh={loadData} isAdmin={user.role === 'owner'} />;
      case 'usuarios': return <Users data={data} onRefresh={loadData} />;
      case 'reportes': return <Reports data={data} user={user} />;
      case 'config': return <Settings data={data} onRefresh={loadData} />;
      default: return <Dashboard data={data} user={user} onTabChange={setActiveTab} />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      data={data} 
      loading={loading}
      error={error}
      onLogout={logout}
      onRefresh={loadData}
    >
      {renderContent()}
    </Layout>
  );
}
