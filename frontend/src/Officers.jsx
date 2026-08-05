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
  steel: "#6c86a1",
  steelDim: "rgba(108,134,161,0.16)",
  text: "#eef1f4",
  textMuted: "#8792a1",
  textFaint: "#4d5561",
};

const ROLE_STYLE = {
  Admin: { color: COLORS.amber, bg: COLORS.amberDim },
  Officer: { color: COLORS.steel, bg: COLORS.steelDim },
};

function Officers() {
  const [officers, setOfficers] = useState([]);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "Officer",
  });

  const fetchOfficers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/officers");
      setOfficers(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, []);

  const addOfficer = async () => {
    try {
      await axios.post("http://localhost:5000/officers", formData);
      setFormData({
        full_name: "",
        email: "",
        password: "",
        role: "Officer",
      });
      fetchOfficers();
    } catch (err) {
      console.log(err);
    }
  };

  const deleteOfficer = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/officers/${id}`);
      fetchOfficers();
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
        <h1 style={styles.pageTitle}>Officers</h1>
        <p style={styles.pageSub}>Roster management — active duty personnel</p>
      </div>

      <div style={styles.formPanel}>
        <span style={{ ...styles.cardCorner, ...styles.cornerTL }} />
        <span style={{ ...styles.cardCorner, ...styles.cornerBR }} />
        <div style={styles.formLabel}>Enroll Officer</div>
        <div style={styles.form}>
          <input
            className="ppis-input"
            style={styles.input}
            placeholder="Full name"
            value={formData.full_name}
            onChange={(e) =>
              setFormData({
                ...formData,
                full_name: e.target.value,
              })
            }
          />

          <input
            className="ppis-input"
            style={styles.input}
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({
                ...formData,
                email: e.target.value,
              })
            }
          />

          <input
            className="ppis-input"
            style={styles.input}
            placeholder="Password"
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({
                ...formData,
                password: e.target.value,
              })
            }
          />

          <select
            className="ppis-select"
            style={styles.select}
            value={formData.role}
            onChange={(e) =>
              setFormData({
                ...formData,
                role: e.target.value,
              })
            }
          >
            <option>Officer</option>
            <option>Admin</option>
          </select>

          <button className="ppis-add-btn" style={styles.addButton} onClick={addOfficer}>
            + Enroll Officer
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.header}>ID</th>
              <th style={styles.header}>Name</th>
              <th style={styles.header}>Email</th>
              <th style={styles.header}>Role</th>
              <th style={{ ...styles.header, textAlign: "right" }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {officers.map((officer) => {
              const roleStyle = ROLE_STYLE[officer.role] || ROLE_STYLE.Officer;
              return (
                <tr className="ppis-row" key={officer.id} style={styles.rowBase}>
                  <td style={{ ...styles.cell, ...styles.cellMono }}>
                    #{String(officer.id).padStart(3, "0")}
                  </td>
                  <td style={styles.cell}>{officer.full_name}</td>
                  <td style={{ ...styles.cell, color: COLORS.textMuted }}>{officer.email}</td>
                  <td style={styles.cell}>
                    <span
                      style={{
                        ...styles.roleBadge,
                        color: roleStyle.color,
                        background: roleStyle.bg,
                        borderColor: roleStyle.color,
                      }}
                    >
                      {officer.role}
                    </span>
                  </td>
                  <td style={{ ...styles.cell, textAlign: "right" }}>
                    <button
                      className="ppis-del-btn"
                      style={styles.deleteButton}
                      onClick={() => deleteOfficer(officer.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}

            {officers.length === 0 && (
              <tr>
                <td style={styles.emptyCell} colSpan={5}>
                  No officers on record.
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
    alignItems: "center",
  },
  input: {
    background: COLORS.panelAlt,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "8px",
    padding: "11px 14px",
    color: COLORS.text,
    fontSize: "13.5px",
    fontFamily: "'Inter', sans-serif",
    minWidth: "170px",
    flex: "1 1 170px",
    transition: "border-color 0.15s ease",
  },
  select: {
    background: COLORS.panelAlt,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "8px",
    padding: "11px 14px",
    color: COLORS.text,
    fontSize: "13.5px",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
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
  roleBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "5px",
    border: "1px solid",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.4px",
  },
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

export default Officers;