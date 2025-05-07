import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import "react-toastify/dist/ReactToastify.css";

const Login_block = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed", {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      // Get the Google auth URL from backend
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/google`
      );
      if (!response.ok) {
        throw new Error("Failed to initialize Google login");
      }
      const { url } = await response.json();

      // Redirect to Google auth URL
      window.location.href = url;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Google login failed"
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#d4f5d4] rounded-3xl shadow-lg p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-medium text-primary-green mb-12 font-acme">
          Login
        </h1>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="relative">
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full pb-2 border-b-2 border-gray-300 bg-transparent text-primary-green focus:outline-none focus:border-[#006833] disabled:opacity-50"
              placeholder="Email"
              required
            />
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type="password"
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full pb-2 border-b-2 border-gray-300 bg-transparent text-primary-green focus:outline-none focus:border-[#006833] disabled:opacity-50"
              placeholder="Password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-primary-green text-secondary-green font-medium rounded-2xl mt-8 disabled:opacity-50"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#d4f5d4] text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="mt-6 w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-2xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <img
              className="h-5 w-5 mr-2"
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google logo"
            />
            {isGoogleLoading ? "Signing in..." : "Sign in with Google"}
          </button>
        </div>

        <ToastContainer
          position="top-center"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </div>
    </div>
  );
};

export default Login_block;
