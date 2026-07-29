import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpenCheck,
  FileUp,
  Plus,
  Sparkles,
  CheckCircle2,
  FileText,
  MoreVertical,
  Code,
  Bot,
  Send,
  FileSpreadsheet,
  Check,
  UploadCloud,
  Cpu,
  X,
  Search,
  Trash2
} from 'lucide-react';
import { getMentorCurriculum, uploadCurriculumBulk, addCurriculumTopic, deleteCurriculumTopic, publishCurriculumPlan } from '../services/api';

function SearchableTeacherSelect({ Teachers, selectedTeacher, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTeachers = [
    { _id: 'all', name: 'All Teachers (Bulk Assign)', subject: 'Broadcast to everyone' },
    ...Teachers.filter(f => (f.name || "").toLowerCase().includes(searchTerm.toLowerCase()))
  ];

  return (
    <div ref={dropdownRef} className="relative w-64 text-left">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-100 border border-slate-300 text-sm font-medium rounded-xl px-4 py-2.5 cursor-pointer flex justify-between items-center transition hover:bg-slate-200"
      >
        <span className="truncate text-slate-700">
          {selectedTeacher ? `Teacher: ${selectedTeacher.name}` : "Select Teacher"}
        </span>
        <span className="text-slate-400 text-xs ml-2">▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-2" />
              <input
                type="text"
                placeholder="Search Teacher..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto">
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map(Teacher => (
                <div
                  key={Teacher._id || Teacher.id || Math.random()}
                  className="px-4 py-2 text-sm hover:bg-amber-50 cursor-pointer text-slate-700 font-medium border-b border-slate-50 last:border-0"
                  onClick={() => { onChange(Teacher); setIsOpen(false); setSearchTerm(""); }}
                >
                  {Teacher.name || "Unknown Teacher"}
                </div>
              ))
            ) : (
              <div className="px-4 py-4 text-sm text-slate-400 text-center">No Teachers found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherCurriculumTab({ user }) {
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [curriculumPlan, setCurriculumPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [newTopicPhase, setNewTopicPhase] = useState("");
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicDesc, setNewTopicDesc] = useState("");
  const [splitType, setSplitType] = useState("4-semesters");
  const [expandedTopic, setExpandedTopic] = useState(null);

  const assignedTeachers = user?.mentorProfile?.assignedTeachers || [];

  const toggleBulkModal = () => setShowBulkUploadModal(!showBulkUploadModal);
  const toggleAddModal = () => setShowAddTopicModal(!showAddTopicModal);

  useEffect(() => {
    fetchCurriculum();
  }, [selectedTeacher, assignedTeachers.length]);

  const fetchCurriculum = async () => {
    try {
      setLoading(true);
      const data = await getMentorCurriculum();
      if (data && data.success && data.curriculum) {
        let activePlan = null;
        if (selectedTeacher) {
          const TeacherId = selectedTeacher._id || selectedTeacher.id;
          activePlan = data.curriculum.find(p => p.assignedTeacher === TeacherId);
        } else if (data.curriculum.length > 0) {
          activePlan = data.curriculum[0];
          // Auto-select the Teacher for this plan
          const Teacher = assignedTeachers.find(f => (f._id || f.id) === activePlan.assignedTeacher);
          if (Teacher) {
             // We do not call setSelectedTeacher here directly to avoid loops, 
             // we just let the UI show the active plan if selectedTeacher is null,
             // or we set it if we want to force the top dropdown to match.
             setTimeout(() => setSelectedTeacher(Teacher), 0);
          }
        }
        setCurriculumPlan(activePlan || null);
      } else {
        setCurriculumPlan(null);
      }
    } catch (err) {
      console.error("Failed to fetch curriculum", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      alert("Please select an Excel or CSV file first.");
      return;
    }
    if (!selectedTeacher) {
      alert("Please select a Teacher from the top dropdown first.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("TeacherId", selectedTeacher._id || selectedTeacher.id);
      formData.append("splitType", splitType);

      const data = await uploadCurriculumBulk(formData);
      if (data && data.success) {
        setCurriculumPlan(data.plan);
        toggleBulkModal();
        setUploadFile(null);
      }
    } catch (err) {
      console.error("Failed to process bulk upload", err);
    }
  };

  const handleAddTopic = async () => {
    if (!newTopicPhase || !newTopicTitle) {
      alert("Please fill in Week and Topic Title");
      return;
    }
    if (!selectedTeacher) {
      alert("Please select a Teacher from the dropdown.");
      return;
    }
    if (!curriculumPlan) {
      alert("No curriculum exists for this Teacher yet. Please bulk upload an Excel file first to generate their schedule.");
      return;
    }
    try {
      const data = await addCurriculumTopic({
        planId: curriculumPlan._id,
        phaseId: newTopicPhase,
        title: newTopicTitle,
        description: newTopicDesc
      });
      if (data && data.success) {
        setCurriculumPlan(data.plan);
        toggleAddModal();
        setNewTopicTitle("");
        setNewTopicDesc("");
      }
    } catch (err) {
      console.error("Failed to add topic", err);
    }
  };

  const handleDeleteTopic = async (phaseId, topicId) => {
    if (!window.confirm("Are you sure you want to delete this topic?")) return;
    try {
      const data = await deleteCurriculumTopic(curriculumPlan._id, phaseId, topicId);
      if (data && data.success) {
        setCurriculumPlan(data.plan);
      }
    } catch (err) {
      console.error("Failed to delete topic", err);
    }
  };

  const handlePublish = async () => {
    try {
      const data = await publishCurriculumPlan(curriculumPlan._id);
      if (data && data.success) {
        setCurriculumPlan({ ...curriculumPlan, status: 'published' });
        alert("Curriculum Published & Sent to Teacher Successfully!");
      }
    } catch (err) {
      console.error("Failed to publish", err);
      alert("Failed to publish curriculum.");
    }
  };

  const totalPhases = curriculumPlan?.phases?.length || 0;
  const overallProgress = totalPhases > 0 ? Math.round((1 / totalPhases) * 100) : 0;
  
  const totalTopicsCount = curriculumPlan?.phases?.reduce((acc, p) => acc + p.topics.length, 0) || 0;

  return (
    <div className="animate-in fade-in duration-300 w-full">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpenCheck className="text-amber-600 w-7 h-7" /> Curriculum Planner
          </h1>
          <p className="text-slate-500 text-sm mt-1">Schedule, auto-split bulk data using AI, and assign to Teachers.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Assign Target Select */}
          <SearchableTeacherSelect 
            Teachers={assignedTeachers} 
            selectedTeacher={selectedTeacher} 
            onChange={setSelectedTeacher} 
          />

          <div className="flex items-center gap-2">


            <button 
              onClick={toggleAddModal}
              className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md transition h-[42px]"
            >
              <Plus className="w-4 h-4" /> Add Manual Topic
            </button>
          </div>
        </div>
      </div>

      {/* MAIN DASHBOARD CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT 2 COLUMNS: WEEKLY SCHEDULE DASHBOARD */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Smart Assistant Alert / Status Banner */}
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                <Sparkles className="w-6 h-6 text-yellow-300" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">AI Smart Curriculum Generator</h3>
                <p className="text-orange-200 text-sm">Upload an Excel file and let AI auto-generate a 6-week roadmap.</p>
              </div>
            </div>
            <button 
              onClick={toggleBulkModal}
              className="bg-white text-amber-700 hover:bg-slate-100 font-bold px-4 py-2 text-sm rounded-xl transition whitespace-nowrap"
            >
              Auto-Split
            </button>
          </div>

          {/* TIMELINE / WEEKS ACCORDION LIST */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center p-8 text-slate-500">Loading curriculum schedule...</div>
            ) : curriculumPlan && curriculumPlan.phases && curriculumPlan.phases.length > 0 ? (
              curriculumPlan.phases.map((phase) => (
                <div key={phase._id || phase.phaseNumber} className={`bg-white border ${phase.phaseNumber > 1 ? 'border-dashed border-amber-200' : 'border-slate-200'} rounded-2xl p-5 shadow-sm space-y-4`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                    <div className="flex items-center gap-3">
                      {curriculumPlan.durationType === "1-phase" ? (
                        <span className={`bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full`}>Direct Assign</span>
                      ) : (
                        <span className={`bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full`}>{phase.semester || `Phase ${phase.phaseNumber}`}</span>
                      )}
                      <h2 className="font-bold text-slate-800">{phase.title}</h2>
                    </div>
                    {phase.phaseNumber === 1 ? (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Assigned
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1 w-fit">
                        <Bot className="w-3.5 h-3.5" /> AI Suggested
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {phase.topics.map((topic, idx) => (
                      <div key={topic._id || idx} className="group flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition relative">
                        <div 
                          className="flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer w-full gap-3"
                          onClick={() => setExpandedTopic(expandedTopic === topic._id ? null : topic._id)}
                        >
                          <div className="flex items-center gap-3 pr-8 w-full">
                            <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                            <div className="w-full">
                              <p className="text-sm font-semibold text-slate-800">{topic.title}</p>
                              {expandedTopic !== topic._id && (
                                <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-md mt-0.5">{topic.description || "Click to view details..."}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 mt-1 sm:mt-0" onClick={(e) => e.stopPropagation()}>
                            <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-1 rounded">Scheduled: Mon</span>
                            <div className="relative group/menu">
                              <button className="p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none"><MoreVertical className="w-4 h-4" /></button>
                              <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 overflow-hidden">
                                <button onClick={() => handleDeleteTopic(phase._id, topic._id)} className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium">
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {expandedTopic === topic._id && (
                          <div className="mt-3 pt-3 border-t border-slate-200 text-sm text-slate-600 bg-white p-4 rounded-xl shadow-sm animate-in slide-in-from-top-2 duration-200">
                             <h4 className="font-bold text-slate-800 mb-2 text-xs uppercase tracking-wider">Work Details / Description</h4>
                             <p className="whitespace-pre-wrap leading-relaxed">{topic.description || "No detailed description provided."}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {phase.phaseNumber > 1 && curriculumPlan?.status !== 'published' && (
                    <div className="flex justify-end pt-2">
                      <button 
                        onClick={handlePublish}
                        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                      >
                        <Send className="w-4 h-4" /> Publish & Send to Teacher
                      </button>
                    </div>
                  )}
                  {phase.phaseNumber > 1 && curriculumPlan?.status === 'published' && (
                    <div className="flex justify-end pt-2">
                      <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold px-4 py-2 bg-emerald-50 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" /> Published
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="text-slate-500 font-medium">No Curriculum Plan Found</p>
                <p className="text-slate-400 text-sm mt-1">Upload a syllabus file to automatically generate a schedule.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 1 COLUMN: SIDEBAR SUMMARY & PREVIEW */}
        <div className="space-y-6">
          
          {/* Teacher Progress Summary */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-base">Assignee Overview</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                {selectedTeacher ? (selectedTeacher.name?.substring(0, 2).toUpperCase() || 'SF') : 'SF'}
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-800">{selectedTeacher ? selectedTeacher.name : "Select a Teacher"}</p>
                <p className="text-xs text-slate-500">{selectedTeacher ? (selectedTeacher.subject || "Teacher") : "No Teacher Selected"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-500">Overall Progress</span>
                <span className="text-slate-800 font-bold">{overallProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-600 h-full rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }}></div>
              </div>
            </div>
          </div>

          {/* Bulk Data Raw Source Preview */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Source Data File</h3>
              <button 
                onClick={toggleBulkModal}
                className="text-xs text-amber-700 font-semibold hover:bg-amber-100 flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg border-0 shadow-none transition"
                style={{ border: 'none', outline: 'none' }}
              >
                <FileUp className="w-3 h-3" /> Upload New
              </button>
            </div>
            {(curriculumPlan?.sourceFileName || curriculumPlan?.title === "AI Generated Course Schedule (Bulk)") ? (
              <a 
                href={`/${curriculumPlan?.sourceFileUrl || "CS_Full_Syllabus_2026.xlsx"}`} 
                download={curriculumPlan?.sourceFileName || "CS_Full_Syllabus_2026.xlsx"}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-100 transition cursor-pointer block !no-underline"
                style={{ textDecoration: 'none' }}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 text-green-700 p-2 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate !m-0 !mb-0.5" style={{ color: '#1e293b', textDecoration: 'none' }}>
                      {curriculumPlan?.sourceFileName || "CS_Full_Syllabus_2026.xlsx"}
                    </p>
                    <p className="text-xs text-slate-500 !m-0" style={{ color: '#64748b', textDecoration: 'none' }}>
                      Click to download syllabus
                    </p>
                  </div>
                </div>
              </a>
            ) : (
              <button 
                onClick={toggleBulkModal}
                className="w-full p-3 bg-slate-50 rounded-xl border-2 border-dashed border-amber-300 flex items-center justify-center gap-2 hover:bg-amber-50 transition text-amber-700 font-semibold text-sm shadow-none"
                style={{ outline: 'none' }}
              >
                <UploadCloud className="w-5 h-5" /> Upload Source File
              </button>
            )}
            <p className="text-xs text-slate-500">AI has split {totalTopicsCount > 0 ? totalTopicsCount : 20} topics from this file into {totalPhases > 0 ? totalPhases : 4} weeks.</p>
          </div>

        </div>

      </div>

      {/* MODAL: BULK UPLOAD & AI DIVIDER */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Sparkles className="text-amber-600 w-5 h-5" /> AI Smart Bulk Curriculum Import
              </h3>
              <button onClick={toggleBulkModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Assign to Teacher:</label>
                <SearchableTeacherSelect 
                  Teachers={assignedTeachers} 
                  selectedTeacher={selectedTeacher} 
                  onChange={setSelectedTeacher} 
                />
              </div>

              {/* Dropzone */}
            <label className="border-2 border-dashed border-amber-200 rounded-2xl p-6 text-center bg-amber-50/50 hover:bg-amber-50 transition cursor-pointer block">
              <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => setUploadFile(e.target.files[0])} />
              <UploadCloud className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">{uploadFile ? uploadFile.name : "Drag and drop your Excel or CSV file here"}</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Supports .xlsx, .xls, .csv</p>
              <a 
                href="/Curriculum_Template.xlsx" 
                download="Curriculum_Template.xlsx"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-50 transition shadow-sm !no-underline"
                style={{ textDecoration: 'none' }}
              >
                <FileText className="w-3.5 h-3.5" /> Download Template
              </a>
            </label>

            {/* AI Prompt Setup */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">AI Schedule Preference:</label>
              <select 
                value={splitType}
                onChange={(e) => setSplitType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-sm rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="4-semesters">Divide evenly across 4 Semesters (1-Year Plan)</option>
                <option value="4-weeks">Divide evenly across 4 Weeks (Intensive)</option>
                <option value="direct">Direct Assign (All in one phase)</option>
              </select>
            </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={toggleBulkModal} 
                className="px-4 py-2 text-sm text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkUpload} 
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition"
              >
                <Cpu className="w-4 h-4" /> Read & Divide with AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD MANUAL TOPIC */}
      {showAddTopicModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Plus className="text-amber-600 w-5 h-5" /> Add Manual Topic
              </h3>
              <button onClick={toggleAddModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Assign to Teacher:</label>
                <SearchableTeacherSelect 
                  Teachers={assignedTeachers} 
                  selectedTeacher={selectedTeacher} 
                  onChange={setSelectedTeacher} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Select Week / Phase</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-300 text-sm rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={newTopicPhase}
                  onChange={(e) => setNewTopicPhase(e.target.value)}
                >
                  <option value="">-- Select Week --</option>
                  {curriculumPlan?.phases?.map(p => (
                    <option key={p._id} value={p._id}>Week {p.phaseNumber}: {p.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Topic Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Advanced Linked Lists" 
                  className="w-full bg-slate-50 border border-slate-300 text-sm rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Description / Est. Time</label>
                <input 
                  type="text" 
                  placeholder="e.g. 2 Hours" 
                  className="w-full bg-slate-50 border border-slate-300 text-sm rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={newTopicDesc}
                  onChange={(e) => setNewTopicDesc(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={toggleAddModal} className="px-4 py-2 text-sm text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition">
                Cancel
              </button>
              <button onClick={handleAddTopic} className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition">
                Add Topic
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
