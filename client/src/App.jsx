import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import api from './api';

// Components
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import CustomerMap from './pages/CustomerMap';
import Parts from './pages/Parts';
import Orders from './pages/Orders';
import OrderCreate from './pages/OrderCreate';
import OrderDetail from './pages/OrderDetail';
import Payments from './pages/Payments';
import Visits from './pages/Visits';
import Issues from './pages/Issues';
import Analytics from './pages/Analytics';
import Reminders from './pages/Reminders';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.me();
      setUser(data.user);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    setLoading(false);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (username, password) => {
    const data = await api.login(username, password);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    const dash = data.user.role === 'admin' ? '/' : data.user.role === 'salesperson' ? '/map' : '/orders';
    navigate(dash);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, checkAuth }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="map" element={<CustomerMap />} />
          <Route path="parts" element={<Parts />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/new" element={<OrderCreate />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="payments" element={<Payments />} />
          <Route path="visits" element={<Visits />} />
          <Route path="issues" element={<Issues />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </AuthContext.Provider>
  );
}
