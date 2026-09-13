import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getGeoMap } from "../api";

const INDIA_CENTER = [22.5937, 78.9629];

function FitIndia({ locations }) {
  const map = useMap();

  useEffect(() => {
    if (!locations.length) {
      map.setView(INDIA_CENTER, 5);
      return;
    }

    const bounds = locations.map((loc) => [loc.lat, loc.lon]);

    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 7,
    });
  }, [locations, map]);

  return null;
}

function activityLevel(visits) {
  if (visits >= 20) return "critical";
  if (visits >= 10) return "high";
  return "normal";
}

function markerRadius(visits) {
  return Math.max(7, Math.min(24, 7 + visits * 0.42));
}

export default function GeoMap() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getGeoMap()
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load geographic intelligence data.");
        setLoading(false);
      });
  }, []);

  const locations = data?.locations || [];

  const locationTypes = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(locations.map((x) => x.location_type).filter(Boolean))
      ),
    ],
    [locations]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return locations.filter((loc) => {
      const matchesType =
        typeFilter === "All" || loc.location_type === typeFilter;

      const matchesSearch =
        !q ||
        loc.name?.toLowerCase().includes(q) ||
        loc.address?.toLowerCase().includes(q);

      return matchesType && matchesSearch;
    });
  }, [locations, search, typeFilter]);

  const maxVisits = Math.max(...locations.map((x) => x.visits || 0), 1);

  if (loading) {
    return (
      <section className="geo-page">
        <div className="geo-loading">
          <div className="geo-loading-ring" />
          <strong>INITIALIZING GEO INTELLIGENCE</strong>
          <span>Loading synthetic location intelligence...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="geo-page">
        <div className="geo-loading">
          <strong>GEO INTELLIGENCE OFFLINE</strong>
          <span>{error}</span>
        </div>
      </section>
    );
  }

  return (
    <section className="geo-page">
      <header className="geo-header">
        <div>
          <div className="eyebrow">SIXENSE / GEOSPATIAL INTELLIGENCE</div>
          <h1>India Activity Map</h1>
          <p>
            Synthetic geographic activity across monitored locations in India.
          </p>
        </div>

        <div className="geo-live">
          <span />
          LIVE DATA
        </div>
      </header>

      <div className="geo-command-stats">
        <div className="geo-command-stat">
          <span>MONITORED LOCATIONS</span>
          <strong>{data?.total_locations || 0}</strong>
          <small>India-wide coverage</small>
        </div>

        <div className="geo-command-stat">
          <span>LOCATION EVENTS</span>
          <strong>{data?.total_visits || 0}</strong>
          <small>Recorded visits</small>
        </div>

        <div className="geo-command-stat">
          <span>ACTIVE HOTSPOTS</span>
          <strong>
            {locations.filter((x) => x.visits >= 20).length}
          </strong>
          <small>High activity locations</small>
        </div>

        <div className="geo-command-stat">
          <span>PEOPLE OBSERVED</span>
          <strong>
            {new Set(
              locations.flatMap((x) => x.unique_persons ? [x.unique_persons] : [])
            ).size || 0}
          </strong>
          <small>Location intelligence</small>
        </div>
      </div>

      <div className="geo-toolbar">
        <div className="geo-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search city, location or address..."
          />
        </div>

        <div className="geo-filters">
          {locationTypes.map((type) => (
            <button
              key={type}
              className={typeFilter === type ? "active" : ""}
              onClick={() => setTypeFilter(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="geo-main">
        <div className="geo-map-card">
          <div className="geo-map-overlay top-left">
          </div>

          <div className="geo-map-legend">
            <span><i className="normal" /> Normal</span>
            <span><i className="high" /> High</span>
            <span><i className="critical" /> Critical</span>
          </div>

          <MapContainer
            center={INDIA_CENTER}
            zoom={5}
            minZoom={4}
            maxZoom={12}
            scrollWheelZoom
            className="geo-map"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitIndia locations={filtered} />

            {filtered.map((loc) => {
              const level = activityLevel(loc.visits);

              return (
                <CircleMarker
                  key={loc.location_id}
                  center={[loc.lat, loc.lon]}
                  radius={markerRadius(loc.visits)}
                  pathOptions={{
                    color:
                      level === "critical"
                        ? "#ff4d5a"
                        : level === "high"
                        ? "#ffb020"
                        : "#39d6c0",
                    fillColor:
                      level === "critical"
                        ? "#ff4d5a"
                        : level === "high"
                        ? "#ffb020"
                        : "#39d6c0",
                    fillOpacity: 0.7,
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: () => setSelected(loc),
                  }}
                >
                  <Popup>
                    <div className="geo-popup">
                      <strong>{loc.name}</strong>
                      <span>{loc.location_type || "Unknown type"}</span>
                      <b>{loc.visits} location events</b>
                      <small>{loc.unique_persons} unique persons</small>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        <aside className="geo-inspector">
          {selected ? (
            <div className="geo-selected">
              <div className="geo-panel-label">LOCATION INTELLIGENCE</div>

              <div className="geo-selected-title">
                <div className={`geo-risk-dot ${activityLevel(selected.visits)}`} />
                <div>
                  <h2>{selected.name}</h2>
                  <span>{selected.location_type || "Unknown location type"}</span>
                </div>
              </div>

              <div className="geo-metrics">
                <div>
                  <span>VISITS</span>
                  <strong>{selected.visits}</strong>
                </div>
                <div>
                  <span>PERSONS</span>
                  <strong>{selected.unique_persons}</strong>
                </div>
              </div>

              <div className="geo-detail-block">
                <span>ACTIVITY LEVEL</span>
                <div className="geo-activity-row">
                  <div className="geo-activity-track">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          (selected.visits / maxVisits) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <strong>{selected.visits}</strong>
                </div>
              </div>

              <div className="geo-detail-block">
                <span>LAST OBSERVED</span>
                <strong>
                  {selected.latest_activity
                    ? new Date(selected.latest_activity).toLocaleString()
                    : "No activity"}
                </strong>
              </div>

              <div className="geo-detail-block">
                <span>LOCATION</span>
                <p>{selected.address || "Address unavailable"}</p>
              </div>

              <button
                className="geo-clear"
                onClick={() => setSelected(null)}
              >
                Close inspector
              </button>
            </div>
          ) : (
            <div className="geo-empty">
              <div className="geo-radar">
                <div />
              </div>
              <div className="geo-panel-label">LOCATION INSPECTOR</div>
              <h2>Select a location</h2>
              <p>
                Select any marker on the India map to inspect its geographic
                activity intelligence.
              </p>
            </div>
          )}

          <div className="geo-ranking">
            <div className="geo-ranking-head">
              <div>
                <div className="geo-panel-label">HOTSPOT RANKING</div>
                <strong>Highest activity</strong>
              </div>
              <span>TOP 8</span>
            </div>

            {locations.slice(0, 5).map((loc, index) => (
              <button
                key={loc.location_id}
                className={`geo-rank ${selected?.location_id === loc.location_id ? "selected" : ""}`}
                onClick={() => setSelected(loc)}
              >
                <span className="geo-rank-index">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="geo-rank-content">
                  <strong>{loc.name}</strong>
                  <small>
                    {loc.unique_persons} persons · {loc.location_type}
                  </small>
                  <i>
                    <em
                      style={{
                        width: `${Math.min(
                          100,
                          (loc.visits / maxVisits) * 100
                        )}%`,
                      }}
                    />
                  </i>
                </span>

                <b>{loc.visits}</b>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <div className="geo-footer">
        <span>● SYNTHETIC DATASET</span>
        <span>● INDIA GEO COVERAGE</span>
        <span>● {filtered.length} VISIBLE LOCATIONS</span>
      </div>
    </section>
  );
}
