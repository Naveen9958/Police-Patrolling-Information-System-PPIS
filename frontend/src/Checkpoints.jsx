import { useEffect, useState } from "react";
import axios from "axios";

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

function Checkpoints() {
  const [checkpoints, setCheckpoints] = useState([]);
  const [officers, setOfficers] = useState([]);

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

  const addCheckpoint = async () => {
    try {
      await axios.post("http://localhost:5000/checkpoints", formData);
      setFormData({
        checkpoint_name: "",
        location: "",
      });
      fetchCheckpoints();
    } catch (err) {
      console.log(err);
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
      await axios.patch(`http://localhost:5000/checkpoints/${id}/assign`, {
        officer_id: officerId || null,
      });
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

          <input
            className="ppis-input"
            style={styles.input}
            placeholder="Location"
            value={formData.location}
            onChange={(e) =>
              setFormData({
                ...formData,
                location: e.target.value,
              })
            }
          />

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
    flex: "1 1 200px",
    transition: "border-color 0.15s ease",
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
  emptyCell: {
    padding: "28px 18px",
    textAlign: "center",
    color: COLORS.textFaint,
    fontSize: "13px",
  },
};

export default Checkpoints;
