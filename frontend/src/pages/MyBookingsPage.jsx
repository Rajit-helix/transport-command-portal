import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import api from "../api/client";
import Loader from "../components/Loader";

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:4000");

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const socket = useMemo(() => {
    const token = localStorage.getItem("accessToken");
    return io(socketUrl, { auth: { token } });
  }, []);

  async function loadBookings() {
    setLoading(true);
    try {
      const { data } = await api.get("/bookings", { params: { page: 1, limit: 50 } });
      setBookings(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking(id) {
    await toast.promise(api.patch(`/bookings/${id}/cancel`).then(loadBookings), {
      loading: "Cancelling booking...",
      success: "Booking cancelled",
      error: "Cancel failed"
    });
  }

  useEffect(() => {
    loadBookings();

    socket.on("booking:status", (updated) => {
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      toast.success(`Booking ${updated.id.slice(0, 6)} status: ${updated.status}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) return <Loader text="Loading bookings..." />;

  return (
    <section>
      <h2>My Bookings</h2>
      <div className="grid">
        {bookings.map((booking) => (
          <article className="card" key={booking.id}>
            <h3>
              {booking.source && booking.destination
                ? `${booking.source} to ${booking.destination}`
                : booking.id}
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              Booking ID: {booking.id}
            </p>
            <p>Status: {booking.status}</p>
            <p>Seats: {booking.seat_count}</p>
            <p>Total: INR {booking.total_price}</p>
            {booking.status !== "CANCELLED" && (
              <button className="btn danger" onClick={() => cancelBooking(booking.id)}>
                Cancel
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
