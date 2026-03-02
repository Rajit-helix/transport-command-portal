import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import api from "../api/client";
import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:4000");

export default function DriverDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const socket = useMemo(() => {
    const token = localStorage.getItem("accessToken");
    return io(socketUrl, { auth: { token } });
  }, []);

  async function loadAssignments() {
    setLoading(true);
    try {
      const { data } = await api.get("/driver-assignments", { params: { page: 1, limit: 50 } });
      setAssignments(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, assignmentStatus) {
    await toast.promise(api.put(`/driver-assignments/${id}`, { assignmentStatus }).then(loadAssignments), {
      loading: "Updating...",
      success: "Status updated",
      error: "Update failed"
    });
  }

  useEffect(() => {
    loadAssignments();

    if (user) {
      socket.emit("join:driver", user.id);
    }

    socket.on("driver:assignment:update", (updated) => {
      setAssignments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  if (loading) return <Loader text="Loading assignments..." />;

  return (
    <section>
      <h2>Driver Assignments</h2>
      <div className="grid">
        {assignments.map((item) => (
          <article className="card" key={item.id}>
            <h3>
              {item.source} to {item.destination}
            </h3>
            <p>Status: {item.assignment_status}</p>
            <div className="inline-actions">
              <button className="btn" onClick={() => updateStatus(item.id, "IN_PROGRESS")}>
                In Progress
              </button>
              <button className="btn" onClick={() => updateStatus(item.id, "ARRIVED")}>
                Arrived
              </button>
              <button className="btn" onClick={() => updateStatus(item.id, "COMPLETED")}>
                Completed
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
