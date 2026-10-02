import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { LoginPage } from "../features/auth/LoginPage";
import { AdminLayout } from "../layouts/AdminLayout";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { MonitorPage } from "../features/monitor/MonitorPage";
import { IncidentListPage } from "../features/incidents/IncidentListPage";
import { IncidentDetailPage } from "../features/incidents/IncidentDetailPage";
import { CamerasPage } from "../features/cameras/CamerasPage";
import { UsersPage } from "../features/users/UsersPage";
import { ReportsPage } from "../features/reports/ReportsPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { LoadingSpinner } from "../components/ui";
export function App() {
  const { user, ready } = useAuthStore();
  if (!ready) return <LoadingSpinner />;
  if (!user || user.role !== "ADMIN") return <LoginPage />;
  return (
    <HashRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="monitor" element={<MonitorPage />} />
          <Route path="incidents" element={<IncidentListPage />} />
          <Route path="incidents/:id" element={<IncidentDetailPage />} />
          <Route path="cameras" element={<CamerasPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
