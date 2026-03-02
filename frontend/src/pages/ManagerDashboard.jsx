import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip
} from "chart.js";
import api from "../api/client";
import Loader from "../components/Loader";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function ManagerDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get("/admin/analytics");
        setMetrics(data.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Loader text="Loading analytics..." />;
  if (!metrics) return null;

  const chartData = {
    labels: ["Users", "Bookings", "Routes", "Schedules"],
    datasets: [
      {
        label: "System Metrics",
        data: [metrics.users, metrics.bookings, metrics.routes, metrics.schedules],
        backgroundColor: ["#1f77b4", "#2ca02c", "#ff7f0e", "#d62728"]
      }
    ]
  };

  return (
    <section className="card">
      <h2>Manager Analytics</h2>
      <Bar data={chartData} />
    </section>
  );
}
