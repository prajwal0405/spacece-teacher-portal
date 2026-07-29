import { useState, useEffect } from "react";
import { Badge, StatusBadge, SectionCard } from "../components/Shared";
import { t } from "../services/i18n";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function TeacherActivitiesTab({ user, setToast }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("approved");
  const [adminComments, setAdminComments] = useState("");

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("spaceece_auth_token");
      const res = await fetch(`${API_BASE_URL}/api/mentor/activities`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch activities");
      setActivities(data.activities || []);
    } catch (err) {
      setToast({ msg: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleReview = async (e, id) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("spaceece_auth_token");
      const res = await fetch(`${API_BASE_URL}/api/mentor/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status: reviewStatus, adminComments })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to review activity");
      setToast({ msg: "Activity reviewed successfully", type: "success" });
      setReviewingId(null);
      setAdminComments("");
      fetchActivities();
    } catch (err) {
      setToast({ msg: err.message, type: "error" });
    }
  };

  const pending = activities.filter(a => a.status === "pending");
  const reviewed = activities.filter(a => a.status !== "pending");

  const renderActivityCard = (act) => (
    <div key={act._id} style={{ padding: "16px", marginBottom: "16px", borderRadius: "8px", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <h4 style={{ margin: "0 0 4px 0", fontSize: 16, color: "#1e293b" }}>{act.activityName || "Activity Submission"}</h4>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            By <strong>{act.teacher?.name}</strong> • {new Date(act.activityDate).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={act.status} />
      </div>

      <div style={{ fontSize: 14, color: "#334155", marginBottom: 12 }}>
        <strong>Description:</strong> {act.description}
      </div>

      {act.files && act.files.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <strong>Attachments:</strong> {act.files.length} file(s) attached
        </div>
      )}

      {act.adminComments && (
        <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 6, fontSize: 13, color: "#475569", borderLeft: "3px solid #f59e0b" }}>
          <strong>Mentor Remarks:</strong> {act.adminComments}
        </div>
      )}

      {act.status === "pending" && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
          {reviewingId === act._id ? (
            <form onSubmit={(e) => handleReview(e, act._id)} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <select 
                value={reviewStatus} 
                onChange={e => setReviewStatus(e.target.value)}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}
              >
                <option value="approved">Approve</option>
                <option value="flagged">Needs Rework (Flag)</option>
                <option value="rejected">Reject</option>
              </select>
              <textarea 
                placeholder="Leave remarks or feedback for the Teacher..."
                value={adminComments}
                onChange={e => setAdminComments(e.target.value)}
                rows={3}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setReviewingId(null)} style={{ padding: "6px 12px", borderRadius: 6, background: "#f1f5f9", color: "#475569", border: "none", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ padding: "6px 12px", borderRadius: 6, background: "#f59e0b", color: "white", border: "none", cursor: "pointer", fontWeight: 500 }}>Submit Review</button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => { setReviewingId(act._id); setReviewStatus("approved"); setAdminComments(""); }}
              style={{ padding: "8px 16px", borderRadius: 6, background: "#f8fafc", color: "#f59e0b", border: "1px solid #fcd34d", cursor: "pointer", fontWeight: 500 }}
            >
              Review Submission
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", marginBottom: 24 }}>Teacher Activities</h2>
      
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading activities...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
          <SectionCard title="Pending Review" icon="⏳">
            {pending.length > 0 ? pending.map(renderActivityCard) : (
              <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>No pending activities to review.</div>
            )}
          </SectionCard>

          <SectionCard title="Reviewed Activities" icon="✅">
            {reviewed.length > 0 ? reviewed.map(renderActivityCard) : (
              <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>No reviewed activities yet.</div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
