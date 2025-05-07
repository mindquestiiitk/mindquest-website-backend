import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

class AuthService {
  async googleAuth(idToken) {
    try {
      const response = await axios.post(
        `${API_URL}/auth/google`,
        { idToken },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Google auth error:", error);
      throw error.response?.data || error;
    }
  }

  async handleCallback(token) {
    try {
      const response = await axios.get(`${API_URL}/auth/callback`, {
        params: { token },
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.data.success && response.data.data.token) {
        localStorage.setItem("auth_token", response.data.data.token);
      }
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        // User doesn't exist, return special response
        return {
          success: false,
          needsRegistration: true,
          userData: error.response.data.userData,
        };
      }
      console.error("Auth callback error:", error);
      throw error.response?.data || error;
    }
  }

  async registerUser(userData) {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.data.success && response.data.data.token) {
        localStorage.setItem("auth_token", response.data.data.token);
      }
      return response.data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error.response?.data || error;
    }
  }

  async logout() {
    try {
      const response = await axios.post(
        `${API_URL}/auth/logout`,
        {},
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      localStorage.removeItem("auth_token");
      return response.data;
    } catch (error) {
      console.error("Logout error:", error);
      throw error.response?.data || error;
    }
  }

  async checkAuth() {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        return { isAuthenticated: false };
      }

      const response = await axios.get(`${API_URL}/auth/check`, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Auth check error:", error);
      localStorage.removeItem("auth_token");
      return { isAuthenticated: false };
    }
  }

  async validateToken() {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        return { isAuthenticated: false };
      }

      const response = await axios.post(
        `${API_URL}/auth/validate`,
        {},
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Token validation error:", error);
      localStorage.removeItem("auth_token");
      return { isAuthenticated: false };
    }
  }
}

export default new AuthService();
