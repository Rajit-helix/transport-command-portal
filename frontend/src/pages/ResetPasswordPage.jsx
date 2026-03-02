import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import toast from "react-hot-toast";
import api from "../api/client";
import busInterior from "../assets/bus-interior.png";

const schema = z
  .object({
    token: z.string().min(20, "Reset token is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8)
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match"
  });

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryToken = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      token: queryToken,
      newPassword: "",
      confirmPassword: ""
    }
  });

  async function onSubmit(values) {
    await toast.promise(
      api
        .post("/auth/reset-password", { token: values.token.trim(), newPassword: values.newPassword })
        .then(() => navigate("/login")),
      {
        loading: "Resetting password...",
        success: "Password updated. Please log in.",
        error: (error) =>
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Unable to reset password right now."
      }
    );
  }

  return (
    <section className="auth-interior-scene" style={{ "--interior-image": `url(${busInterior})` }}>
      <div className="interior-handrails" aria-hidden="true" />
      <div className="interior-seatbank interior-seatbank-left" aria-hidden="true" />
      <div className="interior-seatbank interior-seatbank-right" aria-hidden="true" />
      <article className="card auth-card interior-card interior-card-reset">
        <p className="interior-eyebrow">SECURE ACCESS RECOVERY</p>
        <h2>Reset Password</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <input placeholder="Reset Token" {...register("token")} />
          {errors.token && <p className="error">{errors.token.message}</p>}

          <div className="password-field">
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="New Password"
              {...register("newPassword")}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowNewPassword((value) => !value)}
              aria-label={showNewPassword ? "Hide new password" : "Show new password"}
            >
              {showNewPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.newPassword && <p className="error">{errors.newPassword.message}</p>}

          <div className="password-field">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm New Password"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword((value) => !value)}
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.confirmPassword && <p className="error">{errors.confirmPassword.message}</p>}

          <button className="btn" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Updating..." : "Update Password"}
          </button>
        </form>

        <p className="auth-footnote">
          <Link to="/login">Back to login</Link>
        </p>
      </article>
    </section>
  );
}
