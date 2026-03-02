import Sidebar from "../components/Sidebar";

export default function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <section className="content">{children}</section>
    </div>
  );
}
