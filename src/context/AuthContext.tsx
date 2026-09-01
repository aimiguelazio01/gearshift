'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { users } from '@/lib/store';
import type { User, UserRole } from '@/lib/types';

interface AuthContextType {
  currentUser: User | null;
  usersList: User[];
  isAdmin: boolean;
  isAdvisor: boolean;
  isTechnician: boolean;
  adminPin: string;
  permissions: {
    canManageLiftsAndTeam: boolean; // Admin only
    canManageCustomersAndVehicles: boolean; // Admin & Service Advisor
    canManagePartsCatalog: boolean; // Admin & Service Advisor
    canManageInvoices: boolean; // Admin & Service Advisor
    canCreateWorkOrders: boolean; // Admin & Service Advisor
    canEditWorkOrders: boolean; // Admin, Service Advisor & Technician (Technicians can alter/update WOs)
    canDeleteWorkOrders: boolean; // Admin & Service Advisor
  };
  switchUser: (userId: string) => void;
  verifyAdminPin: (pin: string) => boolean;
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_USER_KEY = 'workshop_active_user_id';
const DEFAULT_ADMIN_PIN = '1234';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const reload = () => {
    const list = users.getAll();
    setUsersList(list);

    const savedId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_USER_KEY) : null;
    let found = list.find(u => u.id === savedId);

    // If no saved user or not found, default to first Admin user or first user in database
    if (!found) {
      found = list.find(u => u.role === 'Admin') || list[0] || null;
      if (found && typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_USER_KEY, found.id);
      }
    }
    setCurrentUser(found || null);
  };

  useEffect(() => {
    reload();
  }, []);

  const switchUser = (userId: string) => {
    const list = users.getAll();
    setUsersList(list);
    const found = list.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_USER_KEY, found.id);
      }
    }
  };

  const verifyAdminPin = (pin: string) => {
    return pin.trim() === DEFAULT_ADMIN_PIN;
  };

  const role: UserRole = currentUser?.role || 'Admin';
  const isAdmin = role === 'Admin';
  const isAdvisor = role === 'Service Advisor';
  const isTechnician = role === 'Technician';

  const permissions = {
    // 1. Admin: Controlo total sobre tudo (incluindo elevadores e equipa)
    canManageLiftsAndTeam: isAdmin,

    // 2. Administrativos / Consultores: Controlo total EXCEPTO elevadores e equipa
    canManageCustomersAndVehicles: isAdmin || isAdvisor,
    canManagePartsCatalog: isAdmin || isAdvisor,
    canManageInvoices: isAdmin || isAdvisor,
    canCreateWorkOrders: isAdmin || isAdvisor,
    canDeleteWorkOrders: isAdmin || isAdvisor,

    // 3. Mecânicos e Técnicos: Apenas controlo das ordens e serviços (NÃO podem criar, SÓ alterar)
    canEditWorkOrders: isAdmin || isAdvisor || isTechnician,
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        usersList,
        isAdmin,
        isAdvisor,
        isTechnician,
        adminPin: DEFAULT_ADMIN_PIN,
        permissions,
        switchUser,
        verifyAdminPin,
        refreshUsers: reload,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
