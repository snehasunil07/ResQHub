import { createContext, useContext, useState, useEffect } from "react";
import { apiUrl } from "../config/api";

const AuthContext = createContext(null);

// Safe JSON parsing helper to prevent "Unexpected end of JSON input" errors
const parseJsonResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          "API service is unreachable (404). Please ensure the backend server is running and accessible."
        );
      }
      if (response.status >= 500) {
        throw new Error(
          "Backend server gateway error. Please verify the Express backend service status."
        );
      }
      throw new Error(`Unexpected response (${response.status}). Please try again.`);
    }
    const text = await response.text();
    throw new Error(text || "Server returned an empty or non-JSON response.");
  }

  try {
    return await response.json();
  } catch {
    throw new Error("Invalid response format from server. Please verify backend service.");
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("resqhub_token") || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem("resqhub_token");
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(apiUrl("/api/auth/me"), {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (response.ok) {
          const data = await parseJsonResponse(response);
          if (data.success && data.user) {
            setUser(data.user);
            setToken(storedToken);
          } else {
            localStorage.removeItem("resqhub_token");
            setToken(null);
            setUser(null);
          }
        } else {
          // Token invalid or expired
          localStorage.removeItem("resqhub_token");
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error("[Auth] Session restoration error:", err);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Register user
  const register = async ({ name, email, phone, password, role = "user", interests = [] }) => {
    setError(null);
    try {
      const response = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, phone, password, role, interests }),
      });

      const data = await parseJsonResponse(response);

      if (!response.ok) {
        const msg = data.message || "Registration failed. Please check your inputs.";
        setError(msg);
        return { success: false, message: msg };
      }

      // Save token and user
      if (data.token && data.user) {
        localStorage.setItem("resqhub_token", data.token);
        setToken(data.token);
        setUser(data.user);
      }

      return { success: true, user: data.user };
    } catch (err) {
      const msg = err.message || "Network error. Please try again later.";
      setError(msg);
      return { success: false, message: msg };
    }
  };

  // Login user
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await parseJsonResponse(response);

      if (!response.ok) {
        const msg = data.message || "Invalid credentials.";
        setError(msg);
        return { success: false, message: msg };
      }

      if (data.token && data.user) {
        localStorage.setItem("resqhub_token", data.token);
        setToken(data.token);
        setUser(data.user);
      }

      return { success: true, user: data.user };
    } catch (err) {
      const msg = err.message || "Network error. Please try again later.";
      setError(msg);
      return { success: false, message: msg };
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      const response = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await parseJsonResponse(response);

      if (!response.ok) {
        const msg = data.message || "Password reset request failed.";
        return { success: false, message: msg };
      }

      return { success: true, message: data.message };
    } catch (err) {
      const msg = err.message || "Network error. Please try again later.";
      return { success: false, message: msg };
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem("resqhub_token");
    setToken(null);
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        register,
        login,
        forgotPassword,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
