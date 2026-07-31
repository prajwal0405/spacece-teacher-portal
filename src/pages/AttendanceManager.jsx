import { useState, useEffect, useRef } from "react";
import { SectionCard, S, Badge } from "../components/Shared";
import { getTeacherMe, getTeacherChildren, getChildAttendance, saveChildAttendance, deleteChildAttendance, deleteTeacherChild, createTeacherChild, getTeacherClasses, createTeacherChildrenBulk } from "../services/api";
import * as XLSX from "xlsx";
// End: Dnyaneshwari Thorat

const EMAILJS_SERVICE_ID  = "service_ckzt1le";
const EMAILJS_TEMPLATE_ID = "template_xycsvf7";
const EMAILJS_PUBLIC_KEY  = "yPV6fZ9hYl5XpEQ1w";

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const generateOTP   = () => String(Math.floor(100000 + Math.random() * 900000));

let emailJsLoaded = false;

export default function AttendanceManager({ user }) {
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceDict, setAttendanceDict] = useState({});
  const [isSavedRecord, setIsSavedRecord] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  // Start: Dnyaneshwari Thorat
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [excelStudents, setExcelStudents] = useState([]);
  // End: Dnyaneshwari Thorat
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentAge, setNewStudentAge] = useState("");
  const [newStudentGender, setNewStudentGender] = useState("");
  const [newStudentParentName, setNewStudentParentName] = useState("");
  const [newStudentParentPhone, setNewStudentParentPhone] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [rosterVersion, setRosterVersion] = useState(0);

  // OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpStep, setOtpStep] = useState("sending"); // "sending"|"input"|"verifying"
  const [otpInput, setOtpInput] = useState(["","","","","",""]);
  const [pendingChange, setPendingChange] = useState(null);
  const [otpError, setOtpError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const otpRef = useRef(null);
  const cooldownRef = useRef(null);
  const otpInputRefs = useRef([]);

  // Load teacher profile, center, and class on mount
  useEffect(() => {
    getTeacherMe()
      .then(res => {
        setTeacherProfile(res.teacher);
        const defaultClassId = (res.teacher?.teacherProfile?.classes || [])[0]?._id || (res.teacher?.teacherProfile?.classes || [])[0];
        
        getTeacherClasses()
          .then(classRes => {
            const cls = classRes.classes || [];
            setClasses(cls);
            if (defaultClassId) {
              setSelectedClassId(defaultClassId);
            } else if (cls.length > 0) {
              setSelectedClassId(cls[0]._id || cls[0].id);
            }
          })
          .catch(err => {
            console.error("Error fetching teacher classes:", err);
          });
      })
      .catch(err => {
        console.error("Error fetching teacher profile:", err);
      });
  }, []);

  // Fetch children list and attendance for selected date
  useEffect(() => {
    if (!teacherProfile) return;
    const classId = selectedClassId || (teacherProfile?.teacherProfile?.classes || [])[0]?._id || (teacherProfile?.teacherProfile?.classes || [])[0];
    setLoading(true);

    Promise.all([
      getTeacherChildren(classId),
      getChildAttendance({ date: selectedDate, classId: classId })
    ]).then(([childrenRes, attendanceRes]) => {
      const dbChildren = childrenRes.children || [];
      const roster = dbChildren.map(c => ({
        id: c._id || c.id,
        rollNo: c.rollNo || "N/A",
        name: c.fullName || c.name,
      }));
      setStudents(roster);

      const sessions = attendanceRes.sessions || [];
      const classSession = sessions.find(s => {
        const scid = s.class?._id || s.class?.id || s.class;
        return scid === classId;
      });

      if (classSession) {
        const dict = {};
        const statusMap = { present: "P", absent: "A", late: "L" };
        classSession.records.forEach(r => {
          const cid = r.child?._id || r.child?.id || r.child;
          dict[cid] = statusMap[r.status] || "P";
        });
        setAttendanceDict(dict);
        setIsSavedRecord(true);
      } else {
        const dict = {};
        roster.forEach(st => {
          dict[st.id] = "P";
        });
        setAttendanceDict(dict);
        setIsSavedRecord(false);
      }
      setLoading(false);
    }).catch(err => {
      console.error("Error loading roster/attendance:", err);
      setLoading(false);
      triggerToast("Failed to fetch records from database.", true);
    });
  }, [selectedDate, teacherProfile, selectedClassId, rosterVersion]);

  // OTP expiry countdown
  useEffect(() => {
    if (!otpExpiry) return;
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.floor((otpExpiry - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(tick);
        setOtpError("OTP has expired. Please request a new one.");
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [otpExpiry]);

  useEffect(() => () => clearInterval(cooldownRef.current), []);

  const triggerToast = (msg, isError = false) => {
    if (isError) { setErrorMsg(msg); setTimeout(() => setErrorMsg(""), 4000); }
    else { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 4000); }
  };

  const ensureEmailJs = () =>
    new Promise((resolve, reject) => {
      if (emailJsLoaded && window.emailjs) { resolve(); return; }
      if (window.emailjs) { emailJsLoaded = true; resolve(); return; }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
      script.onload = () => {
        window.emailjs.init(EMAILJS_PUBLIC_KEY);
        emailJsLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error("Failed to load EmailJS SDK"));
      document.head.appendChild(script);
    });

  const sendOtpEmail = async (otp, studentName, oldStatus, newStatus) => {
    await ensureEmailJs();
    const label = s => s === "P" ? "Present" : s === "A" ? "Absent" : "Leave";
    await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: user.email,
      teacher_name: user.name || "Teacher",
      passcode: otp,
      student_name: studentName,
      date: selectedDate,
      old_status: label(oldStatus),
      new_status: label(newStatus),
    });
  };

  const startCooldown = () => {
    clearInterval(cooldownRef.current);
    setResendCooldown(30);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const doSendOtp = async (studentName, oldStatus, newStatus) => {
    const otp = generateOTP();
    otpRef.current = otp;
    setOtpStep("sending");
    try {
      await sendOtpEmail(otp, studentName, oldStatus, newStatus);
      setOtpExpiry(Date.now() + OTP_EXPIRY_MS);
      setOtpStep("input");
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      startCooldown();
    } catch (err) {
      console.error("EmailJS error:", err);
      setOtpError("Failed to send OTP. Please check your EmailJS configuration.");
      setOtpStep("input");
    }
  };

  // Start: Dnyaneshwari Thorat
  const handleStatusToggle = (childId, targetStatus) => {
    setAttendanceDict(prev => ({ ...prev, [childId]: targetStatus }));
  };
  // End: Dnyaneshwari Thorat

  const handleOtpDigit = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otpInput];
    updated[index] = value.slice(-1);
    setOtpInput(updated);
    setOtpError("");
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpInput[index] && index > 0)
      otpInputRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const updated = ["","","","","",""];
    pasted.split("").forEach((ch, i) => { updated[i] = ch; });
    setOtpInput(updated);
    otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const saveAttendanceToDb = (dict) => {
    const centerId = teacherProfile?.teacherProfile?.center?._id || teacherProfile?.teacherProfile?.center;
    const classId = selectedClassId || (teacherProfile?.teacherProfile?.classes || [])[0]?._id || (teacherProfile?.teacherProfile?.classes || [])[0];

    if (!centerId || !classId) {
      return Promise.reject(new Error("Center/Class assignment missing in teacher profile."));
    }

    const recordsPayload = Object.entries(dict).map(([childId, status]) => {
      const statusMap = { P: "present", A: "absent", L: "late" };
      return {
        childId,
        status: statusMap[status] || "present"
      };
    });

    return saveChildAttendance({
      centerId,
      classId,
      attendanceDate: selectedDate,
      records: recordsPayload
    });
  };

  const handleVerifyOtp = () => {
    if (timeLeft === 0) { setOtpError("OTP has expired. Please request a new one."); return; }
    const entered = otpInput.join("");
    if (entered.length < 6) { setOtpError("Please enter all 6 digits."); return; }
    setOtpStep("verifying");
    setTimeout(() => {
      if (entered === otpRef.current) {
        if (pendingChange) {
          const updatedDict = { ...attendanceDict, [pendingChange.childId]: pendingChange.nextStatus };
          setAttendanceDict(updatedDict);
          saveAttendanceToDb(updatedDict)
            .then(() => {
              triggerToast("✅ OTP verified and attendance updated in database!");
            })
            .catch(err => {
              console.error("Error saving attendance:", err);
              triggerToast("Failed to save to database: " + err.message, true);
            });
        }
        setShowOtpModal(false);
        setPendingChange(null);
        otpRef.current = null;
      } else {
        setOtpStep("input");
        setOtpError("❌ Incorrect OTP. Please check your email.");
        setOtpInput(["","","","","",""]);
        otpInputRefs.current[0]?.focus();
      }
    }, 800);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !pendingChange) return;
    setOtpInput(["","","","","",""]);
    setOtpError("");
    setOtpExpiry(null);
    setTimeLeft(null);
    await doSendOtp(pendingChange.studentName, pendingChange.currentStatus, pendingChange.nextStatus);
    triggerToast("New OTP sent to your email.");
  };

  const closeOtpModal = () => {
    setShowOtpModal(false);
    setPendingChange(null);
    otpRef.current = null;
    setOtpInput(["","","","","",""]);
    setOtpError("");
    clearInterval(cooldownRef.current);
  };

  // Start: Dnyaneshwari Thorat
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        const rows = parsedData.filter(row => row && row.length > 0);
        if (rows.length === 0) {
          triggerToast("The Excel sheet is empty.", true);
          return;
        }
        
        let startIndex = 0;
        let nameIdx = 0, ageIdx = 1, genderIdx = 2, parentNameIdx = 3, parentPhoneIdx = 4;
        
        const firstRow = rows[0].map(c => String(c || "").toLowerCase().trim());
        const hasHeader = firstRow.some(val => val.includes("name") || val.includes("age") || val.includes("gender") || val.includes("parent"));
        
        if (hasHeader) {
          startIndex = 1;
          firstRow.forEach((val, idx) => {
            if (val.includes("parent name") || val.includes("parent_name") || val.includes("guardian name") || val.includes("father") || val.includes("mother")) {
              parentNameIdx = idx;
            } else if (val.includes("phone") || val.includes("contact") || val.includes("mobile") || val.includes("parent phone")) {
              parentPhoneIdx = idx;
            } else if (val.includes("name") || val.includes("student") || val.includes("full name")) {
              nameIdx = idx;
            } else if (val.includes("age") || val.includes("years")) {
              ageIdx = idx;
            } else if (val.includes("gender") || val.includes("sex")) {
              genderIdx = idx;
            }
          });
        }
        
        const parsedStudents = [];
        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          const name = row[nameIdx] ? String(row[nameIdx]).trim() : "";
          if (!name) continue;
          
          const age = row[ageIdx] ? parseInt(row[ageIdx], 10) : "";
          let gender = row[genderIdx] ? String(row[genderIdx]).trim() : "Male";
          gender = gender.toLowerCase().startsWith("f") ? "Female" : "Male";
          const parentName = row[parentNameIdx] ? String(row[parentNameIdx]).trim() : "";
          const parentPhone = row[parentPhoneIdx] ? String(row[parentPhoneIdx]).trim() : "";
          
          parsedStudents.push({ name, age, gender, parentName, parentPhone });
        }
        
        if (parsedStudents.length === 0) {
          triggerToast("No students could be parsed from the Excel file.", true);
        } else {
          setExcelStudents(parsedStudents);
          triggerToast(`Parsed ${parsedStudents.length} students from Excel file!`);
        }
      } catch (err) {
        console.error("Excel parse error:", err);
        triggerToast("Failed to parse Excel file. Make sure it is valid.", true);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExcelBulkSubmit = () => {
    const classId = selectedClassId || (teacherProfile?.teacherProfile?.classes || [])[0]?._id || (teacherProfile?.teacherProfile?.classes || [])[0];
    if (!classId) {
      triggerToast("No class selected.", true);
      return;
    }
    const childrenList = excelStudents.map(st => ({
      fullName: st.name,
      age: st.age ? Number(st.age) : undefined,
      gender: st.gender || "Male",
      guardianName: st.parentName || undefined,
      guardianPhone: st.parentPhone || undefined,
      classId,
      status: "active"
    }));

    createTeacherChildrenBulk(childrenList)
      .then(() => {
        triggerToast(`Bulk enrolled ${childrenList.length} children successfully!`);
        setExcelStudents([]);
        setRosterVersion(v => v + 1);
      })
      .catch(err => {
        console.error("Bulk enroll error:", err);
        triggerToast("Failed bulk enrollment: " + err.message, true);
      });
  };
  // End: Dnyaneshwari Thorat

const handleAddStudent = (e) => {
  e.preventDefault();
  const classId = selectedClassId || (teacherProfile?.teacherProfile?.classes || [])[0]?._id || (teacherProfile?.teacherProfile?.classes || [])[0];

  if (!classId) {
    triggerToast("No class assigned to your account. Please contact admin.", true);
    return;
  }

    // Start: Dnyaneshwari Thorat
    if (bulkMode) {
      if (excelStudents.length === 0) {
        triggerToast("Please upload a valid Excel file first.", true);
        return;
      }
      const childrenList = excelStudents.map(st => ({
        fullName: st.name,
        age: st.age ? Number(st.age) : undefined,
        gender: st.gender || "Male",
        guardianName: st.parentName || undefined,
        guardianPhone: st.parentPhone || undefined,
        classId,
        status: "active"
      }));

      createTeacherChildrenBulk(childrenList)
        .then(() => {
          triggerToast(`Bulk enrolled ${childrenList.length} children successfully!`);
          setExcelStudents([]);
          setShowAddModal(false);
          setRosterVersion(v => v + 1);
        })
        .catch(err => {
          console.error("Bulk enroll error:", err);
          triggerToast("Failed bulk enrollment: " + err.message, true);
        });
      return;
    }
    // End: Dnyaneshwari Thorat

    if (!newStudentName.trim()) return;

    createTeacherChild({
      fullName: newStudentName.trim(),
      age: newStudentAge ? Number(newStudentAge) : undefined,
      gender: newStudentGender || undefined,
      guardianName: newStudentParentName || undefined,
      guardianPhone: newStudentParentPhone || undefined,
      classId,
      status: "active"
    })
      .then(() => {
        triggerToast("Child enrolled successfully in database!");
        setNewStudentName("");
        setNewStudentAge("");
        setNewStudentGender("");
        setNewStudentParentName("");
        setNewStudentParentPhone("");
        setShowAddModal(false);
        setRosterVersion(v => v + 1);
      })
      .catch(err => {
        console.error("Error adding child:", err);
        triggerToast("Failed to add child: " + err.message, true);
      });
  };

  const handleSaveSheet = () => {
    saveAttendanceToDb(attendanceDict)
      .then(() => {
        setIsSavedRecord(true);
        triggerToast(`Attendance sheet submitted to database for ${selectedDate}`);
      })
      .catch(err => {
        console.error("Error saving attendance:", err);
        triggerToast("Failed to submit sheet: " + err.message, true);
      });
  };

  // Start: Dnyaneshwari Thorat
  const handleDeleteSheetRecord = () => {
    const classId = selectedClassId || (teacherProfile?.teacherProfile?.classes || [])[0]?._id || (teacherProfile?.teacherProfile?.classes || [])[0];
    if (!classId) {
      triggerToast("No class selected.", true);
      return;
    }

    if (!window.confirm("Delete this saved attendance record? You can add a new one after this.")) return;

    deleteChildAttendance({ classId, attendanceDate: selectedDate })
      .then(() => {
        const resetDict = {};
        students.forEach(st => { resetDict[st.id] = "P"; });
        setAttendanceDict(resetDict);
        setIsSavedRecord(false);
        setRosterVersion(v => v + 1);
        triggerToast("Attendance record deleted successfully.");
      })
      .catch(err => {
        console.error("Error deleting attendance:", err);
        triggerToast("Failed to delete record: " + err.message, true);
      });
  };
  // End: Dnyaneshwari Thorat

  // Start: Dnyaneshwari Thorat
  const handleDeleteChild = (childId, childName) => {
    if (!childId) return;
    if (!window.confirm(`Remove ${childName || "this child"} from the register? This will also remove their attendance record.`)) return;

    deleteTeacherChild(childId)
      .then(() => {
        setRosterVersion(v => v + 1);
        triggerToast(`${childName || "Child"} removed successfully.`);
      })
      .catch(err => {
        console.error("Error deleting child:", err);
        triggerToast("Failed to remove child: " + err.message, true);
      });
  };
  // End: Dnyaneshwari Thorat

  const maskedEmail = user.email
    ? user.email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 5)) + c)
    : "your registered email";

  const formatTime = secs => {
    if (secs === null) return "";
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  };

  const otpFilled = otpInput.join("").length === 6;

  if (loading && students.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh", fontSize: 14, fontWeight: 600, color: "#d97706" }}>
        🔄 Loading Children Roster...
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Children Attendance</h1>
          <p style={S.pageSub}>Manage rosters and record daily attendance registers.</p>
        </div>
        <button
       onClick={() => setShowAddModal(true)}
      style={{ ...S.primaryBtn, opacity: (!loading && classes.length === 0) ? 0.5 : 1, cursor: (!loading && classes.length === 0) ? "not-allowed" : "pointer" }}
      disabled={!loading && classes.length === 0}
      title={classes.length === 0 ? "No class assigned — contact admin" : ""}
>
  + Enroll Child
</button>
      </div>

      {/* Toast banners */}
      {successMsg && (
        <div style={{ padding: "12px 16px", marginBottom: 16, background: "#d1fae5", color: "#065f46", borderRadius: 10, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: "12px 16px", marginBottom: 16, background: "#fee2e2", color: "#991b1b", borderRadius: 10, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          ⚠️ {errorMsg}
        </div>
      )}
     {!loading && classes.length === 0 && (
     <div style={{ padding: "12px 16px", marginBottom: 16, background: "#fef3c7", color: "#92400e", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
     ⚠️ No class is assigned to your account yet. Please contact your admin to assign a class before enrolling children.
     </div>
      )}
      {/* Start: Dnyaneshwari Thorat */}
      <SectionCard title="📁 Excel Bulk Enrollment">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
            Upload an Excel or CSV file to enroll multiple children at once. No manual writing required!
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              border: "2px dashed #fbbf24",
              borderRadius: "16px",
              background: "#fffbeb",
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "center"
            }}>
              <span style={{ fontSize: "36px", marginBottom: "8px" }}>📊</span>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#b45309" }}>Upload Excel or CSV spreadsheet</span>
              <span style={{ fontSize: "11px", color: "#d97706", marginTop: "4px" }}>Drag and drop file here, or click to browse</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelUpload}
                style={{ display: "none" }}
              />
            </label>
            {excelStudents.length > 0 && (
              <button
                onClick={handleExcelBulkSubmit}
                style={{
                  ...S.primaryBtn,
                  width: "100%",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: "800",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  boxShadow: "0 4px 12px rgba(217, 119, 6, 0.2)"
                }}
              >
                🚀 Confirm & Import {excelStudents.length} Students to attendance sheet
              </button>
            )}
          </div>
          
          {excelStudents.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", marginBottom: 8 }}>Parsed Student Cards:</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {excelStudents.map((st, idx) => (
                  <div key={idx} style={{ background: "white", padding: 14, borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setExcelStudents(prev => prev.filter((_, i) => i !== idx))}
                      style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: "#ef4444", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                      title="Remove"
                    >
                      ✕
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 20 }}>👶</span>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "#1c1917" }}>{st.name}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <Badge children={`${st.age || "?"} Yrs`} color="#059669" bg="#d1fae5" />
                      <Badge children={st.gender} color="#7c3aed" bg="#ede9fe" />
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                      <strong>Parent:</strong> {st.parentName || "—"}<br />
                      <strong>Phone:</strong> {st.parentPhone || "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionCard>
      {/* End: Dnyaneshwari Thorat */}

      {/* Date picker */}
      <SectionCard title="📅 Daily Register Date & Class Lookup">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <label style={{ ...S.label, margin: 0, fontWeight: 700 }}>Select Sheet Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ ...S.input, width: "auto", padding: "8px 12px" }}
            />

            {classes.length > 0 && (
              <>
                <label style={{ ...S.label, margin: 0, fontWeight: 700, marginLeft: 12 }}>Select Class:</label>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  style={{ ...S.input, width: "auto", padding: "8px 12px", minWidth: 150 }}
                >
                  {classes.map(c => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.name} ({c.ageGroup || "All Ages"})</option>
                  ))}
                </select>
              </>
            )}

            {isSavedRecord
              ? <Badge children="📝 Reviewing Saved Sheet History" color="#059669" bg="#d1fae5" />
              : <Badge children="✨ New Unsaved Data Register"     color="#854d0e" bg="#fef9c3" />
            }
          </div>
          {classes.length > 0 && selectedClassId && (
            <Badge children={`Class: ${classes.find(c => (c._id || c.id) === selectedClassId)?.name || "Selected"}`} color="#d97706" bg="#fef3c7" />
          )}
        </div>
      </SectionCard>

      {/* Roster table */}
      <div style={{ marginTop: 20 }}>
        <SectionCard title={`👥 Children Register — Date: ${selectedDate} (${students.length} children)`}>
          {students.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
              No children enrolled in this class yet. Click "+ Enroll Child" above or upload an Excel sheet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Start: Dnyaneshwari Thorat */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {students.map(st => {
                  const status = attendanceDict[st.id] || "P";
                  return (
                    <div
                      key={st.id}
                      style={{
                        background: "white",
                        padding: 16,
                        borderRadius: 16,
                        border: `1px solid ${status === "P" ? "#86efac" : status === "A" ? "#fca5a5" : "#fde68a"}`,
                        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          background: status === "P" ? "#e8f5e9" : status === "A" ? "#ffebee" : "#fffde7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20
                        }}>
                          👶
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{st.name}</div>
                          <div style={{ fontSize: 11, color: "#d97706", fontWeight: 700 }}>Roll No: {st.rollNo}</div>
                        </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteChild(st.id, st.name)}
                          style={{
                            border: "1px solid #fecaca",
                            background: "#fff1f2",
                            color: "#dc2626",
                            fontSize: 11,
                            fontWeight: 800,
                            borderRadius: 999,
                            padding: "6px 10px",
                            cursor: "pointer",
                            flexShrink: 0
                          }}
                        >
                          Delete
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: 6, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(st.id, "P")}
                          style={{
                            flex: 1,
                            padding: "6px 0",
                            borderRadius: 8,
                            border: "none",
                            background: status === "P" ? "#22c55e" : "#f1f5f9",
                            color: status === "P" ? "white" : "#64748b",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            transition: "all 0.15s"
                          }}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(st.id, "A")}
                          style={{
                            flex: 1,
                            padding: "6px 0",
                            borderRadius: 8,
                            border: "none",
                            background: status === "A" ? "#ef4444" : "#f1f5f9",
                            color: status === "A" ? "white" : "#64748b",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            transition: "all 0.15s"
                          }}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(st.id, "L")}
                          style={{
                            flex: 1,
                            padding: "6px 0",
                            borderRadius: 8,
                            border: "none",
                            background: status === "L" ? "#eab308" : "#f1f5f9",
                            color: status === "L" ? "white" : "#64748b",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            transition: "all 0.15s"
                          }}
                        >
                          Leave
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* End: Dnyaneshwari Thorat */}

              {/* Footer actions */}
              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  {isSavedRecord && (
                    <button onClick={handleDeleteSheetRecord} style={{ ...S.exportBtn, color: "#ef4444", border: "1px solid #fca5a5" }}>
                      🗑️ Delete Saved Record
                    </button>
                  )}
                </div>
                <button onClick={handleSaveSheet} style={{ ...S.primaryBtn, padding: "10px 24px" }}>
                  {isSavedRecord ? "💾 Submit Update" : "💾 Submit Attendance Register"}
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* MODAL 1 — Enroll Student */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1c1917", margin: 0 }}>Register New Child</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>
            {/* Start: Dnyaneshwari Thorat */}
            <div style={{ display: "flex", gap: 12, borderBottom: "1px solid #f1f5f9", marginBottom: 16, paddingBottom: 8 }}>
              <button type="button" onClick={() => setBulkMode(false)} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 700, color: !bulkMode ? "#d97706" : "#6b7280", borderBottom: !bulkMode ? "2px solid #d97706" : "none", paddingBottom: 4, cursor: "pointer" }}>Single Enrollment</button>
              <button type="button" onClick={() => setBulkMode(true)} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 700, color: bulkMode ? "#d97706" : "#6b7280", borderBottom: bulkMode ? "2px solid #d97706" : "none", paddingBottom: 4, cursor: "pointer" }}>Bulk Enrollment</button>
            </div>

            <form onSubmit={handleAddStudent}>
              {bulkMode ? (
                <div>
                  <label style={S.label}>Upload Excel File (.xlsx, .xls, .csv)</label>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelUpload}
                    style={{ ...S.input, marginBottom: 12, padding: "8px 12px" }}
                  />
                  
                  {excelStudents.length > 0 && (
                    <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 10, padding: 8, background: "#f8fafc", marginBottom: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {excelStudents.map((st, idx) => (
                          <div key={idx} style={{ background: "white", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{st.name} ({st.age} yrs, {st.gender})</div>
                              <div style={{ fontSize: 10, color: "#64748b" }}>Parent: {st.parentName || "—"} | {st.parentPhone || "—"}</div>
                            </div>
                            <button type="button" onClick={() => setExcelStudents(prev => prev.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 13, cursor: "pointer", padding: "2px 6px" }}>✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button type="submit" disabled={excelStudents.length === 0} style={{ ...S.primaryBtn, width: "100%", opacity: excelStudents.length === 0 ? 0.6 : 1, cursor: excelStudents.length === 0 ? "not-allowed" : "pointer" }}>
                    Bulk Enroll {excelStudents.length > 0 ? `(${excelStudents.length} Children)` : ""} →
                  </button>
                </div>
              ) : (
                <div>
                  <label style={S.label}>Student Full Name *</label>
                  <input
                    required
                    style={{ ...S.input, marginBottom: 12 }}
                    placeholder="Enter first and last name…"
                    value={newStudentName}
                    onChange={e => setNewStudentName(e.target.value)}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={S.label}>Age</label>
                      <input
                        type="number"
                        min="1"
                        max="18"
                        style={S.input}
                        placeholder="Age"
                        value={newStudentAge}
                        onChange={e => setNewStudentAge(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={S.label}>Gender</label>
                      <select style={S.input} value={newStudentGender} onChange={e => setNewStudentGender(e.target.value)}>
                        <option value="">Select…</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <label style={S.label}>Parent/Guardian Name</label>
                  <input
                    style={{ ...S.input, marginBottom: 12 }}
                    placeholder="Parent or guardian name"
                    value={newStudentParentName}
                    onChange={e => setNewStudentParentName(e.target.value)}
                  />
                  <label style={S.label}>Parent Phone</label>
                  <input
                    style={{ ...S.input, marginBottom: 20 }}
                    placeholder="Parent phone number"
                    value={newStudentParentPhone}
                    onChange={e => setNewStudentParentPhone(e.target.value)}
                  />
                  <button type="submit" style={{ ...S.primaryBtn, width: "100%" }}>Enroll Child →</button>
                </div>
              )}
            </form>
            {/* End: Dnyaneshwari Thorat */}
          </div>
        </div>
      )}

      {/* MODAL 2 — OTP Verification */}
      {showOtpModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)" }}>
          <div style={{ background: "white", borderRadius: 24, padding: "32px 28px", width: "100%", maxWidth: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.25)", position: "relative" }}>
            <button onClick={closeOtpModal} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}>✕</button>

            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>
                {otpStep === "sending" ? "📤" : otpStep === "verifying" ? "⏳" : "📧"}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", margin: "0 0 6px" }}>
                {otpStep === "sending"   ? "Sending OTP…"      :
                 otpStep === "verifying" ? "Verifying OTP…"    :
                                           "Email OTP Verification"}
              </h3>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.6 }}>
                {otpStep === "sending" ? "Checking network parameters..." : `We've sent a 6-digit OTP passcode to ${maskedEmail}.`}
              </p>
              {/* Start: Dnyaneshwari Thorat */}
              {otpRef.current && (
                <div style={{ marginTop: 10, padding: 8, background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, fontSize: 11, color: "#b45309", fontWeight: 700 }}>
                  🔑 Local Testing OTP: <span style={{ fontSize: 13, color: "#d97706", fontFamily: "monospace", letterSpacing: 1 }}>{otpRef.current}</span>
                </div>
              )}
              {/* End: Dnyaneshwari Thorat */}
            </div>

            {otpStep !== "sending" && (
              <>
                {timeLeft !== null && timeLeft > 0 && (
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color:      timeLeft > 60 ? "#059669" : timeLeft > 30 ? "#d97706" : "#dc2626",
                      background: timeLeft > 60 ? "#f0fdf4" : timeLeft > 30 ? "#fef3c7" : "#fef2f2",
                      border: `1px solid ${timeLeft > 60 ? "#a7f3d0" : timeLeft > 30 ? "#fde68a" : "#fca5a5"}`,
                      padding: "5px 16px", borderRadius: 20
                    }}>
                      ⏱ Expires in {formatTime(timeLeft)}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 18 }} onPaste={handleOtpPaste}>
                  {otpInput.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpInputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpDigit(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      style={{
                        width: 46, height: 54,
                        textAlign: "center", fontSize: 22, fontWeight: 800,
                        border: `2px solid ${otpError ? "#ef4444" : digit ? "#f59e0b" : "#e2e8f0"}`,
                        borderRadius: 10, outline: "none",
                        background: digit ? "#fffbf0" : "white",
                        color: "#1c1917",
                        transition: "border-color 0.15s, background 0.15s",
                        caretColor: "#f59e0b"
                      }}
                    />
                  ))}
                </div>

                {otpError && (
                  <div style={{ textAlign: "center", marginBottom: 14, fontSize: 12, color: "#dc2626", fontWeight: 600, padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
                    {otpError}
                  </div>
                )}

                <button
                  onClick={handleVerifyOtp}
                  disabled={!otpFilled || timeLeft === 0}
                  style={{
                    width: "100%", padding: 13, marginBottom: 12,
                    background: (!otpFilled || timeLeft === 0) ? "#e2e8f0" : "linear-gradient(135deg,#f59e0b,#d97706)",
                    color:  (!otpFilled || timeLeft === 0) ? "#94a3b8" : "white",
                    border: "none", borderRadius: 10, fontSize: 13, fontWeight: 800,
                    cursor: (!otpFilled || timeLeft === 0) ? "not-allowed" : "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  ✅ Verify OTP & Apply Change
                </button>

                <div style={{ textAlign: "center", fontSize: 12, color: "#64748b" }}>
                  Didn't receive it?{" "}
                  {resendCooldown > 0
                    ? <span style={{ color: "#94a3b8", fontWeight: 600 }}>Resend in {resendCooldown}s</span>
                    : <button onClick={handleResendOtp} style={{ background: "none", border: "none", color: "#d97706", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 12, textDecoration: "underline" }}>Resend OTP</button>
                  }
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
