import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../lib/api.ts";

interface User {
  uid: string;
  email: string;
  role: string;
  name?: string;
  picture?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (
    email: string,
    password: string,
    isGoogleLogin?: boolean
  ) => Promise<void>;
  logout: () => void;
  handleAuthCallback: (token: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          const response = await api.auth.validateToken(token);
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (error) {
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };

    validateToken();
  }, [token]);

  const login = async (
    email: string,
    password: string,
    isGoogleLogin?: boolean
  ) => {
    try {
      const response = isGoogleLogin
        ? await api.auth.googleLogin(email) // email is actually the token in this case
        : await api.auth.login(email, password);

      const { token, ...userData } = response.data;
      localStorage.setItem("token", token);
      setToken(token);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const handleAuthCallback = (token: string) => {
    localStorage.setItem("token", token);
    setToken(token);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        login,
        logout,
        isLoading,
        handleAuthCallback,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
