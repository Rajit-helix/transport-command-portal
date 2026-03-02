import request from "supertest";
import { app } from "../src/app.js";

async function customerToken() {
  const email = `rbac.${Date.now()}@example.com`;
  await request(app).post("/api/auth/register").send({
    fullName: "RBAC Customer",
    email,
    password: "Password@123",
    role: "CUSTOMER"
  });
  const login = await request(app).post("/api/auth/login").send({ email, password: "Password@123" });
  return login.body.accessToken;
}

describe("RBAC/permission enforcement", () => {
  it("customer cannot list vehicles", async () => {
    const token = await customerToken();

    const res = await request(app).get("/api/vehicles").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });
});
