import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router";
import { clearSession, LOGIN_ROUTE } from "./session";

/**
 * Backend base URL. Override with EXPO_PUBLIC_API_URL when running against
 * a staging/local backend; the deployed Render service is the default.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://gate-pass-backend-2ccd.onrender.com/api";

/**
 * Render free instances cold-start for 30-90s, so the timeout has to be
 * generous; it still bounds the spinner instead of hanging forever.
 */
const REQUEST_TIMEOUT_MS = Number(
  process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 90_000
);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("userToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";
    const isAuthEndpoint =
      url.includes("/auth/login") || url.includes("/auth/register");

    // Expired/invalid token: drop the session and go to the real login
    // route (the app previously used a non-existent "/login").
    if (status === 401 && !isAuthEndpoint) {
      await clearSession();
      router.replace(LOGIN_ROUTE);
    }

    return Promise.reject(error);
  }
);

/** Human-readable message for an axios/network failure. */
export function apiErrorMessage(error, fallback = "Something went wrong.") {
  if (error?.code === "ECONNABORTED") {
    return "The server is taking too long to respond. Please try again.";
  }
  if (!error?.response) {
    // Axios network failures carry isAxiosError; anything else is a local
    // error (e.g. "Department or year not found") whose message is useful.
    if (!error?.isAxiosError && error?.message) return error.message;
    return "Can't reach the server. Check your internet connection and try again.";
  }
  return error.response.data?.message || fallback;
}
