import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/client";
import Loader from "../components/Loader";

const STATUS_OPTIONS = ["SCHEDULED", "COMPLETED", "CANCELLED"];

function toDateTimeLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

const defaultForm = {
  routeId: "",
  vehicleId: "",
  departureTime: "",
  arrivalTime: "",
  totalSeats: ""
};

export default function ManagerSchedulesPage() {
  const [form, setForm] = useState(defaultForm);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  const routeOptions = useMemo(() => {
    const unique = [];
    const seen = new Set();
    for (const row of routes) {
      if (!row.route_id || seen.has(row.route_id)) continue;
      seen.add(row.route_id);
      unique.push(row);
    }
    return unique;
  }, [routes]);

  async function loadPageData() {
    setLoading(true);
    try {
      const [routesRes, vehiclesRes, schedulesRes] = await Promise.all([
        api.get("/routes", { params: { page: 1, limit: 100, includeDeleted: false } }),
        api.get("/vehicles", { params: { page: 1, limit: 100, includeDeleted: false } }),
        api.get("/schedules", { params: { page: 1, limit: 100 } })
      ]);

      setRoutes(routesRes.data.data || []);
      setVehicles(vehiclesRes.data.data || []);
      setSchedules(schedulesRes.data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  function setValue(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function createSchedule(event) {
    event.preventDefault();

    const payload = {
      routeId: form.routeId,
      vehicleId: form.vehicleId,
      departureTime: new Date(form.departureTime).toISOString(),
      arrivalTime: new Date(form.arrivalTime).toISOString(),
      totalSeats: Number(form.totalSeats)
    };

    if (
      !payload.routeId ||
      !payload.vehicleId ||
      !form.departureTime ||
      !form.arrivalTime ||
      payload.totalSeats <= 0
    ) {
      toast.error("Fill all required schedule fields");
      return;
    }

    await toast.promise(
      api.post("/schedules", payload).then(async () => {
        setForm(defaultForm);
        await loadPageData();
      }),
      {
        loading: "Creating schedule...",
        success: "Schedule created",
        error: "Schedule creation failed"
      }
    );
  }

  async function updateScheduleStatus(id, status) {
    await toast.promise(api.put(`/schedules/${id}`, { status }).then(loadPageData), {
      loading: "Updating schedule...",
      success: "Schedule updated",
      error: "Schedule update failed"
    });
  }

  async function deleteSchedule(id) {
    const ok = window.confirm("Delete this schedule?");
    if (!ok) return;

    await toast.promise(api.delete(`/schedules/${id}`).then(loadPageData), {
      loading: "Deleting schedule...",
      success: "Schedule deleted",
      error: "Schedule delete failed"
    });
  }

  if (loading) return <Loader text="Loading schedules..." />;

  return (
    <section>
      <article className="card">
        <h2>Manage Schedules</h2>
        <p className="muted">Create schedules by linking routes with available vehicles.</p>
        <form onSubmit={createSchedule}>
          <select value={form.routeId} onChange={(e) => setValue("routeId", e.target.value)}>
            <option value="">Select Route</option>
            {routeOptions.map((route) => (
              <option key={route.route_id} value={route.route_id}>
                {route.source} to {route.destination}
              </option>
            ))}
          </select>

          <select value={form.vehicleId} onChange={(e) => setValue("vehicleId", e.target.value)}>
            <option value="">Select Vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.registration_number} ({vehicle.vehicle_type})
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            value={form.departureTime}
            onChange={(e) => setValue("departureTime", e.target.value)}
          />
          <input
            type="datetime-local"
            value={form.arrivalTime}
            onChange={(e) => setValue("arrivalTime", e.target.value)}
          />
          <input
            type="number"
            min="1"
            placeholder="Total Seats"
            value={form.totalSeats}
            onChange={(e) => setValue("totalSeats", e.target.value)}
          />

          <button className="btn" type="submit">
            Create Schedule
          </button>
        </form>
      </article>

      <article className="card" style={{ marginTop: 12 }}>
        <h2>Upcoming Schedules</h2>
        {schedules.length === 0 && <p className="muted">No schedules found.</p>}
        <div className="grid">
          {schedules.map((schedule) => (
            <article className="card" key={schedule.id}>
              <h3>
                {schedule.source} to {schedule.destination}
              </h3>
              <p>Vehicle: {schedule.registration_number}</p>
              <p>Departure: {toDateTimeLocalInput(schedule.departure_time).replace("T", " ")}</p>
              <p>Arrival: {toDateTimeLocalInput(schedule.arrival_time).replace("T", " ")}</p>
              <p>
                Seats: {schedule.available_seats}/{schedule.total_seats}
              </p>
              <p>Status: {schedule.status}</p>
              <div className="inline-actions">
                <select
                  value={schedule.status}
                  onChange={(e) => updateScheduleStatus(schedule.id, e.target.value)}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button className="btn danger" onClick={() => deleteSchedule(schedule.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
