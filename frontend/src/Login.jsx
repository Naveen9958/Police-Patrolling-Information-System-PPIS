import { useState } from "react";
import axios from "axios";

const COLORS = {
  bg: "#0d1013",
  panel: "#171b21",
  panelAlt: "#12151a",
  border: "rgba(255,255,255,0.07)",
  amber: "#f2a93b",
  amberDim: "rgba(242,169,59,0.14)",
  red: "#e2434b",
  text: "#eef1f4",
  textMuted: "#8792a1",
  textFaint: "#4d5561",
};

function Login({ onLogin }) {
  const [portal, setPortal] = useState("officer"); // "officer" | "admin"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Yeh line add karein

  const handleLogin = async () => {
    setError("");
    setSubmitting(true);

    try {
      const res = await axios.post(`http://localhost:5000/auth/${portal}/login`, {
        email,
        password,
      });

      if (res.data.success) {
        onLogin(res.data.user);
      } else {
        setError(res.data.error || "Invalid credentials");
      }
    } catch (err) {
      console.log(err);
      setError("Server error — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div style={styles.wrap}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        .ppis-tab { transition: background 0.15s ease, color 0.15s ease; }
        .ppis-login-btn:hover { background: #ffb955 !important; }
        .ppis-login-input:focus { outline: none; border-color: ${COLORS.amber} !important; }
      `}</style>

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.badge}>🚨</div>
          <h1 style={styles.title}>PPIS</h1>
          <p style={styles.subtitle}>Police Patrol &amp; Incident System</p>
        </div>

        <div style={styles.tabRow}>
          <div
            className="ppis-tab"
            style={{ ...styles.tab, ...(portal === "officer" ? styles.tabActive : {}) }}
            onClick={() => {
              setPortal("officer");
              setError("");
            }}
          >
            Officer Login
          </div>
          <div
            className="ppis-tab"
            style={{ ...styles.tab, ...(portal === "admin" ? styles.tabActive : {}) }}
            onClick={() => {
              setPortal("admin");
              setError("");
            }}
          >
            Admin Login
          </div>
        </div>

        <input
          className="ppis-login-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          style={styles.input}
        />

        <div style={{ position: "relative" }}>
  <input
    className="ppis-login-input"
    type={showPassword ? "text" : "password"} // Condition yahan check hogi
    placeholder="Password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    onKeyDown={handleKeyDown}
    style={{ ...styles.input, paddingRight: "40px" }} // Icon ke liye right mein space
  />
  <span
    onClick={() => setShowPassword(!showPassword)}
    style={{
      position: "absolute",
      right: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      cursor: "pointer",
      color: COLORS.textMuted, // Aapke theme ke hisaab se color
      fontSize: "16px",
      userSelect: "none"
    }}
  >
    {showPassword ? "🙈" : "👁️"}
  </span>
</div>

        <button
          className="ppis-login-btn"
          style={styles.button}
          onClick={handleLogin}
          disabled={submitting}
        >
          {submitting ? "Signing in…" : `Sign In as ${portal === "admin" ? "Admin" : "Officer"}`}
        </button>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.footer}>Authorized Personnel Access Only</div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: COLORS.bg,
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  card: {
    width: "380px",
    padding: "36px",
    borderRadius: "16px",
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
  },
  header: { textAlign: "center", marginBottom: "26px" },
  badge: { fontSize: "40px", marginBottom: "6px" },
  title: {
    fontFamily: "'Oswald', sans-serif",
    fontSize: "24px",
    fontWeight: 700,
    letterSpacing: "2px",
    color: COLORS.text,
    margin: 0,
  },
  subtitle: { fontSize: "13px", color: COLORS.textMuted, marginTop: "6px" },
  tabRow: {
    display: "flex",
    background: COLORS.panelAlt,
    borderRadius: "8px",
    padding: "4px",
    marginBottom: "20px",
    border: `1px solid ${COLORS.border}`,
  },
  tab: {
    flex: 1,
    textAlign: "center",
    padding: "9px 0",
    borderRadius: "6px",
    fontSize: "12.5px",
    fontWeight: 600,
    letterSpacing: "0.3px",
    cursor: "pointer",
    color: COLORS.textMuted,
  },
  tabActive: {
    background: COLORS.amberDim,
    color: COLORS.amber,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    marginBottom: "14px",
    borderRadius: "8px",
    border: `1px solid ${COLORS.border}`,
    background: COLORS.panelAlt,
    color: COLORS.text,
    fontSize: "13.5px",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "8px",
    background: COLORS.amber,
    color: "#12151a",
    fontWeight: 700,
    fontSize: "13.5px",
    letterSpacing: "0.3px",
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  error: {
    color: COLORS.red,
    fontSize: "12.5px",
    marginTop: "14px",
    textAlign: "center",
  },
  footer: {
    marginTop: "24px",
    fontSize: "10.5px",
    textAlign: "center",
    color: COLORS.textFaint,
    letterSpacing: "0.4px",
  },
};

export default Login;
