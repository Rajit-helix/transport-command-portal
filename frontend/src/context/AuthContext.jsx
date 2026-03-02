import { createContext, useContext, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

function getStoredUser() {
  const accessToken = localStorage.getItem("accessToken");
  const raw = localStorage.getItem("user");
  if (!raw || !accessToken) {
    localStorage.removeItem("user");
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {
    localStorage.removeItem("user");
    return null;
  }
}

function persistSession(data) {
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  localStorage.setItem("user", JSON.stringify(data.user));
}

function clearSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);

  async function login(payload) {
    const { data } = await api.post("/auth/login", payload);
    persistSession(data);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const { data } = await api.post("/auth/register", payload);
    persistSession(data);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (_error) {
      // ignore network errors during logout cleanup
    }
    clearSession();
    setUser(null);
  }

  const value = useMemo(() => ({ user, login, register, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
