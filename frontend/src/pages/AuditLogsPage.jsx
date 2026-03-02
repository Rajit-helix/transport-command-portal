import { useEffect, useState } from "react";
import api from "../api/client";
import Loader from "../components/Loader";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get("/admin/audit-logs");
        setLogs(data.data || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Loader text="Loading audit logs..." />;

  return (
    <section className="card">
      <h2>Audit Logs</h2>
      {logs.map((log) => (
        <p key={log.id}>
          {log.action} - {log.entity_type} ({new Date(log.created_at).toLocaleString()})
        </p>
      ))}
    </section>
  );
}
