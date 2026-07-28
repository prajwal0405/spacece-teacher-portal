import React, { useState, useEffect } from "react";
import { getMentorFellowAttendance, logMentorFellowAttendance } from "../services/api";
import "./FellowAttendance.css";

const LocationName = ({ coords }) => {
  const [address, setAddress] = useState("Loading...");

  useEffect(() => {
    if (!coords || typeof coords !== "string" || !coords.includes(',')) {
      setAddress(coords || "Unknown");
      return;
    }
    
    // Quick cache check
    const cacheKey = `geocode_${coords}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setAddress(cached);
      return;
    }

    const [lat, lon] = coords.split(',').map(c => c.trim());
    // Use Nominatim API for reverse geocoding
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
      .then(res => res.json())
      .then(data => {
        // Build a short readable address (e.g., suburb + city)
        let name = coords;
        if (data && data.address) {
          const { neighbourhood, suburb, city, town, village, county, state } = data.address;
          const parts = [neighbourhood || suburb, city || town || village, county || state].filter(Boolean);
          if (parts.length > 0) {
            name = parts.join(", ");
          } else if (data.display_name) {
            name = data.display_name.split(",").slice(0, 3).join(",");
          }
        }
        sessionStorage.setItem(cacheKey, name);
        setAddress(name);
      })
      .catch(() => {
        setAddress(coords);
      });
  }, [coords]);

  return <span>{address}</span>;
};

export default function MentorFellowAttendanceTab() {
  const [fellows, setFellows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("2026-07-01");
  const [endDate, setEndDate] = useState("2026-07-27");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedFellowId, setSelectedFellowId] = useState("");
  const [logDate, setLogDate] = useState("");
  const [logCheckIn, setLogCheckIn] = useState("");
  const [logCheckOut, setLogCheckOut] = useState("");
  const [logStatus, setLogStatus] = useState("Present");
  const [logLocation, setLogLocation] = useState("");
  
  const [error, setError] = useState("");

  useEffect(() => {
    fetchFellowAttendance();
  }, []);

  const fetchFellowAttendance = async () => {
    try {
      const data = await getMentorFellowAttendance();
      if (data && data.records) {
        const mappedData = data.records.map(record => {
          let locationStr = "No Location";
          let mapUrl = null;
          
          if (record.latitude && record.longitude) {
            locationStr = `${record.latitude}, ${record.longitude}`;
            mapUrl = `https://maps.google.com/?q=${record.latitude},${record.longitude}`;
          } else if (record.note) {
            try {
              const parsedNote = JSON.parse(record.note);
              if (parsedNote.coords) {
                locationStr = parsedNote.coords;
                mapUrl = `https://maps.google.com/?q=${parsedNote.coords.replace(/\s/g, "")}`;
              } else {
                locationStr = record.note;
              }
            } catch (e) {
              locationStr = record.note;
            }
          }

          return {
            id: record._id,
            name: record.teacher?.name || "Unknown Fellow",
            email: record.teacher?.email || "No Email",
            date: record.attendanceDate,
            checkIn: record.checkInTime || "N/A",
            checkOut: record.checkOutTime || "N/A",
            status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
            approval: "Verified",
            location: locationStr,
            mapUrl: mapUrl
          };
        });
        setFellows(mappedData);
      }
    } catch (error) {
      console.error("Error fetching fellow attendance:", error);
      setError("Failed to fetch attendance records.");
    }
  };

  const handleLogAttendance = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        teacher: selectedFellowId,
        attendanceDate: logDate,
        checkInTime: logCheckIn,
        checkOutTime: logCheckOut,
        status: logStatus.toLowerCase(),
        note: logLocation
      };
      const response = await logMentorFellowAttendance(payload);
      
      if (response && response.success) {
        setShowLogModal(false);
        fetchFellowAttendance();
        resetForm();
      } else {
        alert("Failed to log attendance");
      }
    } catch (err) {
      console.error("Error logging attendance", err);
      alert("Error logging attendance");
    }
  };

  const resetForm = () => {
    setSelectedFellowId("");
    setLogDate("");
    setLogCheckIn("");
    setLogCheckOut("");
    setLogStatus("Present");
    setLogLocation("");
  };

  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Email,Date,Check In,Check Out,Status,Location\n";
    filteredFellows.forEach(f => {
      csvContent += `${f.name},${f.email},${f.date},${f.checkIn},${f.checkOut},${f.status},"${f.location}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fellow_attendance.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredFellows = fellows.filter((f) => {
    const matchSearch = f.name?.toLowerCase().includes(searchTerm.toLowerCase()) || f.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "All Statuses" || f.status === statusFilter;
    let matchDate = true;
    if (startDate && endDate) {
      const d = new Date(f.date);
      const s = new Date(startDate);
      const e = new Date(endDate);
      matchDate = d >= s && d <= e;
    }
    return matchSearch && matchStatus && matchDate;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Present": return "badge-emerald";
      case "Absent": return "badge-rose";
      case "Leave": return "badge-violet";
      default: return "badge-blue";
    }
  };

  return (
    <div className="fa-container">
      <div className="fa-header">
        <div>
          <h1 className="fa-title">Fellow Attendance</h1>
          <p className="fa-subtitle">Monitor, verify, and manage daily field attendance records.</p>
        </div>
        <div className="fa-header-actions">
          <div className="fa-date-badge">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <button className="fa-btn-primary" onClick={() => setShowLogModal(true)}>
            + Log Entry
          </button>
        </div>
      </div>

      {error && (
        <div className="fa-alert">
          <div className="fa-alert-icon">⚠</div>
          <div className="fa-alert-content">
            <h4>Error</h4>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="fa-stats-grid">
        <div className="fa-stat-card">
          <div className="fa-stat-header">
            <span className="fa-stat-title">Total Fellows</span>
          </div>
          <div className="fa-stat-value">{fellows.length}</div>
          <span className="fa-stat-badge badge-blue">Active Roster</span>
        </div>
        <div className="fa-stat-card">
          <div className="fa-stat-header">
            <span className="fa-stat-title">Present Today</span>
          </div>
          <div className="fa-stat-value">{fellows.filter(f => f.status === 'Present').length}</div>
          <span className="fa-stat-badge badge-emerald">On Field</span>
        </div>
        <div className="fa-stat-card">
          <div className="fa-stat-header">
            <span className="fa-stat-title">Absent / Leave</span>
          </div>
          <div className="fa-stat-value">{fellows.filter(f => f.status !== 'Present').length}</div>
          <span className="fa-stat-badge badge-rose">Attention Needed</span>
        </div>
      </div>

      <div className="fa-toolbar">
        <div className="fa-search-wrapper">
          <input
            type="text"
            className="fa-search-input"
            placeholder="Search fellow by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="fa-filters">
          <div className="fa-date-group">
            From: 
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="fa-date-group">
            To:
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <select
            className="fa-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All Statuses</option>
            <option>Present</option>
            <option>Absent</option>
            <option>Leave</option>
          </select>
          <button className="fa-btn-secondary" onClick={exportCSV}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      <div className="fa-table-card">
        <div className="fa-table-header">
          <div>
            <h2>Verification Logs</h2>
            <p>Showing {filteredFellows.length} attendance records</p>
          </div>
        </div>
        <div className="fa-table-wrapper">
          <table className="fa-table">
            <thead>
              <tr>
                <th>Fellow Details</th>
                <th>Date & Time</th>
                <th>Status & Approval</th>
                <th>Location Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredFellows.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No attendance records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredFellows.map((log, index) => (
                  <tr key={index}>
                    <td>
                      <div className="fa-fellow-info">
                        <div className="fa-avatar">
                          {log.name ? log.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <span className="fa-fellow-name">{log.name}</span>
                          <span className="fa-fellow-email">{log.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>{new Date(log.date).toLocaleDateString()}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                        In: {log.checkIn || 'N/A'} • Out: {log.checkOut || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className={`fa-status-pill ${getStatusBadgeClass(log.status)}`}>
                          {log.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                        {log.approval}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}><LocationName coords={log.location} /></div>
                      {log.mapUrl && (
                        <a href={log.mapUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#4f46e5', textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: '4px' }}>
                          View on Map →
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showLogModal && (
        <div className="fa-modal-overlay">
          <div className="fa-modal">
            <div className="fa-modal-header">
              <h3>Log Manual Attendance</h3>
              <button className="fa-modal-close" onClick={() => setShowLogModal(false)}>✕</button>
            </div>
            <form onSubmit={handleLogAttendance} className="fa-modal-body">
              <div className="fa-form-group">
                <label>Fellow ID</label>
                <input required type="text" value={selectedFellowId} onChange={(e) => setSelectedFellowId(e.target.value)} placeholder="e.g. 64b73f8a0a..." />
              </div>
              <div className="fa-form-group">
                <label>Date</label>
                <input required type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="fa-form-group">
                  <label>Check In Time</label>
                  <input type="time" value={logCheckIn} onChange={(e) => setLogCheckIn(e.target.value)} />
                </div>
                <div className="fa-form-group">
                  <label>Check Out Time</label>
                  <input type="time" value={logCheckOut} onChange={(e) => setLogCheckOut(e.target.value)} />
                </div>
              </div>
              <div className="fa-form-group">
                <label>Status</label>
                <select value={logStatus} onChange={(e) => setLogStatus(e.target.value)}>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>
              <div className="fa-form-group">
                <label>Location Area</label>
                <input type="text" value={logLocation} onChange={(e) => setLogLocation(e.target.value)} placeholder="e.g. Pune, Maharashtra" />
              </div>
              <div className="fa-modal-actions">
                <button type="button" className="fa-btn-outline" onClick={() => setShowLogModal(false)}>Cancel</button>
                <button type="submit" className="fa-btn-primary">Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
