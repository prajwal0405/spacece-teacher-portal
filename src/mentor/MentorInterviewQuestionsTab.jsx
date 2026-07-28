import React, { useState, useEffect, useMemo } from 'react';
import { getUmangInterviewQuestions } from '../services/api';
import { SectionCard, SearchBar } from '../components/Shared';

export default function MentorInterviewQuestionsTab() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const data = await getUmangInterviewQuestions();
        if (data) {
          setQuestions(data);
        }
      } catch (error) {
        console.error("Failed to fetch questions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const filteredQuestions = useMemo(() => {
    return questions.filter(item => {
      const matchesCat = categoryFilter === 'All' || item.category === categoryFilter;
      const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [questions, categoryFilter, searchQuery]);

  return (
    <div style={{ animation: "fadeIn 0.3s ease", padding: "16px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <SectionCard title="Interview Question Bank">
        <p style={{ fontSize: "14px", color: "#64748b", marginTop: "-8px", marginBottom: "20px" }}>
          Practice questions for mock interviews and career readiness preparation.
        </p>

        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "250px" }}>
            <SearchBar 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search question bank..."
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: "10px 16px",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              outline: "none",
              fontSize: "14px",
              minWidth: "200px"
            }}
          >
            <option value="All">All Categories</option>
            <option value="Personal & Motivation">Personal & Motivation</option>
            <option value="Competency & Behavioural">Competency & Behavioural</option>
            <option value="Technical & ECE">Technical & ECE</option>
            <option value="Leadership & Values">Leadership & Values</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>Loading questions...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredQuestions.map((q, idx) => (
              <div key={q._id || idx} style={{
                background: "white",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "flex-start",
                gap: "16px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "#eef2ff",
                  color: "#4338ca",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  flexShrink: 0
                }}>
                  {q.questionId}
                </div>
                <div>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#92400e",
                    background: "#fffbeb",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid #fde68a",
                    display: "inline-block",
                    marginBottom: "8px"
                  }}>
                    {q.category}
                  </span>
                  <p style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#0f172a",
                    margin: 0,
                    lineHeight: "1.5"
                  }}>
                    {q.question}
                  </p>
                </div>
              </div>
            ))}
            {filteredQuestions.length === 0 && !loading && (
              <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>No questions found.</div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
