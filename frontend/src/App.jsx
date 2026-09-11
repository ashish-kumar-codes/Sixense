import { useEffect, useState } from "react";
import TopBar from "./components/TopBar";
import TabBar from "./components/TabBar";
import SearchPanel from "./components/SearchPanel";
import NetworkGraph from "./components/NetworkGraph";
import Inspector from "./components/Inspector";
import SignalsView from "./components/SignalsView";
import AlertsView from "./components/AlertsView";
import PathFinderView from "./components/PathFinderView";
import EvaluationView from "./components/EvaluationView";
import api from "./api";

export default function App() {
  const [backend, setBackend] = useState(null);
  const [tab, setTab] = useState("network");
  const [selectedId, setSelectedId] = useState(null);
  const [topScores, setTopScores] = useState([]);
  const [showAnomalies, setShowAnomalies] = useState(true);
  const [showPredicted, setShowPredicted] = useState(false);

  useEffect(() => {
    api.health().then((d) => setBackend(d.backend));
    api.scores(30).then(setTopScores);
  }, []);

  function selectAndShowNetwork(id) {
    setSelectedId(id);
    setTab("network");
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TopBar
        backend={backend}
        showAnomalies={showAnomalies}
        showPredicted={showPredicted}
        onToggleAnomalies={() => setShowAnomalies((v) => !v)}
        onTogglePredicted={() => setShowPredicted((v) => !v)}
      />
      <div className="flex flex-1 min-h-0">
        <SearchPanel selectedId={selectedId} onSelect={setSelectedId} topScores={topScores} />
        <div className="flex-1 flex flex-col min-w-0">
          <TabBar active={tab} onChange={setTab} />
          {tab === "network" && (
            <NetworkGraph
              selectedId={selectedId}
              onSelect={setSelectedId}
              showAnomalies={showAnomalies}
              showPredicted={showPredicted}
            />
          )}
          {tab === "signals" && <SignalsView onSelect={selectAndShowNetwork} />}
          {tab === "alerts" && <AlertsView onSelect={selectAndShowNetwork} />}
          {tab === "path" && <PathFinderView onSelect={selectAndShowNetwork} />}
          {tab === "evaluation" && <EvaluationView />}
        </div>
        <Inspector nodeId={selectedId} onNavigate={setSelectedId} />
      </div>
    </div>
  );
}
