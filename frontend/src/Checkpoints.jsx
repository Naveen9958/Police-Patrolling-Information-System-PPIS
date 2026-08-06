import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";

const COLORS = {
  panel: "#171b21",
  panelAlt: "#12151a",
  border: "rgba(255,255,255,0.07)",
  amber: "#f2a93b",
  amberDim: "rgba(242,169,59,0.14)",
  red: "#e2434b",
  redDim: "rgba(226,67,75,0.14)",
  green: "#4fae7c",
  greenDim: "rgba(79,174,124,0.14)",
  steel: "#6c86a1",
  text: "#eef1f4",
  textMuted: "#8792a1",
  textFaint: "#4d5561",
};

const DEFAULT_PICKER_CENTER = [28.6692, 77.4538];

const pickerPinIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 16px; height: 16px; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    background: ${COLORS.amber}; border: 2px solid #12151a;
    box-shadow: 0 0 0 3px rgba(242,169,59,0.22);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 16],
});

function CheckpointPicker({ selectedPoint, onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng);
    },
  });

  if (!selectedPoint) {
    return null;
  }

  return (
    <Marker
      position={[selectedPoint.lat, selectedPoint.lng]}
      icon={pickerPinIcon}
    />
  );
}

function Checkpoints({ onNotify }) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [searchingLocations, setSearchingLocations] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [resolvingPoint, setResolvingPoint] = useState(false);
  const searchTimerRef = useRef(null);
  const suppressNextSearchRef = useRef(false);

  const [formData, setFormData] = useState({
    checkpoint_name: "",
    location: "",
  });

  const fetchCheckpoints = async () => {
    try {
      const res = await axios.get("http://localhost:5000/checkpoints");
      setCheckpoints(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchOfficers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/officers");
      setOfficers(res.data.filter((o) => o.role === "Officer"));
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchCheckpoints();
    fetchOfficers();
  }, []);

  useEffect(() => {
    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false;
      return undefined;
    }

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const query = formData.location.trim();

    if (query.length < 3) {
      setLocationSuggestions([]);
      setSearchingLocations(false);
      return undefined;
    }

    setSearchingLocations(true);

    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await axios.get("http://localhost:5000/locations/search", {
          params: { q: query },
        });

        setLocationSuggestions(res.data.suggestions || []);
        setShowSuggestions(true);
      } catch (err) {
        console.log(err);
        setLocationSuggestions([]);
      } finally {
        setSearchingLocations(false);
      }
    }, 350);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [formData.location]);

  const addCheckpoint = async () => {
    try {
      const res = await axios.post("http://localhost:5000/checkpoints", formData);
      if (res.data.notification) {
        onNotify?.(res.data.notification);
      }
      setFormData({
        checkpoint_name: "",
        location: "",
      });
      setLocationSuggestions([]);
      setShowSuggestions(false);
      fetchCheckpoints();
    } catch (err) {
      console.log(err);
    }
  };

  const selectLocationSuggestion = (suggestion) => {
    suppressNextSearchRef.current = true;
    setSelectedPoint({ lat: suggestion.lat, lng: suggestion.lng });
    setFormData((current) => ({
      ...current,
      location: suggestion.label,
    }));
    setLocationSuggestions([]);
    setShowSuggestions(false);
  };

  const pickLocationFromMap = async ({ lat, lng }) => {
    suppressNextSearchRef.current = true;
    setResolvingPoint(true);
    setSelectedPoint({ lat, lng });

    try {
      const res = await axios.get("http://localhost:5000/locations/reverse", {
        params: { lat, lng },
      });

      setFormData((current) => ({
        ...current,
        location: res.data.location.label,
      }));
      onNotify?.(`Location selected on map: ${res.data.location.label}`);
    } catch (err) {
      console.log(err);
      setFormData((current) => ({
        ...current,
        location: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      }));
      onNotify?.("Map pin selected, but the address could not be resolved");
    } finally {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      setResolvingPoint(false);
    }
  };

  const deleteCheckpoint = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/checkpoints/${id}`);
      fetchCheckpoints();
    } catch (err) {
      console.log(err);
    }
  };

  const assignCheckpoint = async (id, officerId) => {
    try {
      const res = await axios.patch(`http://localhost:5000/checkpoints/${id}/assign`, {
        officer_id: officerId || null,
      });

      if (res.data.notification) {
        onNotify?.(res.data.notification);
      } else if (officerId) {
        const assignedOfficer = officers.find((officer) => officer.id === officerId);
        onNotify?.(
          `${assignedOfficer?.full_name || "Officer"} assigned to checkpoint ${id}`
        );
      }

      fetchCheckpoints();
    } catch (err) {
      console.log(err);
    }
  };

  const autoAssignCheckpoint = async (id) => {
    try {
      const res = await axios.post(`http://localhost:5000/checkpoints/${id}/auto-assign`);

      if (res.data.notification) {
        onNotify?.(res.data.notification);
      }

      fetchCheckpoints();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div>
      <style>{`
        .ppis-input::placeholder { color: ${COLORS.textFaint}; }
        .ppis-input:focus, .ppis-select:focus { outline: none; border-color: ${COLORS.amber} !important; }
        .ppis-add-btn:hover { background: #ffb955 !important; }
        .ppis-del-btn:hover { background: rgba(226,67,75,0.28) !important; }
        .ppis-row:hover { background: rgba(255,255,255,0.02); }
        .ppis-select option { background: ${COLORS.panelAlt}; color: ${COLORS.text}; }
      `}</style>

      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Checkpoints</h1>
        <p style={styles.pageSub}>Sector checkpoint network — deployment, assignment &amp; status</p>
      </div>

      <div style={styles.formPanel}>
        <span style={{ ...styles.cardCorner, ...styles.cornerTL }} />
        <span style={{ ...styles.cardCorner, ...styles.cornerBR }} />
        <div style={styles.formLabel}>New Checkpoint</div>
        <div style={styles.form}>
          <input
            className="ppis-input"
            style={styles.input}
            placeholder="Checkpoint name"
            value={formData.checkpoint_name}
            onChange={(e) =>
              setFormData({
                ...formData,
                checkpoint_name: e.target.value,
              })
            }
          />

          <div style={styles.locationFieldWrap}>
            <input
              className="ppis-input"
              style={styles.input}
              placeholder="Search landmark, address, city, or area"
              value={formData.location}
              onFocus={() => {
                if (locationSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onChange={(e) =>
                  {
                    setSelectedPoint(null);
                    setFormData({
                      ...formData,
                      location: e.target.value,
                    });
                  }
              }
            />

            {showSuggestions && (locationSuggestions.length > 0 || searchingLocations) && (
              <div style={styles.suggestionPanel}>
                {searchingLocations && <div style={styles.suggestionStatus}>Searching locations…</div>}

                {!searchingLocations &&
                  locationSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.lat}-${suggestion.lng}`}
                      type="button"
                      style={styles.suggestionItem}
                      onClick={() => selectLocationSuggestion(suggestion)}
                    >
                      <span style={styles.suggestionLabel}>{suggestion.label}</span>
                      <span style={styles.suggestionCoords}>
                        {suggestion.lat.toFixed(4)}, {suggestion.lng.toFixed(4)}
                      </span>
                    </button>
                  ))}

                {!searchingLocations && locationSuggestions.length === 0 && queryLengthHint(formData.location) && (
                  <div style={styles.suggestionStatus}>No matches found. Try a more specific address.</div>
                )}
              </div>
            )}
          </div>

          <div style={styles.mapPickerWrap}>
            <div style={styles.mapPickerHeader}>
              <span>Click on the map to pin a location</span>
              <span style={styles.mapPickerHint}>
                {resolvingPoint ? "Resolving address…" : "Pin will fill the field automatically"}
              </span>
            </div>

            <MapContainer
              center={selectedPoint ? [selectedPoint.lat, selectedPoint.lng] : DEFAULT_PICKER_CENTER}
              zoom={13}
              scrollWheelZoom={false}
              style={styles.mapPicker}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <CheckpointPicker selectedPoint={selectedPoint} onPick={pickLocationFromMap} />
            </MapContainer>
          </div>

          <button className="ppis-add-btn" style={styles.addButton} onClick={addCheckpoint}>
            + Deploy Checkpoint
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.header}>ID</th>
              <th style={styles.header}>Checkpoint</th>
              <th style={styles.header}>Location</th>
              <th style={styles.header}>Assigned Officer</th>
              <th style={styles.header}>Status</th>
              <th style={{ ...styles.header, textAlign: "right" }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {checkpoints.map((checkpoint) => (
              <tr className="ppis-row" key={checkpoint.id} style={styles.rowBase}>
                <td style={{ ...styles.cell, ...styles.cellMono }}>
                  #{String(checkpoint.id).slice(-6)}
                </td>

                <td style={styles.cell}>{checkpoint.checkpoint_name}</td>

                <td style={{ ...styles.cell, color: COLORS.textMuted }}>
                  {checkpoint.location}
                </td>

                <td style={styles.cell}>
                  <select
                    className="ppis-select"
                    style={styles.assignSelect}
                    value={checkpoint.assigned_officer?.id || ""}
                    onChange={(e) => assignCheckpoint(checkpoint.id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {officers.map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.full_name}
                      </option>
                    ))}
                  </select>
                </td>

                <td style={styles.cell}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      ...(checkpoint.status === "completed"
                        ? styles.statusDone
                        : styles.statusPending),
                    }}
                  >
                    {checkpoint.status === "completed" ? "Completed" : "Pending"}
                  </span>
                </td>

                <td style={{ ...styles.cell, textAlign: "right" }}>
                  <button
                    className="ppis-add-btn"
                    style={{ ...styles.actionButton, marginRight: "10px" }}
                    onClick={() => autoAssignCheckpoint(checkpoint.id)}
                  >
                    Auto Assign
                  </button>
                  <button
                    className="ppis-del-btn"
                    style={styles.deleteButton}
                    onClick={() => deleteCheckpoint(checkpoint.id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}

            {checkpoints.length === 0 && (
              <tr>
                <td style={styles.emptyCell} colSpan={6}>
                  No checkpoints on record.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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

  formPanel: {
    position: "relative",
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "10px",
    padding: "20px 22px",
    marginBottom: "26px",
  },
  cardCorner: { position: "absolute", width: "14px", height: "14px", borderColor: COLORS.amber },
  cornerTL: { top: "-1px", left: "-1px", borderTop: "2px solid", borderLeft: "2px solid" },
  cornerBR: { bottom: "-1px", right: "-1px", borderBottom: "2px solid", borderRight: "2px solid" },
  formLabel: {
    fontSize: "11px",
    letterSpacing: "1.2px",
    textTransform: "uppercase",
    color: COLORS.textMuted,
    fontWeight: 600,
    marginBottom: "14px",
  },
  form: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  locationFieldWrap: {
    position: "relative",
    flex: "1 1 240px",
    minWidth: "240px",
  },
  input: {
    background: COLORS.panelAlt,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "8px",
    padding: "11px 14px",
    color: COLORS.text,
    fontSize: "13.5px",
    fontFamily: "'Inter', sans-serif",
    minWidth: "200px",
    width: "100%",
    transition: "border-color 0.15s ease",
  },
  suggestionPanel: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    right: 0,
    zIndex: 20,
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 18px 36px rgba(0,0,0,0.32)",
  },
  suggestionItem: {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${COLORS.border}`,
    padding: "12px 14px",
    cursor: "pointer",
    color: COLORS.text,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  suggestionLabel: {
    fontSize: "12.8px",
    fontWeight: 600,
    lineHeight: 1.35,
  },
  suggestionCoords: {
    fontSize: "11px",
    color: COLORS.textFaint,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  suggestionStatus: {
    padding: "12px 14px",
    color: COLORS.textMuted,
    fontSize: "12px",
  },
  mapPickerWrap: {
    width: "100%",
    marginTop: "4px",
    borderRadius: "10px",
    border: `1px solid ${COLORS.border}`,
    overflow: "hidden",
    background: COLORS.panelAlt,
  },
  mapPickerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "10px 14px",
    fontSize: "11.5px",
    color: COLORS.textMuted,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  mapPickerHint: {
    color: COLORS.textFaint,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "10.5px",
  },
  mapPicker: {
    height: "220px",
    width: "100%",
  },
  addButton: {
    background: COLORS.amber,
    border: "none",
    padding: "11px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    color: "#12151a",
    fontWeight: 600,
    fontSize: "13px",
    letterSpacing: "0.3px",
    transition: "background 0.15s ease",
  },

  tableContainer: {
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "10px",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    color: COLORS.text,
    borderCollapse: "collapse",
  },
  header: {
    padding: "14px 18px",
    background: COLORS.panelAlt,
    color: COLORS.amber,
    fontFamily: "'Oswald', sans-serif",
    fontSize: "11.5px",
    letterSpacing: "1.2px",
    textTransform: "uppercase",
    textAlign: "left",
    borderBottom: `1px solid ${COLORS.border}`,
  },
  rowBase: {
    borderBottom: `1px solid ${COLORS.border}`,
    transition: "background 0.12s ease",
  },
  cell: {
    padding: "14px 18px",
    fontSize: "13.5px",
  },
  cellMono: {
    fontFamily: "'IBM Plex Mono', monospace",
    color: COLORS.steel,
  },
  assignSelect: {
    background: COLORS.panelAlt,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "6px",
    padding: "6px 10px",
    color: COLORS.text,
    fontSize: "12.5px",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
    minWidth: "150px",
  },
  statusBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "5px",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.4px",
  },
  statusPending: { color: COLORS.amber, background: COLORS.amberDim },
  statusDone: { color: COLORS.green, background: COLORS.greenDim },
  deleteButton: {
    background: COLORS.redDim,
    border: `1px solid ${COLORS.red}`,
    padding: "7px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    color: COLORS.red,
    fontSize: "12px",
    fontWeight: 600,
    transition: "background 0.15s ease",
  },
  actionButton: {
    background: COLORS.greenDim,
    border: `1px solid ${COLORS.green}`,
    padding: "7px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    color: COLORS.green,
    fontSize: "12px",
    fontWeight: 600,
    transition: "background 0.15s ease",
  },
  emptyCell: {
    padding: "28px 18px",
    textAlign: "center",
    color: COLORS.textFaint,
    fontSize: "13px",
  },
};

function queryLengthHint(value) {
  return value.trim().length >= 3;
}

export default Checkpoints;
