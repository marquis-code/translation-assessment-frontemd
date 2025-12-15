
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Cookies from "js-cookie";

const API_BASE_URL = "https://translation-api-backend.onrender.com";

type LoginFormData = {
  username: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<LoginFormData>({
    username: "doctor@clinic.com",
    password: "password123",
  });

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, formData);

      // adjust these keys if your backend response differs
      const { access_token, user } = response.data ?? {};

      Cookies.set("token", access_token, { expires: 1 });
      Cookies.set("user", JSON.stringify(user), { expires: 1 });

      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">
            Medical Transcription System
          </h1>
          <p className="text-gray-600">Doctor Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="input-field"
              placeholder="doctor@clinic.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <p className="text-sm font-semibold text-gray-700 mb-2">Demo Credentials:</p>
          <p className="text-sm text-gray-600">Email: doctor@clinic.com</p>
          <p className="text-sm text-gray-600">Password: password123</p>
        </div>
      </div>
    </div>
  );
}
