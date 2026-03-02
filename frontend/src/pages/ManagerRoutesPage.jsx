import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client";
import Loader from "../components/Loader";

const emptyRow = () => ({ source: "", destination: "", basePrice: "", distanceKm: "" });

export default function ManagerRoutesPage() {
  const [rows, setRows] = useState([emptyRow(), emptyRow()]);
  const [routes, setRoutes] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const cityNames = useMemo(() => new Set(cities.map((city) => city.name.toLowerCase())), [cities]);

  async function loadRoutes() {
    setLoading(true);
    try {
      const [routesRes, citiesRes] = await Promise.all([
        api.get("/routes", { params: { page: 1, limit: 25, includeDeleted: false } }),
        api.get("/cities", { params: { limit: 500 } })
      ]);
      setRoutes(routesRes.data.data || []);
      setCities(citiesRes.data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoutes();
  }, []);

  function updateRow(index, key, value) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function createBulkRoutes(event) {
    event.preventDefault();
    const prepared = rows
      .map((row) => ({
        source: row.source.trim(),
        destination: row.destination.trim(),
        basePrice: Number(row.basePrice),
        distanceKm: Number(row.distanceKm)
      }))
      .filter((row) => row.source && row.destination && row.basePrice > 0 && row.distanceKm > 0);

    if (prepared.length === 0) {
      toast.error("Add at least one valid route row");
      return;
    }

    const invalidRowIndex = prepared.findIndex(
      (row) => !cityNames.has(row.source.toLowerCase()) || !cityNames.has(row.destination.toLowerCase())
    );
    if (invalidRowIndex !== -1) {
      toast.error(`Row ${invalidRowIndex + 1}: source/destination must be from city master`);
      return;
    }

    await toast.promise(
      api.post("/routes/bulk", { routes: prepared }).then(async ({ data }) => {
        const created = data?.data?.createdCount || 0;
        const failed = data?.data?.failedCount || 0;
        toast.success(`Routes created: ${created}, failed: ${failed}`);
        setRows([emptyRow(), emptyRow()]);
        await loadRoutes();
      }),
      {
        loading: "Creating routes...",
        success: "Bulk route creation complete",
        error: "Failed to create routes"
      }
    );
  }

  if (loading) return <Loader text="Loading routes..." />;

  return (
    <section>
      <article className="card">
        <h2>Add Multiple Routes</h2>
        <p className="muted">Source and destination must match an active city in master data.</p>
        {cities.length === 0 && (
          <p className="error">
            No active cities available. Add cities in <Link to="/manager/cities">Manage Cities</Link> first.
          </p>
        )}
        <form onSubmit={createBulkRoutes}>
          {rows.map((row, index) => (
            <div key={`route-row-${index}`} className="card" style={{ boxShadow: "none", padding: 10 }}>
              <input
                placeholder="Source"
                list="city-master-options"
                value={row.source}
                onChange={(e) => updateRow(index, "source", e.target.value)}
              />
              <input
                placeholder="Destination"
                list="city-master-options"
                value={row.destination}
                onChange={(e) => updateRow(index, "destination", e.target.value)}
              />
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="Base Price"
                value={row.basePrice}
                onChange={(e) => updateRow(index, "basePrice", e.target.value)}
              />
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="Distance (km)"
                value={row.distanceKm}
                onChange={(e) => updateRow(index, "distanceKm", e.target.value)}
              />
              <button className="btn danger" type="button" onClick={() => removeRow(index)}>
                Remove
              </button>
            </div>
          ))}
          <datalist id="city-master-options">
            {cities.map((city) => (
              <option key={city.id} value={city.name} />
            ))}
          </datalist>

          <div className="inline-actions">
            <button className="btn" type="button" onClick={addRow}>
              Add Row
            </button>
            <button className="btn" type="submit" disabled={cities.length === 0}>
              Create Routes
            </button>
          </div>
        </form>
      </article>

      <article className="card" style={{ marginTop: 12 }}>
        <h2>Recent Routes</h2>
        <div className="grid">
          {routes.map((route) => (
            <article className="card" key={`${route.route_id}-${route.schedule_id || "no-schedule"}`}>
              <h3>
                {route.source} to {route.destination}
              </h3>
              <p>Base Price: INR {route.base_price}</p>
              <p>Distance: {route.distance_km} km</p>
              <p>Status: {route.is_active ? "Active" : "Inactive"}</p>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
