const fs = require('fs');
const pdca = `

export function submitPDCAPlan(menteeId, plan, cycleNumber, planTitle) {
  return request("/api/mentor/tracking/pdca", {
    method: "POST",
    body: JSON.stringify({ menteeId, plan, cycleNumber, planTitle })
  });
}

export function submitPDCACheck(cycleId, checkText) {
  return request(\`/api/mentor/tracking/pdca/\${cycleId}/check\`, {
    method: "PATCH",
    body: JSON.stringify({ checkFeedback: checkText })
  });
}

export function getMyPDCACycles() {
  return request("/api/teacher/growth-cycles");
}

export function submitPDCADo(cycleId, doText) {
  return request(\`/api/teacher/growth-cycles/\${cycleId}/do\`, {
    method: "POST",
    body: JSON.stringify({ doText })
  });
}

export function submitPDCAAct(cycleId, actText) {
  return request(\`/api/teacher/growth-cycles/\${cycleId}/act\`, {
    method: "POST",
    body: JSON.stringify({ actText })
  });
}
`;
fs.appendFileSync('src/services/api.js', pdca, 'utf8');
