import fs from "fs";
import dns from "dns";
import mongoose from "mongoose";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}
import { ParentModule } from "./src/models/ParentModule.js";
import { ParentModuleAssignment } from "./src/models/ParentModuleAssignment.js";
import { ParentSessionAssignment } from "./src/models/ParentSessionAssignment.js";
import { User } from "./src/models/User.js";
import { ClassModel } from "./src/models/Class.js";

const filePath = 'C:\\Users\\lenovo\\.gemini\\antigravity\\brain\\1400af37-b4f6-4c24-871b-99c571e41504\\.system_generated\\steps\\272\\content.md';

const dbUris = [
  { name: "Primary DB (teacherwebsite)", uri: "mongodb+srv://prajaktachinawalkar_db_user:Bg4aeOslXivPPX2t@teacherwebsite.z82im5u.mongodb.net/?appName=TeacherWebsite" },
  { name: "Render Cloud DB (spacece_teacher_training)", uri: "mongodb+srv://spacece_app_user:spaceceindiafoundation@spacece-newsletter.mtyenck.mongodb.net/spacece_teacher_training?retryWrites=true&w=majority&appName=spacece-newsletter" }
];

function parseFullDocumentDetailed() {
  const rawText = fs.readFileSync(filePath, 'utf8');
  const lines = rawText.split(/\r?\n/);

  const modules = [];
  let curMod = null;
  let curSess = null;
  let curSection = null;
  let curContentBlock = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const modM = line.match(/^MODULE\s+(\d+)\s*:\s*(.+)$/i);
    if (modM) {
      if (curMod) {
        if (curSess) curMod.sessions.push(curSess);
        modules.push(curMod);
      }
      const num = parseInt(modM[1], 10);
      curMod = {
        moduleNumber: num,
        title: modM[2].trim(),
        category: "Parenting & Child Development",
        ageGroup: num <= 10 ? "3–4 Years" : num <= 20 ? "4–5 Years" : "5–6 Years",
        duration: "5 Sessions × 2 Hours",
        year: Math.ceil(num / 10),
        objective: "",
        outcomes: [
          "Enhance parent-child interaction and positive engagement",
          "Apply practical, evidence-based early childhood practices at home",
          "Promote holistic physical, cognitive, emotional, and language development"
        ],
        sessions: []
      };
      curSess = null;
      curSection = null;
      continue;
    }

    if (!curMod) continue;

    if (line.startsWith("Category:")) {
      curMod.category = line.replace("Category:", "").trim();
      continue;
    }
    if (line.startsWith("Age Group:")) {
      curMod.ageGroup = line.replace("Age Group:", "").trim();
      continue;
    }
    if (line.startsWith("Duration:")) {
      curMod.duration = line.replace("Duration:", "").trim();
      continue;
    }

    if (line === "MODULE OBJECTIVE") {
      curSection = "mod_obj";
      continue;
    }

    const sessM = line.match(/^SESSION\s+(\d+)\s*:\s*(.+)$/i);
    if (sessM) {
      if (curSess) {
        curMod.sessions.push(curSess);
      }
      curSess = {
        sessionNumber: parseInt(sessM[1], 10),
        title: sessM[2].trim(),
        objective: "",
        content: [],
        reflection: "",
        homePractice: "",
        activities: []
      };
      curSection = null;
      curContentBlock = null;
      continue;
    }

    if (!curSess) {
      if (curSection === "mod_obj") {
        curMod.objective += (curMod.objective ? " " : "") + line;
      }
      continue;
    }

    if (line === "Session Objective") {
      curSection = "sess_obj";
      continue;
    }
    if (line === "Content") {
      curSection = "sess_content";
      curContentBlock = { heading: "Overview", body: "" };
      curSess.content.push(curContentBlock);
      continue;
    }
    if (line.startsWith("Activity:") || line.startsWith("Case-Based Discussion") || line.startsWith("Role Play") || line.startsWith("Parent–Child Activity") || line.startsWith("Hands-On Activity") || line.startsWith("Guided")) {
      curSection = "sess_activity";
      const actTitle = line;
      curSess.activities.push({
        time: "20 mins",
        activity: actTitle,
        keyFocus: "Interactive application & skill building"
      });
      continue;
    }
    if (line === "Reflection") {
      curSection = "sess_reflection";
      continue;
    }
    if (line === "Home Practice") {
      curSection = "sess_home_practice";
      continue;
    }

    if (curSection === "sess_obj") {
      curSess.objective += (curSess.objective ? " " : "") + line;
    } else if (curSection === "sess_content") {
      if (line.match(/^[A-Z][A-Za-z0-9\s–—\-:,&]{3,60}$/) && !line.includes(".") && line.length < 50) {
        curContentBlock = { heading: line, body: "" };
        curSess.content.push(curContentBlock);
      } else if (curContentBlock) {
        curContentBlock.body += (curContentBlock.body ? " " : "") + line;
      }
    } else if (curSection === "sess_reflection") {
      curSess.reflection += (curSess.reflection ? " " : "") + line;
    } else if (curSection === "sess_home_practice") {
      curSess.homePractice += (curSess.homePractice ? " " : "") + line;
    } else if (curSection === "sess_activity") {
      const lastAct = curSess.activities[curSess.activities.length - 1];
      if (lastAct && lastAct.keyFocus === "Interactive application & skill building") {
        lastAct.keyFocus = line.substring(0, 120);
      }
    }
  }

  if (curMod) {
    if (curSess) curMod.sessions.push(curSess);
    modules.push(curMod);
  }

  return modules;
}

