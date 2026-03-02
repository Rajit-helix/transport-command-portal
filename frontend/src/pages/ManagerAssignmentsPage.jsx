import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/client";
import Loader from "../components/Loader";

const STATUS_OPTIONS = ["ASSIGNED", "IN_PROGRESS", "ARRIVED", "COMPLETED"];

export default function ManagerAssignmentsPage() {
  const [drivers, setDrivers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [recentRoutes, setRecentRoutes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0 });
  const [loading, setLoading] = useState(false);
  const [driverId, setDriverId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [bulkDriverId, setBulkDriverId] = useState("");
  const [bulkSelectedKeys, setBulkSelectedKeys] = useState([]);
  const [filterDriverId, setFilterDriverId] = useState("");
  const [filterScheduleId, setFilterScheduleId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const bulkOptions = (() => {
    const merged = [];
    const seenScheduleIds = new Set();
    const seenRouteIds = new Set();

    for (const schedule of schedules) {
      if (!schedule.id || seenScheduleIds.has(schedule.id)) continue;
      seenScheduleIds.add(schedule.id);
      merged.push({
        key: `schedule:${schedule.id}`,
        scheduleId: schedule.id,
        label: `${schedule.source} to ${schedule.destination} | ${new Date(schedule.departure_time).toLocaleString()}`,
        selectable: true,
        needsSchedule: false
      });
    }

    for (const route of recentRoutes) {
      if (!route.route_id || seenRouteIds.has(route.route_id)) continue;
      seenRouteIds.add(route.route_id);

      if (route.schedule_id && !seenScheduleIds.has(route.schedule_id)) {
        seenScheduleIds.add(route.schedule_id);
        merged.push({
          key: `schedule:${route.schedule_id}`,
          scheduleId: route.schedule_id,
          label: `${route.source} to ${route.destination} | ${new Date(route.departure_time).toLocaleString()}`,
          selectable: true,
          needsSchedule: false
        });
      } else if (!route.schedule_id) {
        merged.push({
          key: `route:${route.route_id}`,
          scheduleId: null,
          label: `${route.source} to ${route.destination} | No schedule created yet`,
          selectable: false,
          needsSchedule: true
        });
      }
    }

    return merged;
  })();

  function toggleBulkSchedule(option) {
    if (!option.selectable) return;

    const optionKey = option.key;
    setBulkSelectedKeys((prev) => {
      if (prev.includes(optionKey)) {
        return prev.filter((id) => id !== optionKey);
      }
      return [...prev, optionKey];
    });
  }

  function selectAllVisibleSchedules() {
    setBulkSelectedKeys(bulkOptions.filter((o) => o.selectable).map((o) => o.key));
  }

  function clearBulkSchedules() {
    setBulkSelectedKeys([]);
  }

  async function loadOptions() {
    const { data } = await api.get("/driver-assignments/options");
    setDrivers(data.data?.drivers || []);
    setSchedules(data.data?.schedules || []);
  }

  async function loadRecentRoutes() {
    const { data } = await api.get("/routes", {
      params: { page: 1, limit: 30, includeDeleted: false }
    });

    const unique = [];
    const seen = new Set();
    for (const row of data.data || []) {
      if (!row.route_id || seen.has(row.route_id)) continue;
      seen.add(row.route_id);
      unique.push(row);
      if (unique.length >= 8) break;
    }

    setRecentRoutes(unique);
  }

  async function loadAssignments(page = 1, filters = {}) {
    const effectiveFilters = {
      driverId: filterDriverId,
      scheduleId: filterScheduleId,
      assignmentStatus: filterStatus,
      ...filters
    };

    const { data } = await api.get("/driver-assignments", {
      params: {
        page,
        limit: pagination.limit,
        driverId: effectiveFilters.driverId || undefined,
        scheduleId: effectiveFilters.scheduleId || undefined,
        assignmentStatus: effectiveFilters.assignmentStatus || undefined
      }
    });
    setAssignments(data.data || []);
    setPagination(data.pagination || { page: 1, limit: pagination.limit, total: 0 });
  }

  async function bootstrap(page = 1) {
    setLoading(true);
    try {
      await Promise.all([loadOptions(), loadAssignments(page), loadRecentRoutes()]);
    } finally {
      setLoading(false);
    }
  }

  async function createAssignment(event) {
    event.preventDefault();
    if (!driverId || !scheduleId) {
      toast.error("Select a driver and schedule");
      return;
    }

    await toast.promise(
      api.post("/driver-assignments", { driverId, scheduleId }).then(async () => {
        setDriverId("");
        setScheduleId("");
        await loadAssignments(1);
      }),
      {
        loading: "Creating assignment...",
        success: "Assignment created",
        error: "Failed to create assignment"
      }
    );
  }

  async function updateStatus(id, assignmentStatus) {
    await toast.promise(
      api.put(`/driver-assignments/${id}`, { assignmentStatus }).then(() => loadAssignments(pagination.page)),
      {
        loading: "Updating status...",
        success: "Status updated",
        error: "Failed to update status"
      }
    );
  }

  async function createBulkAssignments(event) {
    event.preventDefault();
    if (!bulkDriverId || bulkSelectedKeys.length === 0) {
      toast.error("Select a driver and at least one item");
      return;
    }

    const selected = bulkOptions.filter((option) => bulkSelectedKeys.includes(option.key));
    const scheduleIds = [...new Set(selected.map((option) => option.scheduleId).filter(Boolean))];
    const pendingRoutes = selected.filter((option) => option.needsSchedule).length;

    if (scheduleIds.length === 0) {
      toast.error("Selected items have no schedules yet. Create schedules first.");
      return;
    }

    await toast.promise(
      api
        .post("/driver-assignments/bulk", {
          driverId: bulkDriverId,
          scheduleIds
        })
        .then(async ({ data }) => {
          const created = data?.data?.createdCount || 0;
          const conflicts = data?.data?.conflictCount || 0;
          toast.success(`Bulk assignment done. Created: ${created}, Conflicts: ${conflicts}`);
          if (pendingRoutes > 0) {
            toast(`Skipped ${pendingRoutes} route(s) without schedules`);
          }
          setBulkSelectedKeys([]);
          await loadAssignments(1);
        }),
      {
        loading: "Creating bulk assignments...",
        success: "Bulk assignment completed",
        error: "Bulk assignment failed"
      }
    );
  }

  async function deleteAssignment(id) {
    const ok = window.confirm("Delete this assignment?");
    if (!ok) return;

    await toast.promise(api.delete(`/driver-assignments/${id}`).then(() => loadAssignments(pagination.page)), {
      loading: "Deleting assignment...",
      success: "Assignment deleted",
      error: "Failed to delete assignment"
    });
  }

  useEffect(() => {
    bootstrap();
  }, []);

  async function applyFilters(event) {
    event.preventDefault();
    await loadAssignments(1);
  }

  function clearFilters() {
    setFilterDriverId("");
    setFilterScheduleId("");
    setFilterStatus("");
    loadAssignments(1, { driverId: "", scheduleId: "", assignmentStatus: "" });
  }

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / (pagination.limit || 1)));

  if (loading) return <Loader text="Loading assignments..." />;

  return (
    <section>
      <article className="card">
        <h2>Assign Driver</h2>
        <form onSubmit={createAssignment}>
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">Select Driver</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.full_name} ({driver.email})
              </option>
            ))}
          </select>

          <select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
            <option value="">Select Schedule</option>
            {schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.source} to {schedule.destination} |{" "}
                {new Date(schedule.departure_time).toLocaleString()}
              </option>
            ))}
          </select>

          <button className="btn" type="submit">
            Create Assignment
          </button>
        </form>
      </article>

      <article className="card" style={{ marginTop: 12 }}>
        <h2>Bulk Assign Driver</h2>
        <form onSubmit={createBulkAssignments}>
          <select value={bulkDriverId} onChange={(e) => setBulkDriverId(e.target.value)}>
            <option value="">Select Driver</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.full_name} ({driver.email})
              </option>
            ))}
          </select>

          <div className="inline-actions">
            <button className="btn" type="button" onClick={selectAllVisibleSchedules}>
              Select All
            </button>
            <button className="btn" type="button" onClick={clearBulkSchedules}>
              Clear
            </button>
          </div>
          <div
            className="card"
            style={{
              maxHeight: 260,
              overflowY: "auto",
              border: "1px solid #c8d5eb",
              boxShadow: "none",
              padding: 10
            }}
          >
            {bulkOptions.map((option) => {
              const checked = bulkSelectedKeys.includes(option.key);
              return (
                <label
                  key={option.key}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    marginBottom: 8,
                    cursor: "pointer"
                  }}
                >
                  <input
                    type="checkbox"
                    disabled={!option.selectable}
                    checked={checked}
                    onChange={() => toggleBulkSchedule(option)}
                  />
                  <span>
                    {option.label}
                    {option.needsSchedule ? " (Needs schedule)" : ""}
                  </span>
                </label>
              );
            })}
            {bulkOptions.length === 0 && <p className="muted">No schedules available.</p>}
          </div>
          <p className="muted">Selected items: {bulkSelectedKeys.length}</p>
          <button className="btn" type="submit">
            Create Bulk Assignments
          </button>
        </form>
      </article>

      <article className="card" style={{ marginTop: 12 }}>
        <h2>Filter Assignments</h2>
        <form onSubmit={applyFilters}>
          <select value={filterDriverId} onChange={(e) => setFilterDriverId(e.target.value)}>
            <option value="">All Drivers</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.full_name}
              </option>
            ))}
          </select>
          <select value={filterScheduleId} onChange={(e) => setFilterScheduleId(e.target.value)}>
            <option value="">All Schedules</option>
            {schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.source} to {schedule.destination}
              </option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <div className="inline-actions">
            <button className="btn" type="submit">
              Apply
            </button>
            <button className="btn" type="button" onClick={clearFilters}>
              Reset
            </button>
          </div>
        </form>
      </article>

      <div className="grid" style={{ marginTop: 12 }}>
        {assignments.map((assignment) => (
          <article className="card" key={assignment.id}>
            <h3>{assignment.driver_name}</h3>
            <p>
              {assignment.source} to {assignment.destination}
            </p>
            <p>Departure: {new Date(assignment.departure_time).toLocaleString()}</p>
            <div className="inline-actions">
              <select
                value={assignment.assignment_status}
                onChange={(e) => updateStatus(assignment.id, e.target.value)}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button className="btn danger" onClick={() => deleteAssignment(assignment.id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
      {assignments.length === 0 && (
        <article className="card" style={{ marginTop: 12 }}>
          <p className="muted">No assignments found for current filters.</p>
        </article>
      )}
      <article className="card" style={{ marginTop: 12 }}>
        <div className="inline-actions" style={{ justifyContent: "space-between" }}>
          <p style={{ margin: 0 }}>
            Page {pagination.page || 1} of {totalPages} ({pagination.total || 0} total)
          </p>
          <div className="inline-actions">
            <button
              className="btn"
              disabled={(pagination.page || 1) <= 1}
              onClick={() => loadAssignments((pagination.page || 1) - 1)}
            >
              Previous
            </button>
            <button
              className="btn"
              disabled={(pagination.page || 1) >= totalPages}
              onClick={() => loadAssignments((pagination.page || 1) + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}
