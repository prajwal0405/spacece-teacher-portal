import { useState, useEffect } from "react";
import LandingPage      from "./pages/LandingPage";
import LoginPage        from "./pages/LoginPage";
import AdminDashboard   from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import MentorDashboard  from "./mentor/MentorDashboard";
import { getStoredSession, storeSession, clearSession } from "./services/api";
import { LANG_CHANGE_EVENT, setLanguage, startDOMTranslation, stopDOMTranslation } from "./services/i18n";
import { SocketProvider } from "./context/SocketContext";

export default function App() {
  const [initialSession] = useState(getStoredSession);
  const [screen, setScreen] = useState(() => {
    if (!initialSession) return "landing";
    if (initialSession.user.role === "admin") return "admin";
    if (initialSession.user.role === "mentor") return "mentor";
    return "teacher";
  });
  const [currentUser, setCurrentUser] = useState(initialSession?.user || null);
  const [selectedRole, setSelectedRole] = useState("teacher");
  // Language key forces re-render of entire tree when language changes
  const [langKey, setLangKey] = useState(
    localStorage.getItem("spaceece_default_language") || "English"
  );

  useEffect(() => {
    const handler = (e) => {
      setLangKey(e.detail?.lang || localStorage.getItem("spaceece_default_language") || "English");
    };
    window.addEventListener(LANG_CHANGE_EVENT, handler);
    return () => window.removeEventListener(LANG_CHANGE_EVENT, handler);
  }, []);

  useEffect(() => {
    startDOMTranslation();
    return () => stopDOMTranslation();
  }, [langKey]);

  const handleLogin = (session) => {
    const user = session.user || session;
    if (session.token) storeSession(session);

    setCurrentUser(user);

    if (user.role === "admin") {
      setScreen("admin");
    } else if (user.role === "mentor") {
      setScreen("mentor");
    } else {
      setScreen("teacher");
    }

    if (user.language) {
      setLanguage(user.language);
    }
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setScreen("landing");
  };

  if (screen === "landing") {
    return (
      <LandingPage
        onGoToLogin={() => setScreen("login")}
        onSelectRole={(role) => {
          setSelectedRole(role);
          setScreen("login");
        }}
      />
    );
  }

  if (screen === "login") {
    return (
      <div>
        <div style={{
          background: "#0f172a",
          padding: "10px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#fff",
          borderBottom: "1px solid #1e293b"
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>
            🎓 SpacECE Teacher & Mentor Portal Login
          </span>
          <button
            onClick={() => setScreen("landing")}
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              color: "#fff",
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            ← Back to Landing Page
          </button>
        </div>
        <LoginPage onLogin={handleLogin} initialRole={selectedRole} />
      </div>
    );
  }

  return (
    <SocketProvider>
      {screen === "admin"   && <AdminDashboard   key={`admin-${langKey}`}   user={currentUser} onLogout={handleLogout}/>}
      {screen === "mentor"  && <MentorDashboard  key={`mentor-${langKey}`}  user={currentUser} onLogout={handleLogout}/>}
      {screen === "teacher" && <TeacherDashboard key={`teacher-${langKey}`} user={currentUser} onLogout={handleLogout}/>}
    </SocketProvider>
  );
}

