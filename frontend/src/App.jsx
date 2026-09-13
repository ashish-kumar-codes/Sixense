import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import NetworkGraph from "./components/NetworkGraph";
import Inspector from "./components/Inspector";
import SearchPanel from "./components/SearchPanel";
import AlertsView from "./components/AlertsView";
import PathFinderView from "./components/PathFinderView";
import EvaluationView from "./components/EvaluationView";
import DashboardView from "./components/DashboardView";
import CasesView from "./components/CasesView";
import ResolutionView from "./components/ResolutionView";
import ReportsView from "./components/ReportsView";
import AnalyticsView from "./components/AnalyticsView";
import UploadView from "./components/UploadView";
import GeoMapView from "./components/GeoMapView";
import AIQueryView from "./components/AIQueryView";
import api from "./api";

export default function App() {
  const [backend, setBackend] = useState(null);
  const [activeModule, setActiveModule] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [topScores, setTopScores] = useState([]);
  const [showAnomalies, setShowAnomalies] = useState(true);
  const [showPredicted, setShowPredicted] = useState(false);

  useEffect(() => {
    api.health().then((d) => setBackend(d.backend)).catch(() => {});
    api.scores(30).then(setTopScores).catch(() => {});
  }, []);

  function selectAndGo(id) {
    setSelectedId(id);
    setActiveModule("network");
  }

  const isNetworkModule = activeModule === "network";

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <Sidebar active={activeModule} onChange={setActiveModule} backend={backend} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar - only shown on network module or global modules */}
        {isNetworkModule && (
          <TopBar
            backend={backend}
            showAnomalies={showAnomalies}
            showPredicted={showPredicted}
            onToggleAnomalies={() => setShowAnomalies((v) => !v)}
            onTogglePredicted={() => setShowPredicted((v) => !v)}
          />
        )}

        {/* Module content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {activeModule === "dashboard" && (
            <DashboardView
              topScores={topScores}
              onSelect={selectAndGo}
            />
          )}

          {activeModule === "network" && (
            <>
              <SearchPanel selectedId={selectedId} onSelect={setSelectedId} topScores={topScores} />
              <NetworkGraph
                selectedId={selectedId}
                onSelect={setSelectedId}
                showAnomalies={showAnomalies}
                showPredicted={showPredicted}
              />
              <Inspector nodeId={selectedId} onNavigate={setSelectedId} />
            </>
          )}

          {activeModule === "cases" && <CasesView onSelectEntity={selectAndGo} />}
          {activeModule === "explorer" && (
            <>
              <SearchPanel selectedId={selectedId} onSelect={setSelectedId} topScores={topScores} />
              <PathFinderView onSelect={selectAndGo} />
              <Inspector nodeId={selectedId} onNavigate={setSelectedId} />
            </>
          )}
          {activeModule === "resolution" && <ResolutionView />}
          {activeModule === "analytics" && <AnalyticsView />}
          {activeModule === "alerts" && <AlertsView onSelect={selectAndGo} />}
          {activeModule === "reports" && <ReportsView />}
          {activeModule === "upload" && <UploadView />}
          {activeModule === "aiquery" && <AIQueryView onSelect={selectAndGo} />}
          {activeModule === "geomap" && <GeoMapView onSelect={selectAndGo} />}
          {activeModule === "evaluation" && <EvaluationView />}
        </div>
      </div>
    </div>
  );
}
