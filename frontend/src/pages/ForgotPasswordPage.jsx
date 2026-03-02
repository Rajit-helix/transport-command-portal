import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import toast from "react-hot-toast";
import api from "../api/client";

const schema = z.object({
  email: z.string().email()
});

export default function ForgotPasswordPage() {
  const [devReset, setDevReset] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(values) {
    await toast.promise(
      api.post("/auth/forgot-password", values).then(({ data }) => {
        setDevReset(data.resetToken ? { token: data.resetToken, expiresAt: data.expiresAt } : null);
      }),
      {
        loading: "Preparing reset link...",
        success: "If that email exists, reset details are ready.",
        error: (error) => {
          const status = error?.response?.status;
          if (status === 429) {
            return "Too many reset attempts. Please wait and try again.";
          }
          return (
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            "Unable to process password reset request right now."
          );
        }
      }
    );
  }

  return (
    <section className="card auth-card">
      <h2>Forgot Password</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input type="email" placeholder="Enter your email" {...register("email")} />
        {errors.email && <p className="error">{errors.email.message}</p>}

        <button className="btn" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Submitting..." : "Send Reset Link"}
        </button>
      </form>

      {devReset && (
        <article className="card" style={{ marginTop: 12 }}>
          <h3>Reset Token (Development)</h3>
          <p className="muted">Use this on the reset page.</p>
          <p style={{ wordBreak: "break-all", marginTop: 0 }}>{devReset.token}</p>
          <p className="muted">Expires: {new Date(devReset.expiresAt).toLocaleString()}</p>
          <Link to={`/reset-password?token=${encodeURIComponent(devReset.token)}`}>Go to reset page</Link>
        </article>
      )}

      <p>
        <Link to="/login">Back to login</Link>
      </p>
    </section>
  );
}
