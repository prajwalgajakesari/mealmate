import * as SecureStore from "expo-secure-store";
import { userService } from "./api";

const TOKEN_KEY = "mealmate_auth_token";
const USER_KEY = "mealmate_user";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dietType?: string;
  healthGoal?: string;
  cuisinePreferences?: string[];
  heightCm?: number;
  weightKg?: number;
  age?: number;
  activityLevel?: string;
  preferredPlatform?: string;
  deliveryAddress?: string;
  alertTime?: string;
  onboardingComplete?: boolean;
  subscriptionPlan?: string;
  calorieTarget?: number;
  proteinTargetG?: number;
}

export const authService = {
  async login(firebaseToken: string): Promise<{ token: string; user: User }> {
    const response = await userService.login(firebaseToken);
    const { token, user } = response.data;
    await this.saveSession(token, user);
    return { token, user };
  },

  async signup(
    firebaseToken: string,
    name: string
  ): Promise<{ token: string; user: User }> {
    const response = await userService.signup({ firebaseToken, name });
    const { token, user } = response.data;
    await this.saveSession(token, user);
    return { token, user };
  },

  async saveSession(token: string, user: User): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },

  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async getUser(): Promise<User | null> {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  async clearSession(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  },

  async refreshProfile(): Promise<User> {
    const response = await userService.getProfile();
    const user = response.data as User;
    const token = await this.getToken();
    if (token) {
      await this.saveSession(token, user);
    }
    return user;
  },
};
