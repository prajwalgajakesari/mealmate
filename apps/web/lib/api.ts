import axios from "axios";
import { getToken } from "./auth";

const API_BASES = {
  user: process.env.NEXT_PUBLIC_USER_SERVICE_URL ?? "http://localhost:8004/api/v1",
  meal: process.env.NEXT_PUBLIC_MEAL_ENGINE_URL ?? "http://localhost:8001/api/v1",
  pantry: process.env.NEXT_PUBLIC_PANTRY_TRACKER_URL ?? "http://localhost:8002/api/v1",
  order: process.env.NEXT_PUBLIC_ORDER_ORCHESTRATOR_URL ?? "http://localhost:8003/api/v1",
} as const;

type ServiceName = keyof typeof API_BASES;

function createClient(service: ServiceName) {
  const client = axios.create({
    baseURL: API_BASES[service],
    timeout: 15_000,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("mealmate_token");
          window.location.href = "/";
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const userApi = createClient("user");
export const mealApi = createClient("meal");
export const pantryApi = createClient("pantry");
export const orderApi = createClient("order");
