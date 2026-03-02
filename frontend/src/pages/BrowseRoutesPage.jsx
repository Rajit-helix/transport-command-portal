import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/client";
import Loader from "../components/Loader";

export default function BrowseRoutesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadRoutes() {
    setLoading(true);
    try {
      const { data } = await api.get("/routes", { params: { page: 1, limit: 20, isActive: true } });
      setItems(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function book(scheduleId) {
    await toast.promise(api.post("/bookings", { scheduleId, seatCount: 1 }).then(loadRoutes), {
      loading: "Creating booking...",
      success: "Booking created",
      error: "Booking failed"
    });
  }

  useEffect(() => {
    loadRoutes();
  }, []);

  if (loading) return <Loader text="Loading routes..." />;

  return (
    <section>
      <h2>Available Routes</h2>
      <div className="grid">
        {items.map((route) => (
          <article className="card" key={`${route.route_id}-${route.schedule_id || "none"}`}>
            <h3>
              {route.source} to {route.destination}
            </h3>
            <p>Base Price: INR {route.base_price}</p>
            <p>Distance: {route.distance_km} km</p>
            <p>Departure: {route.departure_time ? new Date(route.departure_time).toLocaleString() : "N/A"}</p>
            <button className="btn" disabled={!route.schedule_id} onClick={() => book(route.schedule_id)}>
              Quick Book
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
