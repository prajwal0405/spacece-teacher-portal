import { useState, useEffect } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const AddressDisplay = ({ lat, lon }) => {
    const [address, setAddress] = useState("Fetching location...");
    
    useEffect(() => {
        const fetchAddress = async () => {
            try {
                const cacheKey = `geo_${lat}_${lon}`;
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    setAddress(cached);
                    return;
                }
                // Rate limiting protection: small delay
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`);
                const data = await res.json();
                // Extract a shorter, readable address
                let displayAddress = data.display_name || "Location found";
                if (data.address) {
                    const { road, suburb, city, state } = data.address;
                    displayAddress = [road, suburb, city, state].filter(Boolean).join(", ");
                }
                
                sessionStorage.setItem(cacheKey, displayAddress);
                setAddress(displayAddress);
            } catch (err) {
                setAddress(`GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
            }
        };
        if (lat && lon) fetchAddress();
    }, [lat, lon]);

    return (
        <div className="flex flex-col">
            <div className="flex items-start space-x-1">
                <i className="fa-solid fa-map-pin text-rose-500 mt-1 text-[10px]"></i>
                <span className="text-xs text-slate-600 line-clamp-2 max-w-[180px]" title={address}>
                    {address}
                </span>
            </div>
            <a href={`https://www.google.com/maps?q=${lat},${lon}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline mt-0.5 ml-3 font-medium w-fit">
                Open in Maps
            </a>
        </div>
    );
};

export default function MentorFellowAttendanceTab({ user, setToast }) {
  const [records, setRecords] = useState([]);
  const [fellows, setFellows] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [centerFilter, setCenterFilter] = useState("all");
  
  const [showLogModal, setShowLogModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeDetail, setActiveDetail] = useState(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");

  const [logForm, setLogForm] = useState({
    fellowId: "",
    date: new Date().toISOString().split('T')[0],
    status: "present",
    source: "geo",
    checkInTime: "09:00"
  });

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("spaceece_auth_token");
      const res = await fetch(`${API_BASE_URL}/api/mentor/fellows/attendance?from=${fromDate}&to=${toDate}&_t=${Date.now()}`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: "no-store"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch attendance");
      setRecords(data.attendanceRecords || []);
    } catch (err) {
      setToast({ msg: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchFellows = async () => {
    try {
      const token = localStorage.getItem("spaceece_auth_token");
      const res = await fetch(`${API_BASE_URL}/api/mentor/fellows`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setFellows(data.fellows || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchFellows();
  }, []);

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("spaceece_auth_token");
      const res = await fetch(`${API_BASE_URL}/api/mentor/fellows/attendance`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          fellowId: logForm.fellowId,
          date: logForm.date,
          status: logForm.status,
          source: logForm.source,
          checkInTime: logForm.checkInTime,
          checkOutTime: "17:00"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to log attendance");
      
      setToast({ msg: "Attendance logged successfully!", type: "success" });
      setShowLogModal(false);
      fetchAttendance();
    } catch (err) {
      setToast({ msg: err.message, type: "error" });
    }
  };

  const exportCSV = () => {
    if (filteredRecords.length === 0) {
      setToast({ msg: "No records to export.", type: "error" });
      return;
    }

    const headers = ["Fellow Name", "Email", "Date", "Status", "Check-In", "Check-Out", "Location", "Approval"];
    
    const rows = filteredRecords.map(log => [
      `"${log.teacher?.name || "Unknown"}"`,
      `"${log.teacher?.email || "Unknown"}"`,
      new Date(log.attendanceDate).toLocaleDateString(),
      log.status,
      log.checkInTime || "--",
      log.checkOutTime || "--",
      log.latitude && log.longitude ? `"https://www.google.com/maps?q=${log.latitude},${log.longitude}"` : `"No GPS Data"`,
      log.approvalStatus || "pending"
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fellow_attendance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToast({ msg: "CSV Report downloaded successfully!", type: "success" });
  };

  const openDetails = (record) => {
    setActiveDetail(record);
    setShowDetailsModal(true);
  };

  const handleApproval = async (id, status, note = "") => {
    try {
      const token = localStorage.getItem("spaceece_auth_token");
      const res = await fetch(`${API_BASE_URL}/api/mentor/fellows/attendance/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status, note })
      });
      if (!res.ok) throw new Error("Failed to update approval status");
      setToast({ msg: `Record ${status} successfully`, type: "success" });
      setShowRejectModal(false);
      fetchAttendance();
    } catch (err) {
      setToast({ msg: err.message, type: "error" });
    }
  };

  const handleBulkApprove = async () => {
    const pendingIds = filteredRecords.filter(r => (r.approvalStatus || 'pending') === 'pending').map(r => r._id);
    if (pendingIds.length === 0) {
      setToast({ msg: "No pending records to approve in the current view.", type: "info" });
      return;
    }
    if (!window.confirm(`Approve all ${pendingIds.length} pending records in view?`)) return;

    try {
      const token = localStorage.getItem("spaceece_auth_token");
      const res = await fetch(`${API_BASE_URL}/api/mentor/fellows/attendance/bulk-approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ recordIds: pendingIds })
      });
      if (!res.ok) throw new Error("Bulk approval failed");
      setToast({ msg: `${pendingIds.length} records approved successfully!`, type: "success" });
      fetchAttendance();
    } catch (err) {
      setToast({ msg: err.message, type: "error" });
    }
  };

  const uniqueCenters = Array.from(new Set(records.map(r => r.teacher?.teacherProfile?.center?.name).filter(Boolean)));

  const filteredRecords = records.filter(r => {
    const q = search.toLowerCase();
    const name = r.teacher?.name?.toLowerCase() || "";
    const matchesQuery = name.includes(q);
    
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || r.source === sourceFilter;
    const matchesCenter = centerFilter === 'all' || r.teacher?.teacherProfile?.center?.name === centerFilter;

    return matchesQuery && matchesStatus && matchesSource && matchesCenter;
  });

  // Calculate Fellow Analytics for Low Attendance Warning
  const fellowStats = {};
  records.forEach(r => {
    if (!r.teacher) return;
    if (!fellowStats[r.teacher._id]) fellowStats[r.teacher._id] = { name: r.teacher.name, total: 0, present: 0 };
    fellowStats[r.teacher._id].total++;
    if (r.status === 'present') fellowStats[r.teacher._id].present++;
  });
  const lowAttendanceFellows = Object.values(fellowStats).filter(f => f.total > 2 && (f.present / f.total) < 0.85);

  const presentCount = filteredRecords.filter(r => r.status === 'present').length;
  const absentCount = filteredRecords.filter(r => r.status === 'absent' || r.status === 'late').length;
  const geoCount = filteredRecords.filter(r => r.source === 'geo').length;

  return (
    <div className="flex-1 min-h-screen flex flex-col space-y-6">
      
      {/* TOP BAR HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">Fellow Attendance</h1>
          </div>

          <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 shadow-sm">
                  <i className="fa-regular fa-calendar text-orange-500 mr-2"></i>
                  <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>

              {/* Primary Action Button */}
              <button onClick={() => setShowLogModal(true)} className="flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 transition-all transform active:scale-95">
                  <i className="fa-solid fa-plus text-xs"></i>
                  <span>Log Attendance</span>
              </button>
          </div>
      </header>

      {/* ALERTS */}
      {lowAttendanceFellows.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start space-x-3 shadow-sm">
              <i className="fa-solid fa-triangle-exclamation text-rose-500 text-lg mt-0.5"></i>
              <div>
                  <h4 className="text-sm font-bold text-rose-800">Low Attendance Alert</h4>
                  <p className="text-xs text-rose-600 mt-1">
                      {lowAttendanceFellows.length} fellow(s) have an attendance rate below 85% in the selected period: 
                      <span className="font-semibold ml-1">
                          {lowAttendanceFellows.map(f => `${f.name} (${Math.round((f.present/f.total)*100)}%)`).join(', ')}
                      </span>
                  </p>
              </div>
          </div>
      )}

      {/* METRIC CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Fellows</span>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <i className="fa-solid fa-user-group text-lg"></i>
                  </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">{fellows.length}</span>
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
              </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Present Today</span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <i className="fa-solid fa-user-check text-lg"></i>
                  </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">{presentCount}</span>
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{filteredRecords.length ? Math.round((presentCount/filteredRecords.length)*100) : 0}% Rate</span>
              </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Absent / Leave</span>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <i className="fa-solid fa-user-xmark text-lg"></i>
                  </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">{absentCount}</span>
                  <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{filteredRecords.length ? Math.round((absentCount/filteredRecords.length)*100) : 0}% Rate</span>
              </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Geo-Verified</span>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <i className="fa-solid fa-location-dot text-lg"></i>
                  </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">{geoCount}</span>
                  <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">GPS Active</span>
              </div>
          </div>
      </section>

      {/* SEARCH AND FILTERS BAR */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Search Field */}
              <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <i className="fa-solid fa-magnifying-glass text-sm"></i>
                  </div>
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search fellows by name..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
              </div>

              {/* Filter Controls Group */}
              <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                      <span className="text-[10px] text-slate-500 font-bold px-1 uppercase tracking-wider">From</span>
                      <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer" />
                      <span className="text-slate-300">|</span>
                      <span className="text-[10px] text-slate-500 font-bold px-1 uppercase tracking-wider">To</span>
                      <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer" />
                  </div>

                  {uniqueCenters.length > 0 && (
                      <select value={centerFilter} onChange={e => setCenterFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[150px]">
                          <option value="all">All Centers</option>
                          {uniqueCenters.map(center => (
                              <option key={center} value={center}>{center}</option>
                          ))}
                      </select>
                  )}

                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                      <option value="all">All Statuses</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                  </select>

                  <button onClick={exportCSV} className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors active:scale-95">
                      <i className="fa-solid fa-file-csv text-emerald-600 text-sm"></i>
                      <span>Export CSV</span>
                  </button>
              </div>
          </div>
      </section>

      {/* ATTENDANCE LOGS TABLE CARD */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex-1 flex flex-col justify-between">
          <div>
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                      <h2 className="text-base font-bold text-slate-900">Attendance Logs</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Showing real-time records submitted by fellows & mentors</p>
                  </div>
                  <div className="flex items-center space-x-2">
                      <button onClick={handleBulkApprove} className="flex items-center space-x-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors active:scale-95">
                          <i className="fa-solid fa-check-double"></i>
                          <span>Approve All</span>
                      </button>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                          Live Sync Active
                      </span>
                  </div>
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                              <th className="py-3.5 px-6">Fellow Name</th>
                              <th className="py-3.5 px-6">Date</th>
                              <th className="py-3.5 px-6">Check In / Out</th>
                              <th className="py-3.5 px-6">Status & Approval</th>
                              <th className="py-3.5 px-6">Location</th>
                              <th className="py-3.5 px-6 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                          {loading ? (
                            <tr><td colSpan="7" className="py-8 text-center text-slate-400">Loading...</td></tr>
                          ) : filteredRecords.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="py-12 text-center text-slate-400">
                                    <i className="fa-solid fa-clipboard-question text-3xl mb-2 block"></i>
                                    No attendance logs match your search criteria.
                                </td>
                            </tr>
                          ) : filteredRecords.map(log => (
                            <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-4 px-6">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs shadow-xs">
                                            {log.teacher?.name?.charAt(0).toUpperCase() || "U"}
                                        </div>
                                        <div>
                                            <span className="font-semibold text-slate-900 block capitalize">{log.teacher?.name || "Unknown"}</span>
                                            <span className="text-xs text-slate-400 font-normal">{log.teacher?.email || ""}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-slate-600 font-medium">
                                    {new Date(log.attendanceDate).toLocaleDateString()}
                                </td>
                                <td className="py-4 px-6">
                                    <div className="text-xs">
                                        <div className="text-slate-800"><i className="fa-regular fa-clock text-slate-400 mr-1"></i> In: {log.checkInTime || "--"}</div>
                                        <div className="text-slate-400 mt-0.5">Out: {log.checkOutTime || "--"}</div>
                                    </div>
                                </td>
                                <td className="py-4 px-6 flex flex-col items-start gap-1">
                                    {log.status === 'present' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                                            Present
                                        </span>
                                    )}
                                    {log.status === 'late' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                                            Late
                                        </span>
                                    )}
                                    {log.status === 'absent' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
                                            Absent
                                        </span>
                                    )}

                                    {/* Approval Status Badge */}
                                    {(!log.approvalStatus || log.approvalStatus === 'pending') && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                                            <i className="fa-solid fa-hourglass-half mr-1"></i> Pending
                                        </span>
                                    )}
                                    {log.approvalStatus === 'approved' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                                            <i className="fa-solid fa-circle-check mr-1"></i> Approved
                                        </span>
                                    )}
                                    {log.approvalStatus === 'rejected' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 uppercase tracking-wider" title={log.approvalNote}>
                                            <i className="fa-solid fa-circle-xmark mr-1"></i> Rejected
                                        </span>
                                    )}
                                </td>

                                <td className="py-4 px-6 text-slate-500 text-xs">
                                    {log.latitude && log.longitude ? (
                                        <AddressDisplay lat={log.latitude} lon={log.longitude} />
                                    ) : (
                                        <span className="text-slate-400 italic">No GPS Data</span>
                                    )}
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <div className="flex items-center justify-end space-x-1">
                                        {(!log.approvalStatus || log.approvalStatus === 'pending') && (
                                            <>
                                                <button onClick={() => handleApproval(log._id, 'approved')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                                                    <i className="fa-solid fa-check"></i>
                                                </button>
                                                <button onClick={() => { setRejectId(log._id); setShowRejectModal(true); }} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Reject / Request Correction">
                                                    <i className="fa-solid fa-xmark"></i>
                                                </button>
                                                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                            </>
                                        )}
                                        <button onClick={() => openDetails(log)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="View Verification Details">
                                            <i className="fa-solid fa-eye text-sm"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>


      </section>

      {/* LOG ATTENDANCE MODAL */}
      {showLogModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
                  <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between">
                      <h3 className="font-bold text-base flex items-center space-x-2">
                          <i className="fa-solid fa-clipboard-user"></i>
                          <span>Log Fellow Attendance</span>
                      </h3>
                      <button onClick={() => setShowLogModal(false)} className="text-white/80 hover:text-white text-lg">
                          <i className="fa-solid fa-xmark"></i>
                      </button>
                  </div>
                  
                  <form onSubmit={handleLogSubmit} className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Fellow</label>
                          <select required value={logForm.fellowId} onChange={e => setLogForm({...logForm, fellowId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none">
                              <option value="">-- Select --</option>
                              {fellows.map(f => (
                                <option key={f._id} value={f._id}>{f.name}</option>
                              ))}
                          </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date</label>
                              <input type="date" required value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status</label>
                              <select required value={logForm.status} onChange={e => setLogForm({...logForm, status: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none">
                                  <option value="present">Present</option>
                                  <option value="absent">Absent</option>
                              </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                          <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Check-in Time</label>
                              <input type="time" value={logForm.checkInTime} onChange={e => setLogForm({...logForm, checkInTime: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
                          </div>
                      </div>

                      <div className="pt-3 flex justify-end space-x-3">
                          <button type="button" onClick={() => setShowLogModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancel</button>
                          <button type="submit" className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-orange-500/20">Save Attendance</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && activeDetail && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                  <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                      <h3 className="font-bold text-sm flex items-center space-x-2">
                          <i className="fa-solid fa-location-dot text-rose-500"></i>
                          <span>Geo Verification & Log Details</span>
                      </h3>
                      <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-white">
                          <i className="fa-solid fa-xmark text-lg"></i>
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      {activeDetail.source === 'geo' && (
                        <div className="h-44 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden bg-cover bg-center" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.7), rgba(255,255,255,0.7)), url('https://placehold.co/600x300/e2e8f0/64748b?text=GPS+Map+Location+Preview')" }}>
                            <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg animate-bounce">
                                <i className="fa-solid fa-location-dot"></i>
                            </div>
                            <span className="text-xs font-semibold text-slate-700 mt-2 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-sm">Lat: {activeDetail.latitude || "N/A"}, Long: {activeDetail.longitude || "N/A"}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-slate-400 block font-medium">Fellow</span>
                              <span className="font-bold text-slate-800 text-sm">{activeDetail.teacher?.name}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-slate-400 block font-medium">Accuracy</span>
                              <span className="font-bold text-emerald-600 text-sm">{activeDetail.source === 'geo' ? 'High (Within 15 meters)' : 'Manual Entry'}</span>
                          </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                          <span className="text-slate-400 block font-medium">Verification Method</span>
                          <span className="font-semibold text-slate-800">
                            {activeDetail.source === 'geo' ? 'Geo-Fencing Automatic Check-In' : 
                             activeDetail.source === 'manual' ? 'Manual Entry by Mentor' : 'QR Scan Verification'}
                          </span>
                      </div>

                      <div className="flex justify-end">
                          <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800">Close Details</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                  <div className="px-6 py-4 bg-rose-500 text-white flex items-center justify-between">
                      <h3 className="font-bold text-sm flex items-center space-x-2">
                          <i className="fa-solid fa-ban"></i>
                          <span>Reject Attendance</span>
                      </h3>
                      <button onClick={() => setShowRejectModal(false)} className="text-white/80 hover:text-white">
                          <i className="fa-solid fa-xmark text-lg"></i>
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reason for Rejection (Optional)</label>
                          <textarea 
                              value={rejectNote} 
                              onChange={e => setRejectNote(e.target.value)} 
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none min-h-[80px]"
                              placeholder="e.g., GPS location doesn't match center..."
                          ></textarea>
                      </div>
                      <div className="flex justify-end space-x-2 pt-2">
                          <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50">Cancel</button>
                          <button onClick={() => handleApproval(rejectId, 'rejected', rejectNote)} className="px-4 py-2 bg-rose-500 text-white text-xs font-semibold rounded-xl hover:bg-rose-600">Confirm Rejection</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
