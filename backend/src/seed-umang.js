import mongoose from "mongoose";
import dotenv from "dotenv";
import { UmangCurriculumMonth, UmangGraduateDimension, UmangCapstoneTrack, UmangInterviewQuestion } from "./models/UmangData.js";

dotenv.config();

const MONTHS_DATA = [
  {
    id: 19,
    theme: "Leadership Identity",
    focus: "Leadership philosophy, values, adaptive leadership",
    deliverable: "Leadership Manifesto + Journal Vol.4",
    weeks: "Weeks 73–76",
    color: "bg-indigo-50 border-indigo-200 text-indigo-700",
    badge: "bg-indigo-600 text-white",
    keyQuestion: "What kind of leader have I become, and what kind of leader do I want to be?",
    objectives: [
      "Write a personal Leadership Manifesto (1,500 words).",
      "Identify 3–5 core personal values tied to field decisions.",
      "Apply Heifetz Adaptive Leadership model to field scenarios.",
      "Practise servant leadership & mentor junior fellows.",
      "Reflect on ethical dilemmas & build an ethical framework."
    ],
    facilitatorNote: "This month is deeply personal. Create space for emotion, silence, and uncertainty. Do not impose a rigid template for Manifestos; offer scaffolding."
  },
  {
    id: 20,
    theme: "Capstone Implementation",
    focus: "Project execution, milestones, community engagement",
    deliverable: "Monthly Capstone Progress Report",
    weeks: "Weeks 77–80",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    badge: "bg-emerald-600 text-white",
    keyQuestion: "How do I turn my innovative ECE project design into sustainable community action?",
    objectives: [
      "Execute Gantt chart milestones & manage budget/risks.",
      "Collect baseline data using standardized ECE tools.",
      "Hold formal community launch & stakeholder meetings.",
      "Conduct peer site visits & track early intervention results.",
      "Complete mid-point course correction check with APM."
    ],
    facilitatorNote: "Capstone is the fellowship's pinnacle contribution. Ensure fellows build community co-ownership from day one to avoid dependency."
  },
  {
    id: 21,
    theme: "Systems Influence",
    focus: "Policy, government, NGO, grant writing",
    deliverable: "Policy Brief or Partnership Proposal",
    weeks: "Weeks 81–84",
    color: "bg-amber-50 border-amber-200 text-amber-700",
    badge: "bg-amber-600 text-white",
    keyQuestion: "How can I influence the broader system that shapes children's lives?",
    objectives: [
      "Study NEP 2020, NIPUN Bharat, ICDS, and ECCE frameworks.",
      "Engage CDPOs, BEOs, or Lady Supervisors with field data.",
      "Master grant proposal writing across 3 structured sessions.",
      "Draft a 2-4 page actionable Policy Brief.",
      "Build strategic networks across ECE NGOs, CSR, and government."
    ],
    facilitatorNote: "Government stakeholder meetings require careful preparation. Role-play these conversations in cluster meets before field visits."
  },
  {
    id: 22,
    theme: "Career Readiness",
    focus: "Resume, portfolio, LinkedIn, mock interviews",
    deliverable: "Complete Professional Portfolio",
    weeks: "Weeks 85–88",
    color: "bg-purple-50 border-purple-200 text-purple-700",
    badge: "bg-purple-600 text-white",
    keyQuestion: "How do I translate 24 months of rich community impact into professional career growth?",
    objectives: [
      "Craft a quantified UMANG STAR-formatted resume.",
      "Optimize LinkedIn profile & publish field insights.",
      "Conduct mock interviews using the 30-question bank.",
      "Assemble 7-part comprehensive Leadership Portfolio.",
      "Understand development sector salary benchmarks & negotiation."
    ],
    facilitatorNote: "Schedule at least 2 formal mock interviews per fellow—one peer and one external panel. Pay attention to opening 60 seconds."
  },
  {
    id: 23,
    theme: "Capstone Completion",
    focus: "M&E, data analysis, documentation, scaling",
    deliverable: "Final Capstone Report",
    weeks: "Weeks 89–92",
    color: "bg-blue-50 border-blue-200 text-blue-700",
    badge: "bg-blue-600 text-white",
    keyQuestion: "How do I distill my project results into credible proof and community legacy?",
    objectives: [
      "Execute endline data collection and statistical analysis.",
      "Document 2 rich narrative human transformation case studies.",
      "Host a 90-minute Community Validation sharing session.",
      "Formulate a Scaling & Replication guide with budget templates.",
      "Publish full 11-section Final Capstone Report."
    ],
    facilitatorNote: "Honest data showing modest results is far more valuable than inflated numbers. Help fellows embrace complexity in data."
  },
  {
    id: 24,
    theme: "Graduation & Transition",
    focus: "Portfolio review, alumni pledge, ceremony",
    deliverable: "Leadership Portfolio + Certification",
    weeks: "Weeks 93–96",
    color: "bg-rose-50 border-rose-200 text-rose-700",
    badge: "bg-rose-600 text-white",
    keyQuestion: "What do I leave behind, and who will I be as an active UMANG alumnus?",
    objectives: [
      "Complete 60-minute structured Exit Interview.",
      "Formulate a personal 2-Year Post-Fellowship Career Roadmap.",
      "Participate in 4-Day Residential Final Leadership Summit.",
      "Present Capstone at Innovation Showcase & Career Fair.",
      "Sign Alumni Pledge and receive SpacECE ECE Certification."
    ],
    facilitatorNote: "Build the alumni network infrastructure early. The network is only as strong as the first cohort's commitment to it."
  }
];