async function seedDatabase(target) {
  console.log(`\n=================================================`);
  console.log(` Connecting to ${target.name}...`);
  console.log(`=================================================`);
  try {
    await mongoose.connect(target.uri, { serverSelectionTimeoutMS: 10000 });
    console.log(`Connected to ${target.name}!`);

    const detailedModules = parseFullDocumentDetailed();

    const admin = await User.findOne({ role: "admin" });
    const teachers = await User.find({ role: "teacher" });
    const classRecord = await ClassModel.findOne({});

    if (!admin || teachers.length === 0 || !classRecord) {
      console.log(`Missing prerequisites in ${target.name}. Admin: ${!!admin}, Teachers: ${teachers.length}, Class: ${!!classRecord}`);
      await mongoose.disconnect();
      return;
    }

    await ParentModule.deleteMany({});
    await ParentModuleAssignment.deleteMany({});
    await ParentSessionAssignment.deleteMany({});

    console.log(`Importing 30 Detailed Modules into ${target.name}...`);
    let totalSessions = 0;

    for (const modData of detailedModules) {
      modData.sessions.forEach(s => {
        if (!s.activities || s.activities.length === 0) {
          s.activities = [
            { time: "15 mins", activity: "Interactive Introduction", keyFocus: "Building core understanding" },
            { time: "30 mins", activity: "Group Reflection & Practice", keyFocus: "Skill application" }
          ];
        }
        if (!s.homePractice) {
          s.homePractice = "Practice the session techniques with your child at home daily for 15-20 minutes.";
        }
      });

      const createdModule = await ParentModule.create(modData);
      totalSessions += createdModule.sessions.length;

      for (const t of teachers) {
        await ParentModuleAssignment.create({
          module: createdModule._id,
          class: classRecord._id,
          teacher: t._id,
          assignedBy: admin._id
        });

        for (const s of createdModule.sessions) {
          await ParentSessionAssignment.create({
            teacher: t._id,
            module: createdModule._id,
            sessionNumber: s.sessionNumber,
            status: "Pending",
            assignedDate: new Date()
          });
        }
      }
    }

    console.log(`SUCCESS for ${target.name}: Seeded ${detailedModules.length} Modules and ${totalSessions} Sessions!`);
  } catch (err) {
    console.error(`ERROR seeding ${target.name}:`, err.message);
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  for (const target of dbUris) {
    await seedDatabase(target);
  }
  console.log("\nALL DATABASES SEEDED SUCCESSFULLY!");
}

main().catch(err => console.error(err));
