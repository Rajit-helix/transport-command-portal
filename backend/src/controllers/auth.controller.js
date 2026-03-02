import bcrypt from "bcryptjs";
import crypto from "crypto";
import { query, withTransaction } from "../config/db.js";
import { conflict, unauthorized } from "../utils/errors.js";
import { signAccessToken, signRefreshToken, verifyToken } from "../utils/jwt.js";
import { sendMail } from "../services/mail.service.js";
import { writeAuditLog } from "../services/audit.service.js";
import { env } from "../config/env.js";

function tokenPayload(user) {
  return { sub: user.id, role: user.role, tokenVersion: user.token_version };
}

const RESET_TOKEN_VALID_MINUTES = 15;

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function register(req, res, next) {
  try {
    const { fullName, email, password, role } = req.validated.body;

    const selectedRole = role || "CUSTOMER";

    // Normalize email
    const normalizedEmail = email.toLowerCase();

    // Check existing user
    const existing = await query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existing.rowCount > 0) {
      throw conflict("Email already registered");
    }

    // Check role exists
    const roleResult = await query(
      "SELECT id, name FROM roles WHERE name = $1",
      [selectedRole]
    );

    if (roleResult.rowCount === 0) {
      throw conflict("Invalid role selected");
    }

    const roleRow = roleResult.rows[0];

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert user
    const created = await query(
      `INSERT INTO users (full_name, email, password_hash, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, token_version`,
      [fullName, normalizedEmail, passwordHash, roleRow.id]
    );

    const user = {
      ...created.rows[0],
      role: roleRow.name
    };

    const accessToken = signAccessToken(tokenPayload(user));
    const refreshToken = signRefreshToken(tokenPayload(user));

    await writeAuditLog({
      actorUserId: user.id,
      action: "REGISTER",
      entityType: "USER",
      entityId: user.id,
      requestId: req.id,
      metadata: { email: user.email, role: user.role }
    });

    res.status(201).json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.validated.body;
    const normalizedEmail = email.trim().toLowerCase();

    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.password_hash, 
              u.token_version, u.is_active, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.email = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    let user = result.rows[0];

    // 🔐 Prevent timing attacks (always compare hash)
    const dummyHash =
      "$2a$12$C6UzMDM.H6dfI/f/IKcEeOq5rC/7xjG8n8D7tY8DbDeihdj5Z8SGO"; 
    const hashToCompare = user?.password_hash || dummyHash;

    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordMatch || !user.is_active) {
      throw unauthorized("Invalid credentials");
    }

    const payload = tokenPayload(user);

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await writeAuditLog({
      actorUserId: user.id,
      action: "LOGIN",
      entityType: "USER",
      entityId: user.id,
      requestId: req.id,
      metadata: { email: user.email }
    });

    return res.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
}


export async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.validated.body;
    const decoded = verifyToken(refreshToken);

    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.token_version, r.name as role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [decoded.sub]
    );

    if (result.rowCount === 0) {
      throw unauthorized("User not found");
    }

    const user = result.rows[0];
    if (decoded.tokenVersion !== user.token_version) {
      throw unauthorized("Invalid refresh token");
    }

    const newAccessToken = signAccessToken(tokenPayload(user));
    const newRefreshToken = signRefreshToken(tokenPayload(user));

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (_error) {
    next(unauthorized("Invalid refresh token"));
  }
}

export async function logout(req, res, next) {
  try {
    await query("UPDATE users SET token_version = token_version + 1 WHERE id = $1", [req.user.id]);

    await writeAuditLog({
      actorUserId: req.user.id,
      action: "LOGOUT",
      entityType: "USER",
      entityId: req.user.id,
      requestId: req.id
    });

    res.json({ message: "Logged out" });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.validated.body;
    const normalizedEmail = email.toLowerCase();

    const userResult = await query("SELECT id, email FROM users WHERE email = $1 AND is_active = TRUE", [
      normalizedEmail
    ]);

    const message = "If that email exists, a reset link has been generated.";

    if (userResult.rowCount === 0) {
      return res.json({ message });
    }

    const user = userResult.rows[0];
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(rawToken);
    await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [user.id]);
    const tokenInsert = await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)
       RETURNING expires_at`,
      [user.id, tokenHash, String(RESET_TOKEN_VALID_MINUTES)]
    );
    const expiresAt = tokenInsert.rows[0].expires_at;

    await writeAuditLog({
      actorUserId: user.id,
      action: "FORGOT_PASSWORD_REQUEST",
      entityType: "USER",
      entityId: user.id,
      requestId: req.id,
      metadata: { email: user.email }
    });

    // Send password reset email for non-test environments.
    const resetUrl = `${env.frontendUrl || "http://localhost:5173"}/reset-password?token=${rawToken}`;
    if (!env.isTest) {
      try {
        await sendMail({
          to: user.email,
          subject: "Password Reset Request",
          html: `<p>You requested a password reset.</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link will expire in ${RESET_TOKEN_VALID_MINUTES} minutes.</p>`
        });
      } catch {
        // Do not leak email existence or fail the API if mail transport is unavailable.
      }
    }

    return res.json({
      message,
      ...(env.isProduction
        ? {}
        : {
            resetToken: rawToken,
            expiresAt,
            resetUrl
          })
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.validated.body;
    const tokenHash = hashResetToken(token);

    const tokenResult = await query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.is_active
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );

    if (tokenResult.rowCount === 0) {
      throw unauthorized("Invalid or expired reset token");
    }

    const resetRow = tokenResult.rows[0];
    const now = Date.now();
    const isExpired = new Date(resetRow.expires_at).getTime() < now;

    if (resetRow.used_at || isExpired || !resetRow.is_active) {
      throw unauthorized("Invalid or expired reset token");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE users
         SET password_hash = $1,
             token_version = token_version + 1,
             updated_at = NOW()
         WHERE id = $2 AND is_active = TRUE`,
        [passwordHash, resetRow.user_id]
      );

      await client.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1", [
        resetRow.id
      ]);
    });

    await writeAuditLog({
      actorUserId: resetRow.user_id,
      action: "RESET_PASSWORD",
      entityType: "USER",
      entityId: resetRow.user_id,
      requestId: req.id
    });

    res.json({ message: "Password reset successful. Please log in with your new password." });
  } catch (error) {
    next(error);
  }
}
