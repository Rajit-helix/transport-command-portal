import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/client";
import Loader from "../components/Loader";

const STATUS_OPTIONS = ["ACTIVE", "MAINTENANCE", "INACTIVE"];

const defaultForm = {
  registrationNumber: "",
  vehicleType: "",
  capacity: ""
};

export default function ManagerVehiclesPage() {
  const [form, setForm] = useState(defaultForm);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadVehicles() {
    setLoading(true);
    try {
      const { data } = await api.get("/vehicles", {
        params: { page: 1, limit: 50, includeDeleted: false }
      });
      setVehicles(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  function setValue(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function createVehicle(event) {
    event.preventDefault();

    const payload = {
      registrationNumber: form.registrationNumber.trim(),
      vehicleType: form.vehicleType.trim(),
      capacity: Number(form.capacity)
    };

    if (!payload.registrationNumber || !payload.vehicleType || payload.capacity <= 0) {
      toast.error("Provide registration number, type and valid capacity");
      return;
    }

    await toast.promise(
      api.post("/vehicles", payload).then(async () => {
        setForm(defaultForm);
        await loadVehicles();
      }),
      {
        loading: "Creating vehicle...",
        success: "Vehicle created",
        error: "Vehicle creation failed"
      }
    );
  }

  async function updateVehicleStatus(vehicle, status) {
    await toast.promise(
      api
        .put(`/vehicles/${vehicle.id}`, {
          status,
          isActive: status === "ACTIVE"
        })
        .then(loadVehicles),
      {
        loading: "Updating vehicle...",
        success: "Vehicle updated",
        error: "Vehicle update failed"
      }
    );
  }

  async function deleteVehicle(id) {
    const ok = window.confirm("Delete this vehicle?");
    if (!ok) return;

    await toast.promise(api.delete(`/vehicles/${id}`).then(loadVehicles), {
      loading: "Deleting vehicle...",
      success: "Vehicle deleted",
      error: "Vehicle delete failed"
    });
  }

  if (loading) return <Loader text="Loading vehicles..." />;

  return (
    <section>
      <article className="card">
        <h2>Manage Vehicles</h2>
        <p className="muted">Create and maintain the active fleet.</p>
        <form onSubmit={createVehicle}>
          <input
            placeholder="Registration Number (e.g. OD-02-1234)"
            value={form.registrationNumber}
            onChange={(e) => setValue("registrationNumber", e.target.value)}
          />
          <input
            placeholder="Vehicle Type (e.g. AC Sleeper, Mini Bus)"
            value={form.vehicleType}
            onChange={(e) => setValue("vehicleType", e.target.value)}
          />
          <input
            type="number"
            min="1"
            placeholder="Capacity"
            value={form.capacity}
            onChange={(e) => setValue("capacity", e.target.value)}
          />
          <button className="btn" type="submit">
            Create Vehicle
          </button>
        </form>
      </article>

      <article className="card" style={{ marginTop: 12 }}>
        <h2>Fleet</h2>
        {vehicles.length === 0 && <p className="muted">No vehicles found.</p>}
        <div className="grid">
          {vehicles.map((vehicle) => (
            <article className="card" key={vehicle.id}>
              <h3>{vehicle.registration_number}</h3>
              <p>Type: {vehicle.vehicle_type}</p>
              <p>Capacity: {vehicle.capacity}</p>
              <p>Status: {vehicle.status}</p>
              <div className="inline-actions">
                <select
                  value={vehicle.status}
                  onChange={(e) => updateVehicleStatus(vehicle, e.target.value)}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button className="btn danger" onClick={() => deleteVehicle(vehicle.id)}>
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
