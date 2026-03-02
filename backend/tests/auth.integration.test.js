import request from "supertest";
import { app } from "../src/app.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}@example.com`;
}

describe("Auth integration", () => {
  it("register and login", async () => {
    const email = uniqueEmail("auth");

    const registerRes = await request(app).post("/api/auth/register").send({
      fullName: "Auth Test User",
      email,
      password: "Password@123",
      role: "CUSTOMER"
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.accessToken).toBeTruthy();

    const loginRes = await request(app).post("/api/auth/login").send({
      email,
      password: "Password@123"
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.email).toBe(email);
    expect(loginRes.body.accessToken).toBeTruthy();
  });
});
