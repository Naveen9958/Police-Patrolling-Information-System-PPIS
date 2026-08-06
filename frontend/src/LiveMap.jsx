import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
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

function hashString(value = "") {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function pointFromSeed(seed, base = DEFAULT_CENTER, spread = 0.035) {
  const hash = hashString(seed);
  const latOffset = ((hash % 1000) / 999 - 0.5) * spread;
  const lngOffset = (((Math.floor(hash / 1000) % 1000) / 999) - 0.5) * spread;

  return [base[0] + latOffset, base[1] + lngOffset];
}

function checkpointPoint(checkpoint) {
  if (checkpoint.coordinates?.lat != null && checkpoint.coordinates?.lng != null) {
    return [checkpoint.coordinates.lat, checkpoint.coordinates.lng];
  }

  return pointFromSeed(`checkpoint:${checkpoint.location || "unknown"}`);
}

const checkpointIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 14px; height: 14px; transform: rotate(45deg);
    background: ${COLORS.steel}; border: 2px solid #12151a;
    box-shadow: 0 0 0 3px rgba(108,134,161,0.22);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const assignedCheckpointIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 14px; height: 14px; transform: rotate(45deg);
    background: ${COLORS.green}; border: 2px solid #12151a;
    box-shadow: 0 0 0 3px rgba(79,174,124,0.22);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
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

function LiveMap({ onNotify }) {
  const [officers, setOfficers] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const pollRef = useRef(null);

  const syncMap = async ({ simulate = false } = {}) => {
    if (simulate) {
      setSimulating(true);
    }

    try {
      const [officersRes, checkpointsRes] = await Promise.all([
        simulate
          ? axios.post("http://localhost:5000/officers/simulate-locations")
          : axios.get("http://localhost:5000/officers"),
        axios.get("http://localhost:5000/checkpoints"),
      ]);

      setOfficers(simulate ? officersRes.data.officers : officersRes.data);
      setCheckpoints(checkpointsRes.data);
    } catch (err) {
      console.log(err);
    } finally {
      if (simulate) {
        setSimulating(false);
      }

      setLoading(false);
    }
  };

  useEffect(() => {
    syncMap();
    // Poll and advance positions so assigned officers visibly move toward checkpoints.
    pollRef.current = setInterval(() => syncMap({ simulate: true }), 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  const simulateMovement = async () => {
    await syncMap({ simulate: true });
  };

  const located = officers.filter((o) => o.location?.lat != null && o.location?.lng != null);
  const checkpointMarkers = checkpoints.filter((cp) => cp.location);
  const checkpointsByOfficer = new Map();

  checkpoints.forEach((checkpoint) => {
    if (checkpoint.assigned_officer?.id && !checkpointsByOfficer.has(checkpoint.assigned_officer.id)) {
      checkpointsByOfficer.set(checkpoint.assigned_officer.id, checkpoint);
    }
  });

  const mapCenter = located.length
    ? [located[0].location.lat, located[0].location.lng]
    : checkpointMarkers.length
      ? checkpointPoint(checkpointMarkers[0])
      : DEFAULT_CENTER;

  const assignedCount = checkpoints.filter((checkpoint) => checkpoint.assigned_officer).length;

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Officer Locations</h1>
        <p style={styles.pageSub}>
          Live position feed — officers move toward their assigned checkpoints in the map below
        </p>
      </div>

      <div style={styles.actionRow}>
        <button
          style={styles.simButton}
          onClick={simulateMovement}
          disabled={simulating}
        >
          {simulating ? "Updating…" : "⟲ Advance Patrol Movement"}
        </button>
        <span style={styles.liveTag}>
          <span style={styles.liveDot} /> {located.length} of {officers.length} officers reporting location
          <span style={{ marginLeft: "10px", color: COLORS.textFaint }}>
            {assignedCount} checkpoints assigned
          </span>
        </span>
      </div>

      <div style={styles.mapWrap}>
        {!loading && (
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: "520px", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {checkpointMarkers.map((checkpoint) => {
              const position = checkpointPoint(checkpoint);
              const assigned = Boolean(checkpoint.assigned_officer);

              return (
                <>
                  <Marker
                    key={checkpoint.id}
                    position={position}
                    icon={assigned ? assignedCheckpointIcon : checkpointIcon}
                  >
                    <Popup>
                      <strong>{checkpoint.checkpoint_name}</strong>
                      <br />
                      {checkpoint.location}
                      <br />
                      {assigned
                        ? `Assigned to ${checkpoint.assigned_officer.full_name}`
                        : "Unassigned"}
                    </Popup>
                  </Marker>

                  {assigned && checkpoint.assigned_officer?.id && (
                    (() => {
                      const officer = located.find((item) => item.id === checkpoint.assigned_officer.id);

                      if (!officer) {
                        return null;
                      }

                      return (
                        <Polyline
                          key={`${checkpoint.id}-route`}
                          positions={[
                            [officer.location.lat, officer.location.lng],
                            position,
                          ]}
                          pathOptions={{
                            color: COLORS.green,
                            weight: 2,
                            opacity: 0.7,
                            dashArray: "6 8",
                          }}
                        />
                      );
                    })()
                  )}
                </>
              );
            })}
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
                  {checkpointsByOfficer.get(officer.id) && (
                    <>
                      <br />
                      Heading to {checkpointsByOfficer.get(officer.id).checkpoint_name}
                    </>
                  )}
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
