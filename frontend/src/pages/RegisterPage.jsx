import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import busInterior from "../assets/bus-interior.png";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["CUSTOMER", "DRIVER", "TRANSPORT_MANAGER"])
});

export default function RegisterPage() {
  const { register: registerApi } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: "CUSTOMER" }
  });

  async function onSubmit(values) {
    await toast.promise(
      registerApi(values).then(() => navigate("/")),
      {
        loading: "Creating account...",
        success: "Account created",
        error: (error) =>
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Registration failed"
      }
    );
  }

  return (
    <section
      className="auth-interior-scene auth-interior-scene-register"
      style={{ "--interior-image": `url(${busInterior})` }}
    >
      <div className="interior-handrails" aria-hidden="true" />
      <div className="interior-seatbank interior-seatbank-left" aria-hidden="true" />
      <div className="interior-seatbank interior-seatbank-right" aria-hidden="true" />
      <article className="card auth-card interior-card interior-card-register">
        <p className="interior-eyebrow">PASSENGER ONBOARDING</p>
        <h2>Register</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <input placeholder="Full Name" {...register("fullName")} />
          {errors.fullName && <p className="error">{errors.fullName.message}</p>}

          <input placeholder="Email" type="email" {...register("email")} />
          {errors.email && <p className="error">{errors.email.message}</p>}

          <div className="password-field">
            <input
              placeholder="Password"
              type={showPassword ? "text" : "password"}
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

          <select {...register("role")}>
            <option value="CUSTOMER">Customer</option>
            <option value="DRIVER">Driver</option>
            <option value="TRANSPORT_MANAGER">Transport Manager</option>
          </select>

          <button className="btn" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating..." : "Create Account"}
          </button>
        </form>
        <p className="auth-footnote">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </article>
    </section>
  );
}
