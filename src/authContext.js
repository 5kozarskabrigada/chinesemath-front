import React, { createContext, useContext, useState, useEffect } from "react";
import { apiLogin } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("math_user");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      localStorage.removeItem("math_user");
      localStorage.removeItem("math_token");
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    const saved = localStorage.getItem("math_token");
    if (!saved) return null;
    try {
      return saved;
    } catch (e) {
      localStorage.removeItem("math_token");
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem("math_user", JSON.stringify(user));
    else localStorage.removeItem("math_user");
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem("math_token", token);
    else localStorage.removeItem("math_token");
  }, [token]);

  const login = async (identifier, password) => {
    const data = await apiLogin(identifier, password);
    setUser(data.user);
    setToken(data.token);
    return data.user;
  };

  const logout = () => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("math_") || key.startsWith("exam_"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
