import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "@/pages/index";
import DashboardPage from "@/pages/dashboard";
import StandingsPage from "@/pages/standings";
import HistoryPage from "@/pages/history";
import RacePage from "@/pages/race";
import DraftPage from "@/pages/draft";
import AdminPage from "@/pages/admin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/standings" element={<StandingsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/race" element={<RacePage />} />
        <Route path="/draft" element={<DraftPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
