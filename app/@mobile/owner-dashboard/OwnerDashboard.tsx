'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/app/auth/AuthProvider';

export default function OwnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todaysSales, setTodaysSales] = useState<number>(0);
  const [newOrders, setNewOrders] = useState<number>(0);
  const { user, loading: authLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    if (authLoading) {
      // Wait for auth state to be loaded
      return;
    }

    if (!user) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    setTodaysSales(0);
    setNewOrders(0);
    setLoading(false);
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md text-center">
          <h3 className="font-bold mb-2">Error Loading Dashboard</h3>
          <p>{error}</p>
          <button
            onClick={() => globalThis.location.reload()}
            className="mt-3 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        :root {
          --background-color: #121212;
          --card-background-color: rgba(255, 255, 255, 0.05);
          --primary-color: #ea2a2a;
          --text-primary-color: #FFFFFF;
          --text-secondary-color: #A0A0A0;
        }
        .glassmorphism {
          background: var(--card-background-color);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
      <style jsx global>{`
        body {
          overscroll-behavior-y: none;
        }
      `}</style>

      <div className="relative flex w-full h-[100dvh] flex-col text-[var(--text-primary-color)] justify-between group/design-root overflow-hidden">
        <header className="flex items-center justify-between p-6 pb-2 shrink-0 bg-black/50 backdrop-blur-md z-10">
          <button
            className="p-2 cursor-pointer z-50 relative"
            onClick={() => setIsSidebarOpen(true)}
          >
            <span className="material-symbols-outlined text-3xl">menu</span>
          </button>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <button className="p-2">
            <span className="material-symbols-outlined text-3xl">notifications</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-8">
          <button className="w-full flex items-center justify-center gap-2 rounded-full h-14 bg-[var(--primary-color)] text-white text-lg font-bold shadow-lg shadow-red-500/30 transition-transform active:scale-95">
            <span className="material-symbols-outlined">location_on</span>
            <span className="truncate">Update Location / Go Live</span>
          </button>

          <div className="mt-8 space-y-6">
            <div className="glassmorphism rounded-2xl p-5 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-[var(--text-secondary-color)] text-sm">Today's Sales</p>
                <p className="text-white text-3xl font-bold">${todaysSales.toLocaleString()}</p>
              </div>
              <div className="text-[var(--primary-color)]">
                <span className="material-symbols-outlined text-5xl">monitoring</span>
              </div>
            </div>

            <div className="glassmorphism rounded-2xl p-5 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-[var(--text-secondary-color)] text-sm">New Orders</p>
                <p className="text-white text-3xl font-bold">{newOrders}</p>
              </div>
              <div className="text-[var(--primary-color)]">
                <span className="material-symbols-outlined text-5xl">receipt_long</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-white/50 focus-visible:outline-offset-[-2px]"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          />

          {/* Sidebar Content */}
          <div className="relative w-64 h-full glassmorphism border-r border-white/10 p-4 flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white">Navigation</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 text-white/70 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <nav className="flex flex-col gap-2 overflow-y-auto">
              <button
                onClick={() => handleNavigation('/owner-dashboard')}
                className="p-3 flex items-center gap-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left w-full"
              >
                <span className="material-symbols-outlined">dashboard</span>
                <span className="font-medium">Overview</span>
              </button>
              <button
                onClick={() => handleNavigation('/owner-dashboard/trucks')}
                className="p-3 flex items-center gap-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left w-full"
              >
                <span className="material-symbols-outlined">local_shipping</span>
                <span className="font-medium">My Trucks</span>
              </button>
              <button
                onClick={() => handleNavigation('/owner-dashboard/location')}
                className="p-3 flex items-center gap-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left w-full"
              >
                <span className="material-symbols-outlined">location_on</span>
                <span className="font-medium">Update Location</span>
              </button>
              <button
                onClick={() => handleNavigation('/owner-dashboard/menu')}
                className="p-3 flex items-center gap-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left w-full"
              >
                <span className="material-symbols-outlined">fastfood</span>
                <span className="font-medium">Menu</span>
              </button>
              <button
                onClick={() => handleNavigation('/owner-dashboard/schedule')}
                className="p-3 flex items-center gap-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left w-full"
              >
                <span className="material-symbols-outlined">calendar_month</span>
                <span className="font-medium">Schedule</span>
              </button>
              <button
                onClick={() => handleNavigation('/owner-dashboard/analytics')}
                className="p-3 flex items-center gap-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left w-full justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">bar_chart</span>
                  <span className="font-medium">Analytics</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/20">
                  PRO
                </span>
              </button>
              <button
                onClick={() => handleNavigation('/owner-dashboard/billing')}
                className="p-3 flex items-center gap-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left w-full"
              >
                <span className="material-symbols-outlined">credit_card</span>
                <span className="font-medium">Billing</span>
              </button>
              <button
                onClick={() => handleNavigation('/owner-dashboard/settings')}
                className="p-3 flex items-center gap-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left w-full"
              >
                <span className="material-symbols-outlined">settings</span>
                <span className="font-medium">Settings</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
