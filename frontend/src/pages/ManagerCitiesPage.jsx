import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/client";
import Loader from "../components/Loader";

const defaultForm = {
  name: "",
  state: "",
  country: "India"
};

export default function ManagerCitiesPage() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [editingCityId, setEditingCityId] = useState(null);
  const [editForm, setEditForm] = useState(defaultForm);

  const filteredCities = useMemo(() => {
    const key = query.trim().toLowerCase();
    if (!key) return cities;
    return cities.filter((city) => {
      const state = city.state || "";
      const country = city.country || "";
      return (
        city.name.toLowerCase().includes(key) ||
        state.toLowerCase().includes(key) ||
        country.toLowerCase().includes(key)
      );
    });
  }, [cities, query]);

  async function loadCities() {
    setLoading(true);
    try {
      const { data } = await api.get("/cities", { params: { limit: 500, includeInactive: true } });
      setCities(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCities();
  }, []);

  function setValue(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function beginEdit(city) {
    setEditingCityId(city.id);
    setEditForm({
      name: city.name || "",
      state: city.state || "",
      country: city.country || "India"
    });
  }

  function cancelEdit() {
    setEditingCityId(null);
    setEditForm(defaultForm);
  }

  async function createCity(event) {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      state: form.state.trim() || undefined,
      country: form.country.trim() || undefined
    };

    if (!payload.name) {
      toast.error("City name is required");
      return;
    }

    setSaving(true);
    await toast.promise(
      api.post("/cities", payload).then(async () => {
        setForm(defaultForm);
        await loadCities();
      }),
      {
        loading: "Adding city...",
        success: "City added",
        error: (error) => error?.response?.data?.message || "Unable to add city"
      }
    );
    setSaving(false);
  }

  async function toggleActive(city) {
    const nextStatus = !city.is_active;
    await toast.promise(
      api.put(`/cities/${city.id}`, { isActive: nextStatus }).then(loadCities),
      {
        loading: "Updating city...",
        success: nextStatus ? "City activated" : "City deactivated",
        error: (error) => error?.response?.data?.message || "Unable to update city"
      }
    );
  }

  async function saveEdit(cityId) {
    const payload = {
      name: editForm.name.trim(),
      state: editForm.state.trim(),
      country: editForm.country.trim() || "India"
    };

    if (!payload.name) {
      toast.error("City name is required");
      return;
    }

    setUpdating(true);
    await toast.promise(
      api.put(`/cities/${cityId}`, payload).then(async () => {
        cancelEdit();
        await loadCities();
      }),
      {
        loading: "Saving city...",
        success: "City updated",
        error: (error) => error?.response?.data?.message || "Unable to update city"
      }
    );
    setUpdating(false);
  }

  if (loading) return <Loader text="Loading cities..." />;

  return (
    <section>
      <article className="card">
        <h2>Manage Cities</h2>
        <p className="muted">City master controls valid source and destination values for routes.</p>
        <form onSubmit={createCity}>
          <input
            placeholder="City name"
            value={form.name}
            onChange={(e) => setValue("name", e.target.value)}
          />
          <input placeholder="State (optional)" value={form.state} onChange={(e) => setValue("state", e.target.value)} />
          <input
            placeholder="Country"
            value={form.country}
            onChange={(e) => setValue("country", e.target.value)}
          />
          <div className="inline-actions">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add City"}
            </button>
            <button className="btn" type="button" onClick={loadCities}>
              Refresh
            </button>
          </div>
        </form>
      </article>

      <article className="card" style={{ marginTop: 12 }}>
        <div className="inline-actions" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>City Directory</h2>
          <input
            style={{ width: 260 }}
            placeholder="Search name/state/country"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {filteredCities.length === 0 && <p className="muted">No cities found.</p>}
        <div className="grid">
          {filteredCities.map((city) => (
            <article className="card" key={city.id}>
              {editingCityId === city.id ? (
                <>
                  <input
                    placeholder="City name"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <input
                    placeholder="State (optional)"
                    value={editForm.state}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, state: e.target.value }))}
                  />
                  <input
                    placeholder="Country"
                    value={editForm.country}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, country: e.target.value }))}
                  />
                </>
              ) : (
                <>
                  <h3>{city.name}</h3>
                  <p>State: {city.state || "N/A"}</p>
                  <p>Country: {city.country || "N/A"}</p>
                </>
              )}
              <p>Status: {city.is_active ? "Active" : "Inactive"}</p>
              {editingCityId === city.id ? (
                <div className="inline-actions">
                  <button className="btn" onClick={() => saveEdit(city.id)} disabled={updating}>
                    {updating ? "Saving..." : "Save"}
                  </button>
                  <button className="btn danger" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="inline-actions">
                  <button className="btn" onClick={() => beginEdit(city)}>
                    Edit
                  </button>
                  <button className={city.is_active ? "btn danger" : "btn"} onClick={() => toggleActive(city)}>
                    {city.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
