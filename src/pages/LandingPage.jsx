import { useState, useMemo } from "react";
import { Logo, Badge } from "../components/Shared";
import { UMANG_CURRICULUM_SEMESTERS } from "../data/pdcaCurriculumData";
import { setLanguage, getCurrentLanguage } from "../services/i18n";

// Compact minimal static activities
const MINIMAL_ACTIVITIES = [
  {
    id: 1,
    activity: "Tummy Time Explorer",
    domain: "Gross Motor",
    level: "Level 1",
    duration: "10 min",
    purpose: "Builds neck and shoulder strength for early head control.",
    milestone: "Lifts head during tummy time"
  },
  {
    id: 2,
    activity: "Follow the Sound",
    domain: "Sensory",
    level: "Level 1",
    duration: "10 min",
    purpose: "Encourages auditory tracking and side-to-side head turning.",
    milestone: "Turns head toward sounds"
  },
  {
    id: 3,
    activity: "Texture Discovery Basket",
    domain: "Fine Motor",
    level: "Level 1",
    duration: "12 min",
    purpose: "Develops tactile exploration and early grasping skills.",
    milestone: "Explores multi-texture objects"
  },
  {
    id: 4,
    activity: "Crawl to Me",
    domain: "Gross Motor",
    level: "Level 2",
    duration: "12 min",
    purpose: "Strengthens limb coordination for independent mobility.",
    milestone: "Crawls forward on hands & knees"
  },
  {
    id: 5,
    activity: "Interactive Fingerplays",
    domain: "Language",
    level: "Level 3",
    duration: "15 min",
    purpose: "Fosters early vocabulary, rhythm, and listening attention.",
    milestone: "Imitates story gestures"
  },
  {
    id: 6,
    activity: "Color & Shape Sorting",
    domain: "Cognitive",
    level: "Level 3",
    duration: "15 min",
    purpose: "Enhances visual classification and spatial reasoning.",
    milestone: "Sorts by 2 attributes"
  }
];

