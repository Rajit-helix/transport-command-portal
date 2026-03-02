import request from "supertest";
import { app } from "../src/app.js";

async function loginCustomer() {
  const email = `customer.${Date.now()}@example.com`;
  await request(app).post("/api/auth/register").send({
    fullName: "Booking Customer",
    email,
    password: "Password@123",
    role: "CUSTOMER"
  });
  const login = await request(app).post("/api/auth/login").send({ email, password: "Password@123" });
  return login.body.accessToken;
}

describe("Booking flow", () => {
  it("create then cancel booking", async () => {
    const token = await loginCustomer();

    const routesRes = await request(app).get("/api/routes").query({ page: 1, limit: 20 });
    expect(routesRes.status).toBe(200);

    const routeWithSchedule = (routesRes.body.data || []).find((r) => r.schedule_id);
    expect(routeWithSchedule).toBeTruthy();

    const createRes = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ scheduleId: routeWithSchedule.schedule_id, seatCount: 1 });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe("CONFIRMED");

    const cancelRes = await request(app)
      .patch(`/api/bookings/${createRes.body.data.id}/cancel`)
      .set("Authorization", `Bearer ${token}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe("CANCELLED");
  });
});
