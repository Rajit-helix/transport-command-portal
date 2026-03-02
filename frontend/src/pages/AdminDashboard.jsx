import { useEffect, useState } from "react";
import api from "../api/client";
import Loader from "../components/Loader";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get("/admin/users");
        setUsers(data.data || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Loader text="Loading users..." />;

  return (
    <section className="card">
      <h2>Admin Users</h2>
      {users.map((user) => (
        <p key={user.id}>
          {user.email} ({user.role})
        </p>
      ))}
    </section>
  );
}
