import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const COLORS = {
  panel: "#171b21",
  panelAlt: "#12151a",
  border: "rgba(255,255,255,0.07)",
  amber: "#f2a93b",
  green: "#4fae7c",
  steel: "#6c86a1",
  text: "#eef1f4",
  textMuted: "#8792a1",
  textFaint: "#4d5561",
};

// Default center: Ghaziabad, UP — used until officer locations load in.
const DEFAULT_CENTER = [28.6692, 77.4538];

const officerIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 16px; height: 16px; border-radius: 50%;
    background: ${COLORS.amber}; border: 2px solid #12151a;
    box-shadow: 0 0 0 3px rgba(242,169,59,0.25);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function timeAgo(dateStr) {
  if (!dateStr) return "never";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function LiveMap() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const pollRef = useRef(null);

  const fetchOfficers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/officers");
      setOfficers(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficers();
    // Poll for updated positions every 5s so the map reflects live movement.
    pollRef.current = setInterval(fetchOfficers, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const simulateMovement = async () => {
    setSimulating(true);
    try {
      const res = await axios.post("http://localhost:5000/officers/simulate-locations");
      setOfficers(res.data.officers);
    } catch (err) {
      console.log(err);
    } finally {
      setSimulating(false);
    }
  };

  const located = officers.filter(
    (o) => o.location?.lat != null && o.location?.lng != null
  );

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Officer Locations</h1>
        <p style={styles.pageSub}>Live position feed — all officers currently on record</p>
      </div>

      <div style={styles.actionRow}>
        <button
          style={styles.simButton}
          onClick={simulateMovement}
          disabled={simulating}
        >
          {simulating ? "Updating…" : "⟲ Refresh Live Positions"}
        </button>
        <span style={styles.liveTag}>
          <span style={styles.liveDot} /> {located.length} of {officers.length} officers reporting location
        </span>
      </div>

      <div style={styles.mapWrap}>
        {!loading && (
          <MapContainer
            center={
              located.length
                ? [located[0].location.lat, located[0].location.lng]
                : DEFAULT_CENTER
            }
            zoom={13}
            style={{ height: "520px", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {located.map((officer) => (
              <Marker
                key={officer._id}
                position={[officer.location.lat, officer.location.lng]}
                icon={officerIcon}
              >
                <Popup>
                  <strong>{officer.full_name}</strong>
                  <br />
                  {officer.role}
                  <br />
                  Updated {timeAgo(officer.location_updated_at)}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {!loading && located.length === 0 && (
        <div style={styles.emptyNote}>
          No officers have reported a location yet. Click "Refresh Live Positions" to
          pull in the latest reported coordinates.
        </div>
      )}
    </div>
  );
}

const styles = {
  pageHeader: { marginBottom: "22px" },
  pageTitle: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: "26px",
    fontWeight: 600,
    margin: 0,
    letterSpacing: "0.5px",
    color: COLORS.text,
  },
  pageSub: { color: COLORS.textMuted, fontSize: "13.5px", marginTop: "6px" },
  actionRow: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  simButton: {
    background: COLORS.amber,
    color: "#12151a",
    border: "none",
    padding: "11px 20px",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "13px",
    letterSpacing: "0.3px",
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  liveTag: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "11.5px",
    color: COLORS.textMuted,
    letterSpacing: "0.5px",
  },
  liveDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: COLORS.green,
    display: "inline-block",
  },
  mapWrap: {
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "10px",
    overflow: "hidden",
  },
  emptyNote: {
    marginTop: "16px",
    color: COLORS.textFaint,
    fontSize: "13px",
    textAlign: "center",
  },
};

export default LiveMap;
