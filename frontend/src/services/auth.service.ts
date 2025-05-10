import axios, { AxiosError } from "axios";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../config/firebase";

const API_URL = import.meta.env.VITE_API_URL;

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
}

class AuthService {
  public token: string | null = null;
  private googleProvider = new GoogleAuthProvider();

  constructor() {
    // Initialize token from localStorage
    this.token = localStorage.getItem("token");
    if (this.token) {
      this.setupAxiosInterceptors();
    }
  }

  public setupAxiosInterceptors() {
    axios.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.token = null;
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      // Extract the error message from the response
      // Check for our custom error format first
      if (error.response?.data?.error) {
        // If error is an object with a message property
        if (
          typeof error.response.data.error === "object" &&
          error.response.data.error.message
        ) {
          throw new Error(error.response.data.error.message);
        }
        // If error is a string
        if (typeof error.response.data.error === "string") {
          throw new Error(error.response.data.error);
        }
      }

      // Fallback to other possible error formats
      const message =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.message;

      throw new Error(message);
    } else if (error instanceof Error) {
      // Handle Firebase Auth errors
      const errorCode = (error as any).code;
      if (errorCode && errorCode.startsWith("auth/")) {
        // Map Firebase Auth error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
          "auth/email-already-in-use":
            "This email address is already in use. Please try a different email or sign in.",
          "auth/invalid-email":
            "The email address is not valid. Please check and try again.",
          "auth/user-disabled":
            "This account has been disabled. Please contact support for assistance.",
          "auth/user-not-found":
            "No account found with this email address. Please check your email or register.",
          "auth/wrong-password":
            "Incorrect password. Please try again or reset your password.",
          "auth/invalid-credential":
            "Invalid login credentials. Please check your email and password.",
          "auth/weak-password":
            "Password is too weak. Please use a stronger password with at least 6 characters.",
          "auth/too-many-requests":
            "Too many unsuccessful login attempts. Please try again later or reset your password.",
          "auth/network-request-failed":
            "Network error. Please check your internet connection and try again.",
          "auth/popup-closed-by-user":
            "Sign-in popup was closed before completing the sign-in process. Please try again.",
        };

        throw new Error(errorMessages[errorCode] || error.message);
      }

      throw error;
    }

    // For unknown errors
    throw new Error("An unexpected error occurred. Please try again.");
  }

  private async getBackendToken(firebaseUser: FirebaseUser): Promise<string> {
    const idToken = await firebaseUser.getIdToken();
    const response = await axios.post<{ token: string }>(
      `${API_URL}/auth/token`,
      { idToken }
    );
    return response.data.token;
  }

  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      const token = await this.getBackendToken(firebaseUser);
      this.token = token;
      localStorage.setItem("token", token);
      this.setupAxiosInterceptors();

      const response = await axios.get<{ data: { user: User } }>(
        `${API_URL}/auth/me`
      );
      return response.data.data.user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(data: RegisterData): Promise<User> {
    try {
      // First create the user in Firebase
      const { user: firebaseUser } = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // Get the Firebase ID token
      const idToken = await firebaseUser.getIdToken();

      // Register with the backend using the Firebase ID token
      const response = await axios.post<{
        data: { user: User; token: string };
      }>(`${API_URL}/auth/register`, {
        name: data.name,
        email: data.email,
        idToken: idToken,
      });

      // Set the token from the backend response
      this.token = response.data.data.token;
      localStorage.setItem("token", this.token);
      this.setupAxiosInterceptors();

      return response.data.data.user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async loginWithGoogle(): Promise<User> {
    try {
      const { user: firebaseUser } = await signInWithPopup(
        auth,
        this.googleProvider
      );
      const token = await this.getBackendToken(firebaseUser);

      this.token = token;
      localStorage.setItem("token", token);
      this.setupAxiosInterceptors();

      const response = await axios.get<{ data: { user: User } }>(
        `${API_URL}/auth/me`
      );
      console.log(response.data.data.user);
      return response.data.data.user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
      await axios.post(`${API_URL}/auth/logout`);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.token = null;
      localStorage.removeItem("token");
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await axios.get<{
        success: boolean;
        data: { user: User };
      }>(`${API_URL}/auth/me`);
      return response.data.data.user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const response = await axios.put<{
        success: boolean;
        data: { user: User };
      }>(`${API_URL}/auth/me`, data);
      return response.data.data.user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await axios.post(`${API_URL}/auth/reset-password`, { token, password });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async handleCallback(token: string) {
    try {
      const response = await axios.post<{
        success: boolean;
        needsRegistration?: boolean;
        userData?: any;
      }>(
        `${API_URL}/auth/validate`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }
}

export const authService = new AuthService();
