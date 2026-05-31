import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useT } from '../i18n/I18nContext';
import {
  LayoutDashboard, Users, Wrench, ShoppingCart, CreditCard,
  MapPin, ClipboardList, AlertCircle, BarChart3, Bell,
  Settings, User, LogOut, Menu, X, PlusCircle, Package, Languages
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, lang, toggleLang } = useT();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const adminNav = [
    { to: '/', icon: LayoutDashboard, label: t('dashboard') },
    { to: '/customers', icon: Users, label: t('customers') },
    { to: '/map', icon: MapPin, label: t('map') },
    { to: '/parts', icon: Wrench, label: t('parts') },
    { to: '/orders', icon: ShoppingCart, label: t('orders') },
    { to: '/payments', icon: CreditCard, label: t('payments') },
    { to: '/visits', icon: ClipboardList, label: t('visits') },
    { to: '/issues', icon: AlertCircle, label: t('issues') },
    { to: '/analytics', icon: BarChart3, label: t('analytics') },
    { to: '/reminders', icon: Bell, label: t('reminders') },
    { to: '/settings', icon: Settings, label: t('settings') },
  ];

  const salesNav = [
    { to: '/', icon: LayoutDashboard, label: t('dashboard') },
    { to: '/map', icon: MapPin, label: t('map') },
    { to: '/customers', icon: Users, label: t('customers') },
    { to: '/orders', icon: ShoppingCart, label: t('orders') },
    { to: '/orders/new', icon: PlusCircle, label: t('newOrder') },
    { to: '/payments', icon: CreditCard, label: t('payments') },
    { to: '/visits', icon: ClipboardList, label: t('visits') },
    { to: '/issues', icon: AlertCircle, label: t('issues') },
    { to: '/reminders', icon: Bell, label: t('reminders') },
  ];

  const custNav = [
    { to: '/', icon: LayoutDashboard, label: t('dashboard') },
    { to: '/parts', icon: Package, label: t('priceList') },
    { to: '/orders', icon: ShoppingCart, label: t('myOrders') },
    { to: '/issues', icon: AlertCircle, label: t('issues') },
  ];

  const navItems = user?.role === 'admin' ? adminNav : user?.role === 'salesperson' ? salesNav : custNav;
  const mobileItems = navItems.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-blue-900 text-white">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-blue-800">
          <Wrench size={24} />
          <span className="font-bold text-lg">{t('appName')}</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm ${isActive ? 'bg-blue-700 text-white' : 'text-blue-200 hover:bg-blue-800'}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-blue-800 p-4">
          <button onClick={toggleLang} className="flex items-center gap-2 text-sm text-blue-200 hover:text-white mb-2 w-full">
            <Languages size={16} /> {lang === 'zh' ? 'English' : '中文'}
          </button>
          <NavLink to="/profile" className="flex items-center gap-2 text-sm text-blue-200 hover:text-white mb-2">
            <User size={16} /> {user?.full_name}
          </NavLink>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-blue-300 hover:text-white">
            <LogOut size={16} /> {t('logout')}
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="lg:hidden sticky top-0 z-40 bg-blue-900 text-white flex items-center justify-between px-4 py-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <span className="font-bold">{t('appName')}</span>
          <div className="flex gap-2">
            <button onClick={toggleLang} className="text-xs bg-blue-700 px-2 py-1 rounded">{lang === 'zh' ? 'EN' : '中'}</button>
            <button onClick={() => navigate('/orders/new')}>
              <PlusCircle size={24} />
            </button>
          </div>
        </header>

        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-30">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)}></div>
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-blue-900 text-white overflow-y-auto">
              <div className="flex items-center gap-2 px-4 py-5 border-b border-blue-800">
                <Wrench size={24} />
                <span className="font-bold">{t('appName')}</span>
              </div>
              <nav className="py-2">
                {navItems.map(item => (
                  <NavLink
                    key={item.to} to={item.to} end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 text-sm ${isActive ? 'bg-blue-700' : ''}`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon size={18} /> {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="border-t border-blue-800 p-4 mt-2">
                <button onClick={toggleLang} className="text-sm text-blue-300 w-full text-left mb-2">{lang === 'zh' ? 'Switch to English' : '切换到中文'}</button>
                <button onClick={logout} className="flex items-center gap-2 text-sm text-blue-300">
                  <LogOut size={16} /> {t('logout')}
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="p-3 md:p-6 pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav lg:hidden">
        {mobileItems.map(item => (
          <NavLink
            key={item.to} to={item.to} end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-blue-600' : 'text-gray-500'}`
            }
          >
            <item.icon size={20} />
            <span className="truncate max-w-[60px] text-center">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
