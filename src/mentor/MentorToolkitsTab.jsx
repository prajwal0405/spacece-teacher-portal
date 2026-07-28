import React, { useState, useEffect } from 'react';
import { getUmangGraduateDimensions } from '../services/api';
import { SectionCard } from '../components/Shared';

export default function MentorToolkitsTab() {
  const [dimensions, setDimensions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDimensions = async () => {
      try {
        const data = await getUmangGraduateDimensions();
        if (data) {
          setDimensions(data);
        }
      } catch (error) {
        console.error("Failed to fetch dimensions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDimensions();
  }, []);

  return (
    <div style={{ animation: "fadeIn 0.3s ease", padding: "16px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <SectionCard title="Semester 4 Toolkits & Graduate Rubrics">
        <p style={{ fontSize: "14px", color: "#64748b", marginTop: "-8px", marginBottom: "20px" }}>
          Assessing fellows across the five core graduate dimensions.
        </p>

        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>Loading rubrics...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {dimensions.map((item, idx) => (
              <div key={item._id || idx} style={{ 
                background: "white", 
                padding: "20px", 
                borderRadius: "12px", 
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}>
                <span style={{ 
                  fontSize: "12px", 
                  fontWeight: "bold", 
                  textTransform: "uppercase", 
                  letterSpacing: "0.05em", 
                  color: "#d97706", 
                  backgroundColor: "#fef3c7", 
                  padding: "4px 10px", 
                  borderRadius: "4px" 
                }}>
                  {item.dimension} Rubric
                </span>
                <p style={{ 
                  fontSize: "13px", 
                  color: "#334155", 
                  fontWeight: "500", 
                  lineHeight: "1.6", 
                  marginTop: "12px" 
                }}>
                  {item.attribute}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
