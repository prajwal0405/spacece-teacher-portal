const fs = require('fs');
const path = require('path');

const newContent = `export function getPDCACycles() {
  return request("/api/mentor/tracking/pdca");
}
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

const filePath = path.join(__dirname, 'src', 'services', 'api.js');
const content = fs.readFileSync(filePath, 'utf8');

const startIndex = content.indexOf('export function getPDCACycles() {');
if (startIndex !== -1) {
  const newApiContent = content.substring(0, startIndex) + newContent;
  fs.writeFileSync(filePath, newApiContent, 'utf8');
  console.log("Successfully patched api.js");
} else {
  console.log("Could not find getPDCACycles in api.js");
}
