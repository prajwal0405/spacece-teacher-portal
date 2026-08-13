const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'services', 'api.js');
let content = fs.readFileSync(filePath, 'utf8');

// The problematic appended section started with '// --- NEW PDCA FUNCTIONAL SPEC ENDPOINTS ---'
const marker = '// --- NEW PDCA FUNCTIONAL SPEC ENDPOINTS ---';
const idx = content.indexOf(marker);

if (idx !== -1) {
  content = content.substring(0, idx); // Strip it out
}

const correctApiCode = `// --- NEW PDCA FUNCTIONAL SPEC ENDPOINTS ---
export function submitPDCAPlanDraft(data) {
  return request("/api/mentor/tracking/pdca/draft", { method: "POST", body: JSON.stringify(data) });
}
export function updatePDCAPlanDraft(id, data) {
  return request(\`/api/mentor/tracking/pdca/\${id}/plan\`, { method: "PATCH", body: JSON.stringify(data) });
}
export function publishPDCAPlan(id) {
  return request(\`/api/mentor/tracking/pdca/\${id}/publish\`, { method: "PATCH", body: JSON.stringify({}) });
}
export function savePDCACheckDraft(id, data) {
  return request(\`/api/mentor/tracking/pdca/\${id}/check/draft\`, { method: "PATCH", body: JSON.stringify(data) });
}
export function submitPDCACheck(id, data) {
  return request(\`/api/mentor/tracking/pdca/\${id}/check/submit\`, { method: "PATCH", body: JSON.stringify(data) });
}

export function getMyPDCACycles() {
  return request("/api/teacher/growth-cycle");
}
export function savePDCADoDraft(id, data) {
  return request(\`/api/teacher/growth-cycle/\${id}/do/draft\`, { method: "PATCH", body: JSON.stringify(data) });
}
export function submitPDCADo(id, data) {
  return request(\`/api/teacher/growth-cycle/\${id}/do/submit\`, { method: "PATCH", body: JSON.stringify(data) });
}
export function savePDCAActDraft(id, data) {
  return request(\`/api/teacher/growth-cycle/\${id}/act/draft\`, { method: "PATCH", body: JSON.stringify(data) });
}
export function submitPDCAAct(id, data) {
  return request(\`/api/teacher/growth-cycle/\${id}/act/submit\`, { method: "PATCH", body: JSON.stringify(data) });
}
`;

content += correctApiCode;
fs.writeFileSync(filePath, content, 'utf8');
console.log("Fixed api.js");
