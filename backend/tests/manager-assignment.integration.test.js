import request from "supertest";
import { app } from "../src/app.js";

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}@example.com`;
}

async function managerToken() {
  const managerEmail = uniqueEmail("manager");
  const register = await request(app).post("/api/auth/register").send({
    fullName: "Transport Manager",
    email: managerEmail,
    password: "Password@123",
    role: "TRANSPORT_MANAGER"
  });

  return register.body.accessToken;
}

describe("Manager driver assignment", () => {
  it("manager creates driver assignment", async () => {
    const token = await managerToken();
    expect(token).toBeTruthy();

    const driverEmail = `driver.${Date.now()}@example.com`;
    const driverRes = await request(app).post("/api/auth/register").send({
      fullName: "Assigned Driver",
      email: driverEmail,
      password: "Password@123",
      role: "DRIVER"
    });
    expect(driverRes.status).toBe(201);

    const vehicleRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        registrationNumber: `KA${Date.now().toString().slice(-8)}`,
        vehicleType: "BUS",
        capacity: 40
      });
    expect(vehicleRes.status).toBe(201);

    const routeRes = await request(app)
      .post("/api/routes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        source: "City Center",
        destination: "Airport",
        basePrice: 200,
        distanceKm: 10
      });
    expect(routeRes.status).toBe(201);

    const scheduleRes = await request(app)
      .post("/api/schedules")
      .set("Authorization", `Bearer ${token}`)
      .send({
        routeId: routeRes.body.data.id,
        vehicleId: vehicleRes.body.data.id,
        departureTime: new Date(Date.now() + 3600000).toISOString(),
        arrivalTime: new Date(Date.now() + 7200000).toISOString(),
        totalSeats: 20
      });
    expect(scheduleRes.status).toBe(201);

    const assignRes = await request(app)
      .post("/api/driver-assignments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        driverId: driverRes.body.user.id,
        scheduleId: scheduleRes.body.data.id
      });

    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data.driver_id).toBe(driverRes.body.user.id);
  });
});