export default function LandingPage({ onGoToLogin, onSelectRole }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSemester, setSelectedSemester] = useState(0);
  const [curriculumSearch, setCurriculumSearch] = useState("");
  const [activityLevel, setActivityLevel] = useState("All");

  // Demo Interactive States
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [geoStatus, setGeoStatus] = useState("idle");
  const [geoCoords, setGeoCoords] = useState(null);

  // Language state
  const [currentLang, setCurrentLangState] = useState(getCurrentLanguage() || "English");

  const handleLangChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    setCurrentLangState(lang);
  };

  // Filtered Curriculum
  const currentSemesterData = UMANG_CURRICULUM_SEMESTERS[selectedSemester] || UMANG_CURRICULUM_SEMESTERS[0];
  const filteredModules = useMemo(() => {
    if (!curriculumSearch.trim()) return currentSemesterData.modules.slice(0, 4);
    const q = curriculumSearch.toLowerCase();
    return currentSemesterData.modules.filter(
      (m) => m.title.toLowerCase().includes(q) || m.area.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [currentSemesterData, curriculumSearch]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return MINIMAL_ACTIVITIES.filter(
      (act) => activityLevel === "All" || act.level === activityLevel
    );
  }, [activityLevel]);

  // GPS Geotag Handler
  const handleTestGeotag = () => {
    setGeoStatus("locating");
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({ lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) });
        setGeoStatus("success");
      },
      () => {
        setGeoCoords({ lat: "18.5204", lng: "73.8567" });
        setGeoStatus("success");
      },
      { timeout: 4000 }
    );
  };

  // Smooth Scroll Helper
  const handleNavClick = (sectionId) => {
    setActiveTab(sectionId);
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div style={styles.pageWrapper}>
      {/* ── HEADER NAVBAR ── */}
      <header style={styles.navbar}>
        <div style={styles.navContainer}>
          <div style={styles.navBrand} onClick={() => handleNavClick("overview")}>
            <Logo size={80} />
            <div style={styles.brandTitleWrap}>
              <span style={styles.brandTitle}>SpacECE</span>
              <span style={styles.brandSubtitle}>Teacher & Mentor Portal</span>
            </div>
          </div>

          <nav style={styles.navMenu}>
            <button style={activeTab === "overview" ? styles.navLinkActive : styles.navLink} onClick={() => handleNavClick("overview")}>Overview</button>
            <button style={activeTab === "teacher" ? styles.navLinkActive : styles.navLink} onClick={() => handleNavClick("teacher")}>Teacher Summary</button>
            <button style={activeTab === "mentor" ? styles.navLinkActive : styles.navLink} onClick={() => handleNavClick("mentor")}>Mentor Insights</button>
            <button style={activeTab === "curriculum" ? styles.navLinkActive : styles.navLink} onClick={() => handleNavClick("curriculum")}>Curriculum</button>
            <button style={activeTab === "demos" ? styles.navLinkActive : styles.navLink} onClick={() => handleNavClick("demos")}>Demos</button>
          </nav>

          <div style={styles.navActions}>
            <button style={styles.portalLoginBtn} onClick={onGoToLogin}>
              Login →
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER (MINIMAL & CLASSY) ── */}
      <section id="overview" style={styles.heroSection}>
        <div style={styles.heroOverlay}>
          <div style={styles.heroBadge}>
            ✨ Early Childhood Education Platform
          </div>

          <h1 style={styles.heroHeading}>
            Empowering Educators & Mentors with <span style={styles.heroHighlight}>Real-Time Data</span>
          </h1>

          <p style={styles.heroSubtext}>
            Proctored training, geotagged classroom check-ins, structured HAALS child growth cycles, and mentorship insights in one elegant workspace.
          </p>

          <div style={styles.heroCtaGroup}>
            <button style={styles.primaryCtaBtn} onClick={onGoToLogin}>
              Launch Portal Login
            </button>
            <button style={styles.secondaryCtaBtn} onClick={() => handleNavClick("teacher")}>
              Explore Summary
            </button>
          </div>

          {/* ── MINIMAL STATS ROW ── */}
          <div style={styles.heroStatsGrid}>
            <div style={styles.heroStatItem}>
              <div style={styles.heroStatValue}>1,450+</div>
              <div style={styles.heroStatLabel}>Certified Teachers</div>
            </div>
            <div style={styles.heroStatItem}>
              <div style={styles.heroStatValue}>98.6%</div>
              <div style={styles.heroStatLabel}>Geotag Attendance</div>
            </div>
            <div style={styles.heroStatItem}>
              <div style={styles.heroStatValue}>450+</div>
              <div style={styles.heroStatLabel}>Curriculum Modules</div>
            </div>
            <div style={styles.heroStatItem}>
              <div style={styles.heroStatValue}>14.2k+</div>
              <div style={styles.heroStatLabel}>Child Assessments</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <main style={styles.mainContainer}>
        {/* SECTION 1: TEACHER SUMMARY METRICS */}
        <section id="teacher" style={styles.sectionBlock}>
            <div style={styles.sectionHeader}>
              <Badge color="#059669" bg="#d1fae5">TEACHER SUMMARY</Badge>
              <h2 style={styles.sectionTitle}>Teacher Performance Overview</h2>
            </div>

            <div style={styles.statsRowGrid}>
              <div style={styles.metricCard}>
                <span style={styles.cardEmoji}>📚</span>
                <div>
                  <div style={styles.metricVal}>94.2%</div>
                  <div style={styles.metricLabel}>Training Completion</div>
                </div>
              </div>
              <div style={styles.metricCard}>
                <span style={styles.cardEmoji}>📍</span>
                <div>
                  <div style={styles.metricVal}>98.6%</div>
                  <div style={styles.metricLabel}>Geotag Verified</div>
                </div>
              </div>
              <div style={styles.metricCard}>
                <span style={styles.cardEmoji}>🛡️</span>
                <div>
                  <div style={styles.metricVal}>96.8%</div>
                  <div style={styles.metricLabel}>Proctored Pass Rate</div>
                </div>
              </div>
              <div style={styles.metricCard}>
                <span style={styles.cardEmoji}>🌱</span>
                <div>
                  <div style={styles.metricVal}>8.9 / 10</div>
                  <div style={styles.metricLabel}>PDCA Growth Index</div>
                </div>
              </div>
            </div>

            {/* MINIMAL WORKFLOW STEPS */}
            <div style={styles.workflowGrid}>
              {[
                { step: "01", title: "Geotag Check-in", desc: "GPS verified attendance at assigned center." },
                { step: "02", title: "Lesson Selection", desc: "Choose structured daily ECCE lesson plan." },
                { step: "03", title: "Classroom Activity", desc: "Conduct motor, sensory, & literacy sessions." },
                { step: "04", title: "Child Assessment", desc: "Record HAALS child growth milestones." }
              ].map((w, idx) => (
                <div key={idx} style={styles.workflowStep}>
                  <span style={styles.stepNum}>{w.step}</span>
                  <h4 style={styles.stepTitle}>{w.title}</h4>
                  <p style={styles.stepDesc}>{w.desc}</p>
                </div>
              ))}
            </div>
          </section>

        {/* SECTION 2: MENTOR INSIGHTS */}
        <section id="mentor" style={styles.sectionBlock}>
          <div style={styles.sectionHeader}>
            <Badge color="#2563eb" bg="#dbeafe">MENTOR INSIGHTS</Badge>
            <h2 style={styles.sectionTitle}>Mentorship & Quality Assurance</h2>
          </div>

          <div style={styles.statsRowGrid}>
            <div style={{ ...styles.metricCard, borderTopColor: "#2563eb" }}>
              <span style={styles.cardEmoji}>👩‍🏫</span>
              <div>
                <div style={styles.metricVal}>1 : 12</div>
                <div style={styles.metricLabel}>Mentor to Fellow Ratio</div>
              </div>
            </div>
            <div style={{ ...styles.metricCard, borderTopColor: "#2563eb" }}>
              <span style={styles.cardEmoji}>🔍</span>
              <div>
                <div style={styles.metricVal}>3,820+</div>
                <div style={styles.metricLabel}>Observations Completed</div>
              </div>
            </div>
            <div style={{ ...styles.metricCard, borderTopColor: "#2563eb" }}>
              <span style={styles.cardEmoji}>⚡</span>
              <div>
                <div style={styles.metricVal}>&lt; 24h</div>
                <div style={styles.metricLabel}>Signoff Turnaround</div>
              </div>
            </div>
            <div style={{ ...styles.metricCard, borderTopColor: "#2563eb" }}>
              <span style={styles.cardEmoji}>🏆</span>
              <div>
                <div style={styles.metricVal}>92.4%</div>
                <div style={styles.metricLabel}>Fellow Growth Rate</div>
              </div>
            </div>
          </div>

          <div style={styles.rubricGrid}>
            {[
              { title: "Pedagogy Execution", val: "95%", icon: "🎯" },
              { title: "Child Engagement", val: "92%", icon: "🤝" },
              { title: "Classroom Safety", val: "98%", icon: "🛡️" },
              { title: "HAALS Observation Data", val: "94%", icon: "📊" }
            ].map((r, i) => (
              <div key={i} style={styles.rubricBox}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{r.icon} <strong>{r.title}</strong></span>
                  <span style={styles.rubricVal}>{r.val}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: CURRICULUM & ACTIVITIES (COMPACT) */}
        <section id="curriculum" style={styles.sectionBlock}>
          <div style={styles.sectionHeader}>
            <Badge color="#7c3aed" bg="#ede9fe">CURRICULUM & ACTIVITIES</Badge>
            <h2 style={styles.sectionTitle}>Umang Fellowship Modules</h2>
          </div>

          <div style={styles.tabBar}>
            {UMANG_CURRICULUM_SEMESTERS.map((sem, idx) => (
              <button
                key={idx}
                style={selectedSemester === idx ? styles.tabBtnActive : styles.tabBtn}
                onClick={() => setSelectedSemester(idx)}
              >
                Sem {idx + 1}
              </button>
            ))}
          </div>

          <div style={styles.modulesGrid}>
            {filteredModules.map((mod, i) => (
              <div key={i} style={styles.moduleCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={styles.modBadge}>{mod.area}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Module {i + 1}</span>
                </div>
                <h4 style={styles.moduleTitle}>{mod.title}</h4>
                <p style={styles.moduleDesc}>{mod.objective}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 40 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={styles.subTitle}>Activity Bank Preview</h3>
              <div style={{ display: "flex", gap: 6 }}>
                {["All", "Level 1", "Level 2", "Level 3"].map((lvl) => (
                  <button
                    key={lvl}
                    style={activityLevel === lvl ? styles.chipActive : styles.chip}
                    onClick={() => setActivityLevel(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.activitiesGrid}>
              {filteredActivities.map((act) => (
                <div key={act.id} style={styles.actCard}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={styles.actLevel}>{act.level}</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>⏱️ {act.duration}</span>
                  </div>
                  <h4 style={styles.actTitle}>{act.activity}</h4>
                  <p style={styles.actDesc}>{act.purpose}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4: INTERACTIVE DEMOS */}
        <section id="demos" style={styles.sectionBlock}>
          <div style={styles.sectionHeader}>
            <Badge color="#d97706" bg="#fef3c7">INTERACTIVE DEMOS</Badge>
            <h2 style={styles.sectionTitle}>Try Platform Features Live</h2>
          </div>

          <div style={styles.demoGrid}>
            {/* DEMO 1: PROCTORED SIMULATOR */}
            <div style={styles.demoCard}>
              <h4 style={styles.demoTitle}>🛡️ Proctored Assessment Simulator</h4>
              <p style={styles.demoDesc}>Q. Which activity best promotes gross motor skills in toddlers?</p>

              <div style={styles.quizOptions}>
                {[
                  { id: "A", text: "Obstacle crawling & jumping play" },
                  { id: "B", text: "Silent seated book reading" }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    style={quizAnswer === opt.id ? styles.quizOptSelected : styles.quizOpt}
                    onClick={() => {
                      setQuizAnswer(opt.id);
                      setQuizSubmitted(false);
                    }}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>

              <button
                disabled={!quizAnswer}
                style={quizAnswer ? styles.primaryCtaBtnCompact : styles.disabledBtn}
                onClick={() => setQuizSubmitted(true)}
              >
                Verify Answer
              </button>

              {quizSubmitted && (
                <div style={styles.quizResult}>
                  {quizAnswer === "A" ? "✓ Correct! Proctored session verified." : "✕ Option A is correct for gross motor play."}
                </div>
              )}
            </div>

            {/* DEMO 2: GEOTAG SCANNER */}
            <div style={styles.demoCard}>
              <h4 style={styles.demoTitle}>📍 Geotag GPS Scanner</h4>
              <p style={styles.demoDesc}>Scan device browser GPS coordinates to test center radius check-in.</p>

              <button style={styles.secondaryCtaBtnCompact} onClick={handleTestGeotag}>
                {geoStatus === "locating" ? "Scanning..." : "Scan GPS Location"}
              </button>

              {geoStatus === "success" && geoCoords && (
                <div style={styles.geoResult}>
                  ✅ Verified! Lat: {geoCoords.lat}° | Lng: {geoCoords.lng}°
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 5: ROLE PORTAL LOGIN CARDS */}
        <section style={styles.sectionBlock}>
          <div style={styles.sectionHeader}>
            <Badge color="#10b981" bg="#d1fae5">PORTAL ACCESS</Badge>
            <h2 style={styles.sectionTitle}>Select Your Role</h2>
          </div>

          <div style={styles.portalCardsGrid}>
            <div style={styles.roleCard} onClick={() => { if (onSelectRole) onSelectRole("teacher"); onGoToLogin(); }}>
              <span style={styles.roleIcon}>👩‍🏫</span>
              <h3 style={styles.roleTitle}>Teacher Portal</h3>
              <p style={styles.roleSub}>Lesson plans, geotag attendance & HAALS child tracking.</p>
              <button style={styles.roleBtn}>Enter Teacher Portal →</button>
            </div>

            <div style={styles.roleCard} onClick={() => { if (onSelectRole) onSelectRole("mentor"); onGoToLogin(); }}>
              <span style={styles.roleIcon}>👨‍💼</span>
              <h3 style={styles.roleTitle}>Mentor Portal</h3>
              <p style={styles.roleSub}>Classroom observations, signoffs & fellow mentorship.</p>
              <button style={{ ...styles.roleBtn, background: "#2563eb" }}>Enter Mentor Portal →</button>
            </div>

            <div style={styles.roleCard} onClick={() => { if (onSelectRole) onSelectRole("admin"); onGoToLogin(); }}>
              <span style={styles.roleIcon}>⚙️</span>
              <h3 style={styles.roleTitle}>Admin Portal</h3>
              <p style={styles.roleSub}>Center management, curriculum & system analytics.</p>
              <button style={{ ...styles.roleBtn, background: "#0f172a" }}>Enter Admin Portal →</button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <Logo size={70} />
          <span>© {new Date().getFullYear()} SpacECE Teacher Portal. Minimal & Classy UI.</span>
        </div>
      </footer>
    </div>
  );
}

// ── MINIMAL CLASSY STYLESHEET ──
const styles = {
  pageWrapper: {
    minHeight: "100vh",
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    color: "#0f172a",
    background: "#fafafa",
  },
  navbar: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid #f1f5f9",
  },
  navContainer: {
    maxWidth: 1140,
    margin: "0 auto",
    padding: "10px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBrand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
  },
  brandTitleWrap: {
    display: "flex",
    flexDirection: "column",
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: 600,
    color: "#d97706",
  },
  navMenu: {
    display: "flex",
    gap: 6,
  },
  navLink: {
    background: "none",
    border: "none",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#64748b",
    cursor: "pointer",
  },
  navLinkActive: {
    background: "#fef3c7",
    border: "none",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "#b45309",
    cursor: "pointer",
  },
  navActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  langSelect: {
    padding: "5px 10px",
    borderRadius: 6,
    border: "1px solid #e2e8f0",
    fontSize: 12,
    background: "#fff",
    cursor: "pointer",
  },
  portalLoginBtn: {
    background: "#d97706",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  // HERO
  heroSection: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    color: "#fff",
    padding: "60px 20px",
    textAlign: "center",
  },
  heroOverlay: {
    maxWidth: 820,
    margin: "0 auto",
  },
  heroBadge: {
    display: "inline-block",
    padding: "4px 14px",
    borderRadius: 20,
    background: "rgba(245, 158, 11, 0.15)",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 16,
  },
  heroHeading: {
    fontSize: "clamp(28px, 4vw, 42px)",
    fontWeight: 800,
    lineHeight: 1.2,
    marginBottom: 14,
  },
  heroHighlight: {
    color: "#fbbf24",
  },
  heroSubtext: {
    fontSize: 15,
    color: "#94a3b8",
    marginBottom: 28,
    lineHeight: 1.5,
  },
  heroCtaGroup: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    marginBottom: 40,
  },
  primaryCtaBtn: {
    background: "#f59e0b",
    color: "#0f172a",
    border: "none",
    padding: "12px 24px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryCtaBtn: {
    background: "rgba(255, 255, 255, 0.08)",
    color: "#fff",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    padding: "12px 22px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  heroStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
    paddingTop: 24,
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  },
  heroStatItem: {
    background: "rgba(255, 255, 255, 0.03)",
    padding: "12px",
    borderRadius: 10,
  },
  heroStatValue: {
    fontSize: 22,
    fontWeight: 800,
    color: "#fbbf24",
  },
  heroStatLabel: {
    fontSize: 11,
    color: "#cbd5e1",
    marginTop: 2,
  },

  // LAYOUT
  mainContainer: {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "48px 20px",
  },
  sectionBlock: {
    marginBottom: 56,
  },
  sectionHeader: {
    textAlign: "center",
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a",
    marginTop: 8,
  },

  // METRICS
  statsRowGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    background: "#fff",
    borderRadius: 14,
    padding: 18,
    border: "1px solid #e2e8f0",
    borderTop: "3px solid #059669",
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  cardEmoji: {
    fontSize: 24,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: 800,
    color: "#0f172a",
  },
  metricLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 600,
  },

  // WORKFLOW
  workflowGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 14,
  },
  workflowStep: {
    background: "#fff",
    borderRadius: 12,
    padding: 18,
    border: "1px solid #e2e8f0",
  },
  stepNum: {
    fontSize: 11,
    fontWeight: 800,
    color: "#d97706",
    background: "#fef3c7",
    padding: "2px 6px",
    borderRadius: 4,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 700,
    margin: "8px 0 4px",
  },
  stepDesc: {
    fontSize: 12,
    color: "#64748b",
  },

  // RUBRIC
  rubricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  rubricBox: {
    background: "#fff",
    padding: 16,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    fontSize: 13,
  },
  rubricVal: {
    fontWeight: 800,
    color: "#2563eb",
  },

  // CURRICULUM & ACTIVITIES
  tabBar: {
    display: "flex",
    gap: 8,
    justifyContent: "center",
    marginBottom: 20,
  },
  tabBtn: {
    background: "#fff",
    border: "1px solid #cbd5e1",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    color: "#64748b",
    cursor: "pointer",
  },
  tabBtnActive: {
    background: "#7c3aed",
    border: "1px solid #7c3aed",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    color: "#fff",
    cursor: "pointer",
  },
  modulesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
  },
  moduleCard: {
    background: "#fff",
    borderRadius: 14,
    padding: 18,
    border: "1px solid #e2e8f0",
  },
  modBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: "#7c3aed",
    background: "#ede9fe",
    padding: "2px 8px",
    borderRadius: 4,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: 700,
    margin: "8px 0 4px",
  },
  moduleDesc: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.4,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: 700,
  },
  chip: {
    background: "#fff",
    border: "1px solid #cbd5e1",
    padding: "4px 10px",
    borderRadius: 14,
    fontSize: 11,
    color: "#64748b",
    cursor: "pointer",
  },
  chipActive: {
    background: "#059669",
    border: "1px solid #059669",
    padding: "4px 10px",
    borderRadius: 14,
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
    cursor: "pointer",
  },
  activitiesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
  },
  actCard: {
    background: "#fff",
    borderRadius: 12,
    padding: 16,
    border: "1px solid #e2e8f0",
  },
  actLevel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#059669",
    background: "#d1fae5",
    padding: "2px 6px",
    borderRadius: 4,
  },
  actTitle: {
    fontSize: 14,
    fontWeight: 700,
    margin: "6px 0 4px",
  },
  actDesc: {
    fontSize: 12,
    color: "#64748b",
  },

  // DEMOS
  demoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  demoCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    border: "1px solid #e2e8f0",
  },
  demoTitle: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 6,
  },
  demoDesc: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 12,
  },
  quizOptions: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 12,
  },
  quizOpt: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 12,
    textAlign: "left",
    cursor: "pointer",
  },
  quizOptSelected: {
    background: "#fef3c7",
    border: "1px solid #f59e0b",
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    color: "#92400e",
    textAlign: "left",
    cursor: "pointer",
  },
  primaryCtaBtnCompact: {
    background: "#d97706",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
  },
  secondaryCtaBtnCompact: {
    background: "#059669",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
  },
  disabledBtn: {
    background: "#cbd5e1",
    color: "#64748b",
    border: "none",
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 12,
    cursor: "not-allowed",
    width: "100%",
  },
  quizResult: {
    fontSize: 12,
    color: "#059669",
    marginTop: 10,
    textAlign: "center",
    fontWeight: 600,
  },
  geoResult: {
    fontSize: 12,
    color: "#059669",
    marginTop: 10,
    textAlign: "center",
    fontWeight: 600,
  },

  // PORTAL CARDS
  portalCardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
  },
  roleCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 24,
    border: "1px solid #e2e8f0",
    textAlign: "center",
    cursor: "pointer",
    transition: "transform 0.2s ease",
  },
  roleIcon: {
    fontSize: 36,
    marginBottom: 10,
    display: "block",
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: 800,
    marginBottom: 6,
  },
  roleSub: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 16,
  },
  roleBtn: {
    width: "100%",
    background: "#059669",
    color: "#fff",
    border: "none",
    padding: "10px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
  },

  // FOOTER
  footer: {
    borderTop: "1px solid #e2e8f0",
    background: "#fff",
    padding: "20px",
  },
  footerInner: {
    maxWidth: 1080,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 12,
    color: "#64748b",
  },
};
