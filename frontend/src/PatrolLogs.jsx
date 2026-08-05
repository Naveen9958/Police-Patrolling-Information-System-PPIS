import { useEffect, useState } from "react";
import axios from "axios";

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

function PatrolLogs() {
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    try {
      const res = await axios.get("http://localhost:5000/patrol-logs");
      setLogs(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Poll so completions made from the officer portal show up without a refresh.
    const t = setInterval(fetchLogs, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <style>{`
        .ppis-row:hover { background: rgba(255,255,255,0.02); }
      `}</style>

      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Patrol Logs</h1>
        <p style={styles.pageSub}>Checkpoint completion history — logged when an officer completes an assigned checkpoint</p>
      </div>

      <div style={styles.actionRow}>
        <span style={styles.liveTag}>
          <span style={styles.liveDot} /> {logs.length} entries logged
        </span>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.header}>ID</th>
              <th style={styles.header}>Officer</th>
              <th style={styles.header}>Checkpoint</th>
              <th style={styles.header}>Scanned Time</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log) => (
              <tr className="ppis-row" key={log.id} style={styles.rowBase}>
                <td style={{ ...styles.cell, ...styles.cellMono }}>
                  #{String(log.id).padStart(3, "0")}
                </td>

                <td style={styles.cell}>{log.full_name}</td>

                <td style={styles.cell}>
                  <span style={styles.checkpointBadge}>{log.checkpoint_name}</span>
                </td>

                <td style={{ ...styles.cell, ...styles.cellMono, color: COLORS.textMuted }}>
                  {new Date(log.scanned_at).toLocaleString()}
                </td>
              </tr>
            ))}

            {logs.length === 0 && (
              <tr>
                <td style={styles.emptyCell} colSpan={4}>
                  No scans logged yet.
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

  actionRow: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginBottom: "20px",
    flexWrap: "wrap",
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
  },
  checkpointBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "5px",
    border: `1px solid ${COLORS.steel}`,
    color: COLORS.steel,
    fontSize: "11.5px",
    fontWeight: 500,
  },
  emptyCell: {
    padding: "28px 18px",
    textAlign: "center",
    color: COLORS.textFaint,
    fontSize: "13px",
  },
};

export default PatrolLogs;