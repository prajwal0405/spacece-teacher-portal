const fs = require('fs');
let content = fs.readFileSync('src/pages/TeacherDashboard.jsx', 'utf8');
const tabContent = fs.readFileSync('src/pages/GrowthCycleTab.js', 'utf8');

content = content.replace('import { updateTeacherNotificationPreference', 'import { getMyPDCACycles, submitPDCADo, submitPDCAAct } from \"../services/api\";\nimport { updateTeacherNotificationPreference');
content = content.replace('export default function TeacherDashboard', tabContent + '\n\nexport default function TeacherDashboard');

content = content.replace('{ key: \"training\",      label: t(\"Training & Lessons\"),  icon: \"🎓\" },', '{ key: \"training\",      label: t(\"Training & Lessons\"),  icon: \"🎓\" },\n    { key: \"growth_cycle\", label: \"Growth Cycle\", icon: \"🔄\" },');

content = content.replace('case \"training\":      return <TrainingAndClassroomManager user={enrichedUser}/>;', 'case \"training\":      return <TrainingAndClassroomManager user={enrichedUser}/>;\n      case \"growth_cycle\":  return <GrowthCycleTab setToast={setToast} />;');

fs.writeFileSync('src/pages/TeacherDashboard.jsx', content, 'utf8');
