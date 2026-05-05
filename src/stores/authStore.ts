// Zustand store for authentication and user state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRoleType } from '@/types';
import { localDataService } from '@/services/localData';
import { api } from '@/services/api';
import { checkPermissionForRole, hasModuleAccessForRole } from '@/lib/permissions';

const AUTH_TOKEN_KEY = 'auth_token';

function persistApiToken(token: string | null) {
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mfaRequired: boolean;
  mfaVerified: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  verifyMFA: (code: string) => Promise<void>;
  setUser: (user: User) => void;
  checkPermission: (module: string, action: string) => boolean;
  hasModuleAccess: (module: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      mfaRequired: false,
      mfaVerified: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          const apiRes = await api.login(email, password);
          if (apiRes.success && apiRes.data && typeof apiRes.data === 'object' && 'token' in apiRes.data) {
            const d = apiRes.data as { token: string; user: Record<string, unknown> };
            persistApiToken(d.token);
            const u = d.user;
            const user: User = {
              id: String(u.id),
              email: String(u.email),
              firstName: String(u.firstName ?? ''),
              lastName: String(u.lastName ?? ''),
              role: u.role as UserRoleType,
              mfaEnabled: Boolean(u.mfaEnabled),
              isActive: true,
              companyId: String(u.companyId ?? '1'),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            if (user.mfaEnabled) {
              set({
                user,
                token: d.token,
                isAuthenticated: true,
                isLoading: false,
                mfaRequired: true,
                mfaVerified: false,
              });
            } else {
              set({
                user,
                token: d.token,
                isAuthenticated: true,
                isLoading: false,
                mfaRequired: false,
                mfaVerified: true,
              });
            }
            return;
          }

          const users = localDataService.getUsers();
          const foundUser = users.find(
            (u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === password
          );

          if (!foundUser) {
            set({ isLoading: false });
            throw new Error('Invalid email or password');
          }

          if (!foundUser.isActive) {
            set({ isLoading: false });
            throw new Error('Account is inactive. Contact your administrator.');
          }

          const user: User = {
            id: foundUser.id,
            email: foundUser.email,
            firstName: foundUser.firstName,
            lastName: foundUser.lastName,
            role: foundUser.role as UserRoleType,
            mfaEnabled: foundUser.mfaEnabled,
            isActive: foundUser.isActive,
            companyId: '1',
            createdAt: new Date(foundUser.createdAt),
            updatedAt: new Date(),
          };

          localDataService.updateUser(foundUser.id, { lastLoginAt: new Date().toISOString() });

          const sessionToken = `token-${foundUser.id}-${Date.now()}`;
          persistApiToken(sessionToken);

          if (foundUser.mfaEnabled) {
            set({
              user,
              token: sessionToken,
              isAuthenticated: true,
              isLoading: false,
              mfaRequired: true,
              mfaVerified: false,
            });
          } else {
            set({
              user,
              token: sessionToken,
              isAuthenticated: true,
              isLoading: false,
              mfaRequired: false,
              mfaVerified: true,
            });
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        persistApiToken(null);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          mfaRequired: false,
          mfaVerified: false,
        });
      },

      verifyMFA: async (code: string) => {
        set({ isLoading: true });

        try {
          // In production, verify MFA code with API
          // For demo, accept any 6-digit code
          if (code.length === 6) {
            set({
              mfaVerified: true,
              isLoading: false,
            });
          } else {
            throw new Error('Invalid MFA code');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      checkPermission: (module: string, action: string) => {
        const user = get().user;
        if (!user) return false;
        return checkPermissionForRole(user.role, module, action);
      },

      hasModuleAccess: (module: string) => {
        const user = get().user;
        if (!user) return false;
        return hasModuleAccessForRole(user.role, module);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        mfaVerified: state.mfaVerified,
      }),
    }
  )
);