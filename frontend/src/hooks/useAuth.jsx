import { createContext, useContext, useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isChecking = useRef(false);

  const checkUser = async () => {
    // Only fetch if we don't have a user or are not currently checking
    if (isChecking.current) return;
    
    isChecking.current = true;
    try {
        const userData = await api.get("/auth/me");
        if (userData && userData.user) {
            setUser(userData.user);
            localStorage.setItem("user", JSON.stringify(userData.user));
        } else if (userData && userData.id) {
            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
        }
    } catch (e) {
        console.warn("User not logged in");
        setUser(null);
        localStorage.removeItem("user");
    } finally {
        setLoading(false);
        isChecking.current = false;
    }
  };

  useEffect(() => {
    // 1. Restore from localStorage for instant UI
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
        try {
            setUser(JSON.parse(savedUser));
            setLoading(false); // Render children immediately if we have a saved user
        } catch (e) {
            localStorage.removeItem("user");
        }
    }

    // 2. Verify with server (only once)
    checkUser();

    // 3. Setup global listeners
    const handleUnauthorized = () => {
        setUser(null);
        localStorage.removeItem("user");
        
        // Only redirect to login if we're not already on a public/auth path
        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/auth/callback'];
        const isPublicPath = publicPaths.some(path => window.location.pathname.startsWith(path));
        
        if (!isPublicPath) {
            navigate("/login");
        }
    };

    window.addEventListener("unauthorized", handleUnauthorized);
    return () => window.removeEventListener("unauthorized", handleUnauthorized);
  }, []); // Run ONLY once on mount

  const updateUser = (userData) => {
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
  };

  const login = async (email, password, captchaToken) => {
    const res = await api.post("/auth/login", { email, password, captchaToken });
    updateUser(res.user);
    navigate("/");
  };

  const register = async (data, captchaToken) => {
    await api.post("/auth/register", { ...data, captchaToken });
  };

  const logout = async () => {
    try {
        await api.post("/auth/logout");
    } catch (e) {
        console.error("Logout error", e);
    }
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
