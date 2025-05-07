import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.tsx";
import authService from "../services/auth.service.js";

interface PendingRegistration {
  token: string;
  userData: {
    email: string;
    name?: string;
    picture?: string;
  };
}

const Register = () => {
  const navigate = useNavigate();
  const { handleAuthCallback } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    role: "student", // default role
  });
  const [pendingRegistration, setPendingRegistration] =
    useState<PendingRegistration | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("pending_registration");
    if (!stored) {
      navigate("/login");
      return;
    }

    try {
      const data = JSON.parse(stored);
      setPendingRegistration(data);
    } catch (error) {
      console.error("Error parsing stored registration data:", error);
      navigate("/login");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!pendingRegistration) {
      setError("No registration data found");
      return;
    }

    try {
      const response = await authService.registerUser({
        ...formData,
        email: pendingRegistration.userData.email,
        name: pendingRegistration.userData.name,
        picture: pendingRegistration.userData.picture,
      });

      if (response.success) {
        handleAuthCallback(pendingRegistration.token);
        localStorage.removeItem("pending_registration");
        navigate("/dashboard");
      } else {
        setError(response.message || "Registration failed");
      }
    } catch (error: any) {
      setError(error.message || "Registration failed");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!pendingRegistration) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Complete Your Registration
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please provide additional information to complete your registration
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-green focus:border-primary-green focus:z-10 sm:text-sm"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="role" className="sr-only">
                Role
              </label>
              <select
                id="role"
                name="role"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-green focus:border-primary-green focus:z-10 sm:text-sm"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-green hover:bg-primary-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-green"
            >
              Complete Registration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
