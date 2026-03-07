import { create } from "zustand";
import { authService, User } from "@/services/auth";
import { setAuthCredentials } from "@/services/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;

  setUser: (user: User) => void;
  setToken: (token: string) => void;
  login: (firebaseToken: string) => Promise<void>;
  signup: (firebaseToken: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  completeOnboarding: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  hasCompletedOnboarding: false,

  setUser: (user) =>
    set({
      user,
      hasCompletedOnboarding: user.onboardingComplete ?? false,
    }),

  setToken: (token) => set({ token, isAuthenticated: true }),

  login: async (firebaseToken) => {
    const { token, user } = await authService.login(firebaseToken);
    setAuthCredentials(token, user.id);
    set({
      token,
      user,
      isAuthenticated: true,
      hasCompletedOnboarding: user.onboardingComplete ?? false,
    });
  },

  signup: async (firebaseToken, name) => {
    const { token, user } = await authService.signup(firebaseToken, name);
    setAuthCredentials(token, user.id);
    set({
      token,
      user,
      isAuthenticated: true,
      hasCompletedOnboarding: false,
    });
  },

  logout: async () => {
    await authService.clearSession();
    setAuthCredentials(null, "");
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
    });
  },

  restoreSession: async () => {
    try {
      const token = await authService.getToken();
      const user = await authService.getUser();
      if (token && user) {
        setAuthCredentials(token, user.id);
        set({
          token,
          user,
          isAuthenticated: true,
          hasCompletedOnboarding: user.onboardingComplete ?? false,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  completeOnboarding: () => set({ hasCompletedOnboarding: true }),
}));