const GRADUATE_DIMENSIONS = [
  { dimension: "Character", attribute: "Grounded, ethically committed, resilient, empathetic, and deeply aware of power and privilege." },
  { dimension: "Competence", attribute: "Skilled in ECE pedagogy, data analysis, project management, stakeholder engagement, and professional communication." },
  { dimension: "Community", attribute: "Trusted by families and communities, capable of mobilising collective action around child wellbeing." },
  { dimension: "Career", attribute: "Ready to enter the workforce as an educator, social entrepreneur, policy researcher, or community development professional." },
  { dimension: "Contribution", attribute: "Committed to the ECE ecosystem — mentoring future fellows, sharing knowledge publicly, and advocating for systemic change." }
];

const CAPSTONE_TRACKS = [
  {
    id: "educator",
    name: "Educator Track",
    focus: "Curriculum & Pedagogy Innovation",
    example: "‘Mitti aur Rang’ — soil/colour sensory play curriculum for 2-4 yr olds in Pune Rural; ‘Kahani Ghar’ story library.",
    outcome: "Replicable curriculum module or TLM kit with evidence of learning outcome improvement."
  },
  {
    id: "entrepreneur",
    name: "Entrepreneur Track",
    focus: "Social Venture Design & Pilot",
    example: "‘Khel Ki Dukaan’ toy lending coop; ‘Maa Sikhe’ WhatsApp parent learning; AWC material renovation.",
    outcome: "Documented social venture model with pilot evidence, cost data, and replication guide."
  },
  {
    id: "policy",
    name: "Policy Track",
    focus: "Research, Evidence & Advocacy",
    example: "Mapping ICDS convergence gaps in Pune Urban slums; Parent awareness of NEP 2020 provisions.",
    outcome: "Field-based research report and policy brief submitted to relevant government or civil society actors."
  }
];

const SAMPLE_INTERVIEW_QUESTIONS = [
  { id: 1, cat: "Personal & Motivation", q: "Tell me about yourself and your journey into early childhood education." },
  { id: 2, cat: "Personal & Motivation", q: "Why did you choose to join the UMANG Fellowship?" },
  { id: 3, cat: "Personal & Motivation", q: "What is your greatest professional strength and area for improvement?" },
  { id: 4, cat: "Competency & Behavioural", q: "Tell me about a time you had to adapt your approach because your original plan failed." },
  { id: 5, cat: "Competency & Behavioural", q: "Describe a situation where you had to influence someone with more authority than you." },
  { id: 6, cat: "Competency & Behavioural", q: "Give an example of how you used data to change your approach or make a decision." },
  { id: 7, cat: "Technical & ECE", q: "What is your understanding of the NEP 2020 ECCE framework?" },
  { id: 8, cat: "Technical & ECE", q: "How do you assess young children's learning without formal written testing?" },
  { id: 9, cat: "Technical & ECE", q: "Explain the SPACE framework and how you applied it in HAALS home visits." },
  { id: 10, cat: "Leadership & Values", q: "What is your personal leadership philosophy?" },
  { id: 11, cat: "Leadership & Values", q: "How do you make ethical decisions when community values conflict with rules?" },
  { id: 12, cat: "Leadership & Values", q: "What does sustainability mean to you in community-led initiatives?" }
];

async function seedData() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Clearing existing UMANG data...");
    await UmangCurriculumMonth.deleteMany({});
    await UmangGraduateDimension.deleteMany({});
    await UmangCapstoneTrack.deleteMany({});
    await UmangInterviewQuestion.deleteMany({});

    console.log("Inserting UMANG Curriculum Months...");
    for (const month of MONTHS_DATA) {
      await UmangCurriculumMonth.create({
        monthId: month.id,
        theme: month.theme,
        focus: month.focus,
        deliverable: month.deliverable,
        weeks: month.weeks,
        color: month.color,
        badge: month.badge,
        keyQuestion: month.keyQuestion,
        objectives: month.objectives,
        facilitatorNote: month.facilitatorNote
      });
    }

    console.log("Inserting UMANG Graduate Dimensions...");
    for (const dim of GRADUATE_DIMENSIONS) {
      await UmangGraduateDimension.create(dim);
    }

    console.log("Inserting UMANG Capstone Tracks...");
    for (const track of CAPSTONE_TRACKS) {
      await UmangCapstoneTrack.create({
        trackId: track.id,
        name: track.name,
        focus: track.focus,
        example: track.example,
        outcome: track.outcome
      });
    }

    console.log("Inserting UMANG Interview Questions...");
    for (const q of SAMPLE_INTERVIEW_QUESTIONS) {
      await UmangInterviewQuestion.create({
        questionId: q.id,
        cat: q.cat,
        q: q.q
      });
    }

    console.log("Seed complete successfully.");
  } catch (error) {
    console.error("Seed failed:", error);
  } finally {
    process.exit();
  }
}

seedData();
