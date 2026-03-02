import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import loginInfographic from "../assets/infographics1.avif";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (user && accessToken) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  async function onSubmit(values) {
    await toast.promise(
      login(values).then(() => navigate("/", { replace: true })),
      {
        loading: "Signing in...",
        success: "Welcome back",
        error: (error) => {
          const status = error?.response?.status;
          if (status === 401) {
            return "Invalid email or password";
          }
          return (
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            "Unable to sign in right now. Please try again."
          );
        }
      }
    );
  }

  return (
    <section className="login-scene corporate-login">
      <div className="login-grid" />
      <div className="scene-orb scene-orb-a" aria-hidden="true" />
      <div className="scene-orb scene-orb-b" aria-hidden="true" />
      <div className="scene-orb scene-orb-c" aria-hidden="true" />
      <div className="corporate-shell">
        <article className="corporate-panel">
          <p className="corporate-eyebrow">ENTERPRISE OPERATIONS</p>
          <h1>Transport Command Portal</h1>
          <p className="muted">
            Centralized operations for routes, schedules, assignments, and booking visibility.
          </p>
          <div className="corporate-metrics">
            <span>Realtime Dispatch</span>
            <span>Role-Based Access</span>
            <span>Audit Compliant</span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <input type="email" placeholder="Email" {...register("email")} />
            {errors.email && <p className="error">{errors.email.message}</p>}

            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                {...register("password")}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && <p className="error">{errors.password.message}</p>}

            <button className="btn" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="inline-actions">
            <Link to="/forgot-password">Forgot password?</Link>
            <Link to="/register">Create account</Link>
          </div>
        </article>
      </div>
      <div className="volvo-road-wrap page-road" aria-hidden="true">
        <div className="volvo-road-line" />
        <img className="volvo-bus-image" src={loginInfographic} alt="" />
      </div>
    </section>
  );
}
