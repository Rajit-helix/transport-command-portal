import request from "supertest";
import { app } from "../src/app.js";

function uniqueEmail() {
  return `pwdreset.${Date.now()}@example.com`;
}

describe("Password reset flow", () => {
  it("resets password and allows login with the new password only", async () => {
    const email = uniqueEmail();
    const originalPassword = "Password@123";
    const newPassword = "Password@456";

    const registerRes = await request(app).post("/api/auth/register").send({
      fullName: "Password Reset User",
      email,
      password: originalPassword,
      role: "CUSTOMER"
    });
    expect(registerRes.status).toBe(201);

    const forgotRes = await request(app).post("/api/auth/forgot-password").send({ email });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.resetToken).toBeTruthy();

    const resetRes = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: forgotRes.body.resetToken, newPassword });
    expect(resetRes.status).toBe(200);

    const loginWithOldPasswordRes = await request(app)
      .post("/api/auth/login")
      .send({ email, password: originalPassword });
    expect(loginWithOldPasswordRes.status).toBe(401);

    const loginWithNewPasswordRes = await request(app).post("/api/auth/login").send({
      email,
      password: newPassword
    });
    expect(loginWithNewPasswordRes.status).toBe(200);
    expect(loginWithNewPasswordRes.body.user.email).toBe(email);
  });
});
