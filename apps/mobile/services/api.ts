import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";

// Android emulator uses 10.0.2.2 to reach host machine; iOS simulator uses localhost
const HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";

// Dev fallback user ID — used when no auth session exists
const DEV_USER_ID = "11111111-1111-1111-1111-111111111111";

let _authToken: string | null = null;
let _authUserId: string = DEV_USER_ID;

export function setAuthCredentials(token: string | null, userId: string) {
  _authToken = token;
  _authUserId = userId || DEV_USER_ID;
}

function getAuthToken(): string | null {
  return _authToken;
}

function getAuthUserId(): string {
  return _authUserId || DEV_USER_ID;
}

const BASE_URLS = {
  user: `http://${HOST}:3001/api/v1`,
  meal: `http://${HOST}:8001/api/v1`,
  pantry: `http://${HOST}:8002/api/v1`,
  order: `http://${HOST}:3003/api/v1`,
} as const;

type ServiceName = keyof typeof BASE_URLS;

function createClient(service: ServiceName) {
  const client = axios.create({
    baseURL: BASE_URLS[service],
    timeout: service === "meal" ? 60000 : 15000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      config.headers["X-User-Id"] = getAuthUserId();
      return config;
    },
    (error) => Promise.reject(error)
  );

  return client;
}

export const userApi = createClient("user");
export const mealApi = createClient("meal");
export const pantryApi = createClient("pantry");
export const orderApi = createClient("order");

// ── User Service ──────────────────────────────────────────────────────
export const userService = {
  login: (firebaseToken: string) =>
    userApi.post("/auth/login", { firebaseToken }),

  signup: (data: { firebaseToken: string; name: string }) =>
    userApi.post("/auth/signup", data),

  getProfile: () => userApi.get("/users/me"),

  updateProfile: (data: Record<string, unknown>) =>
    userApi.put("/users/me", data),

  updateDietary: (data: {
    dietType?: string;
    cuisinePreferences?: string[];
    allergies?: string[];
    ingredientBlacklist?: string[];
  }) => userApi.put("/users/me/dietary", data),

  updateGoals: (data: {
    heightCm?: number;
    weightKg?: number;
    age?: number;
    gender?: string;
    activityLevel?: string;
    healthGoal?: string;
  }) => userApi.put("/users/me/goals", data),
};

// ── Meal Engine ───────────────────────────────────────────────────────
export const mealService = {
  getTodayPlan: () => mealApi.get("/plans/today"),

  generatePlan: () => mealApi.post("/plans/generate"),

  getRecipe: (id: string) => mealApi.get(`/recipes/${id}`),

  rateMeal: (planId: string, data: { meal_type: string; rating: number; feedback_text?: string }) =>
    mealApi.post(`/plans/${planId}/feedback`, data),
};

// ── Pantry Tracker ────────────────────────────────────────────────────
export const pantryService = {
  getItems: () => pantryApi.get("/pantry"),

  addItem: (data: { ingredient_name: string; quantity: number; unit: string; category: string }) =>
    pantryApi.post("/pantry/items", data),

  updateItem: (itemId: string, data: { quantity?: number; status?: string }) =>
    pantryApi.put(`/pantry/items/${itemId}`, data),
};

// ── Order Orchestrator ────────────────────────────────────────────────
export const orderService = {
  getCart: () => orderApi.get("/orders/cart"),

  buildCart: (data: { mealPlanId: string; groceryItems: Array<{ name: string; searchTerm: string; quantity: string; category: string; priority: string }> }) =>
    orderApi.post("/orders/build", data),

  approveOrder: (orderId: string) => orderApi.put(`/orders/${orderId}/approve`),

  getOrderStatus: (orderId: string) => orderApi.get(`/orders/${orderId}/status`),

  getHistory: () => orderApi.get("/orders/history"),
};
