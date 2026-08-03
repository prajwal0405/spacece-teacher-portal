// Prajwal start
import { useState, useEffect } from "react";
import { SectionCard, S, Badge, StatusBadge } from "../components/Shared";
import { generateAIChildFeedback, submitChildFeedback } from "../services/api";

/* ─────────────────────────────────────────
   Child Dashboard — Module 1
   (Child Profile & Assessment)
   Spec ref: Teacher_Portal_Functional_Spec.pdf
   Section 2 — Child Profile & Assessment
   3 tabs: Child Profile / Child Assessment / Activity Suggestions
───────────────────────────────────────── */
const RATING_FULL = ["Can't do", "1", "2", "3", "Does Independently"];
const RATING_NO_INDEPENDENT = ["Can't do", "1", "2", "3"];

const SECTIONS = [
  {
    id: "gross_fine_motor",
    number: "1",
    title: "Gross & Fine Motor Skills",
    items: [
      {
        id: "1.1",
        text: "Walks up and down stairs with alternating feet",
        activities: [
          "Stair Climbing Practice — Set up a safe, low staircase and encourage alternating feet while supervising.",
          "Step-Up Game — Step up and down on a sturdy step or platform, alternating feet each time.",
          "Obstacle Course — Include stairs in a simple course, prompting alternating feet.",
        ],
      },
      {
        id: "1.2",
        text: "Runs smoothly and stops without falling",
        activities: [
          'Run and Stop Game — Run back and forth, calling out "Stop!" to practice halting smoothly.',
          "Chase the Ball — Roll or toss a ball and have the child run after it, then stop quickly.",
          "Follow-the-Leader — Run behind you, mimicking actions including smooth stops.",
        ],
      },
      {
        id: "1.3",
        text: "Jumps forward with both feet leaving the ground",
        activities: [
          "Jumping over a Line — Jump forward over a drawn line, increasing distance over time.",
          "Animal Jumps — Pretend to be frogs or kangaroos, jumping forward with both feet.",
          "Obstacle Course — Jump over small objects to get past each obstacle.",
        ],
      },
      {
        id: "1.4",
        text: "Pedals a tricycle or ride-on toy",
        activities: [
          "Tricycle Riding Practice — Practice pedaling on a smooth, flat area.",
          "Obstacle Course with Ride-On Toy — Pedal around cones or markers.",
          "Race to a Target — Pedal to reach a target placed at a distance.",
        ],
      },
      {
        id: "1.5",
        text: "Begins catching a ball with hands (not just trapping it against body)",
        activities: [
          "Toss and Catch — Gently toss a soft ball at short distances, catching with hands.",
          "Bounce and Catch — Catch the ball after one bounce.",
          "Catch with a Partner — Toss back and forth, gradually increasing distance and timing.",
        ],
      },
      {
        id: "1.6",
        text: "Uses crayons or pencil with good control",
        activities: [
          "Drawing Shapes — Draw simple shapes like circles, squares, triangles with control.",
          "Coloring Pictures — Color inside the lines on large, simple designs.",
          "Tracing Activities — Trace dotted lines to build fine motor control.",
        ],
      },
      {
        id: "1.7",
        text: "Builds a tower of 6 or more blocks",
        activities: [
          "Block Stacking Challenge — Stack blocks as high as possible, aiming for 6+.",
          "Tower Building with Different Shapes — Experiment with different block shapes and arrangements.",
          "Block Balance Game — Take turns adding blocks without the tower falling.",
        ],
      },
      {
        id: "1.8",
        text: "Turns book pages one at a time",
        activities: [
          "Page Turning Practice — Use a sturdy board book, turning one page at a time.",
          "Story Time with Instructions — Prompt page turns at the right moments in a story.",
          "Interactive Book with Flaps — Open flaps or turn pages one at a time together.",
        ],
      },
    ],
  },
  {
    id: "cognitive",
    number: "2",
    title: "Cognitive Development",
    items: [
      {
        id: "2.1",
        text: "Engages in more complex pretend play (e.g., acts out stories with toys)",
        activities: [
          'Pretend Kitchen Play — "Cook" and serve meals, acting out a story with toys.',
          "Animal Role Play — Create a story where animal figurines talk and interact.",
          "Dollhouse Play — Act out daily activities like feeding, dressing, and bedtime.",
        ],
      },
      {
        id: "2.2",
        text: "Completes 5-6 piece puzzles or shape sorters",
        activities: [
          "Shape Sorting Challenge — Practice placing shapes into matching slots independently.",
          "Progressive Puzzles — Start with 2-3 piece puzzles and gradually work up to 5-6 pieces.",
        ],
      },
      {
        id: "2.3",
        text: 'Understands concepts of "Big" and "Small"',
        ratingScale: RATING_NO_INDEPENDENT,
        activities: [
          "Sorting Objects by Size — Sort objects into big and small groups, discussing differences.",
          "Big and Small Game — Identify which of two objects is big and which is small.",
          "Story with Size Comparison — Point out big vs. small characters/objects in a story.",
        ],
      },
      {
        id: "2.4",
        text: 'Can follow multi-step instructions (e.g., "Pick up your shoes and put them in the closet")',
        activities: [
          'Clean-Up Game — Follow two-step instructions like "pick up toys and put them in the basket."',
          "Treasure Hunt — Follow two or three steps to find and bring an item.",
          "Toy Organization — Sort blocks by color into different containers in sequence.",
        ],
      },
      {
        id: "2.5",
        text: "Recognizes and names some colors and shapes",
        activities: [
          "Color/Shape Sorting — Sort objects by color or shape, naming each as you go.",
          "Treasure Hunt — Find items of a named color or shape around the room.",
          "Shape & Color Matching Cards — Match cards showing the same color or shape.",
        ],
      },
      {
        id: "2.6",
        text: "Matches objects to pictures (e.g., matches a cup to a picture of a cup)",
        activities: [
          "Object and Picture Matching Cards — Match real objects to cards showing the same object.",
          "Picture-Object Hunt — Find the real object in the room matching a shown picture.",
          "Storybook Object Matching — Point to a pictured object and find its match nearby.",
        ],
      },
      {
        id: "2.7",
        text: 'Starts understanding time concepts (e.g., "Today", "Tomorrow", "Soon")',
        activities: [
          'Daily Routine Discussion — Use time words like "soon" and "later" during daily activities.',
          "Calendar Exploration — Explain today, tomorrow, and the days of the week on a calendar.",
          "Story Time with Time Concepts — Discuss when events happen in a story.",
        ],
      },
    ],
  },
  {
    id: "social_emotional",
    number: "3",
    title: "Social-Emotional Development",
    items: [
      {
        id: "3.1",
        text: "Shows empathy (e.g., may try to comfort a crying friend or doll)",
        activities: [
          'Comforting a Doll — Comfort a "sad" doll with a toy, hug, or kind words.',
          "Helping a Friend — Notice when a peer is upset and offer help.",
          "Empathy Storytelling — Discuss how a story character feels and how to help.",
        ],
      },
      {
        id: "3.2",
        text: "Engages in cooperative play with peers (shares, takes turns)",
        activities: [
          "Turn-Taking Game — Roll a ball back and forth, taking turns.",
          "Building Together — Build something together with a peer using blocks.",
          "Sharing Toys — Share and take turns with a toy during playtime.",
        ],
      },
      {
        id: "3.3",
        text: "Imitates adults and peers in play and everyday actions (e.g., pretending to cook)",
        activities: [
          "Pretend Cooking — Imitate stirring and serving in a pretend kitchen.",
          "Role-Playing with Dolls — Imitate feeding, bedtime, and talking to dolls.",
          "Imitate Chores — Imitate sweeping or dusting with a small broom.",
        ],
      },
      {
        id: "3.4",
        text: 'Follows simple social rules (e.g., waiting in line, saying "Please" and "Thank you")',
        activities: [
          "Playing Waiting Games — Wait for a turn during a rolling or swing game.",
          'Practice Saying "Please" and "Thank You" — Use polite words during snack or play.',
          'Social Role-Play — Practice "excuse me" and "may I please" in pretend store/restaurant play.',
        ],
      },
      {
        id: "3.5",
        text: "Begins to show interest in making friends",
        activities: [
          "Playdate Interaction — Greet a friend, share toys, and engage in simple activities together.",
          "Cooperative Play — Build a tower or complete a puzzle together with another child.",
          "Group Storytime — Sit with peers and discuss the story together.",
        ],
      },
      {
        id: "3.6",
        text: "May have fears or anxiety about specific things (e.g., darkness, loud noises)",
        activities: [
          "Nighttime Routine Practice — Comforting bedtime routine with soft lighting or a nightlight.",
          "Desensitization to Loud Noises — Gradually increase volume of a sound with reassurance.",
          "Comforting Reassurance — Acknowledge fears and offer comforting words or actions.",
        ],
      },
      {
        id: "3.7",
        text: "Expresses a wider range of emotions and uses words to express feelings",
        activities: [
          "Emotion Charades — Act out emotions and discuss how each one feels.",
          "Feelings Books — Discuss characters' feelings and the child's own feelings.",
          "Emotion Cards — Pick a card matching how they feel at different moments.",
        ],
      },
    ],
  },
  {
    id: "language",
    number: "4",
    title: "Language Development",
    items: [
      {
        id: "4.1",
        text: "Uses 3-4 word sentences consistently",
        activities: [
          "Sentence Building with Toys — Form 3-4 word sentences about toy scenarios.",
          "Prompted Conversations — Answer open-ended questions with 3-4 word sentences.",
          "Storytelling with Pictures — Describe pictures using 3-4 word sentences.",
        ],
      },
      {
        id: "4.2",
        text: "Has a vocabulary of 200+ words",
        activities: [
          "Interactive Reading — Point to and name objects, animals, and people in books.",
          "Labeling Everyday Items — Label objects and actions around the house.",
          "Sing Songs and Nursery Rhymes — Sing along and fill in missing words.",
        ],
      },
      {
        id: "4.3",
        text: "Names familiar people and objects (family members and favorite toys)",
        activities: [
          "Family Photo Book — Name each family member or toy from photos.",
          "Interactive Toy Play — Name favorite toys and identify family members in play.",
          "Name Recognition Game — Point to or bring the correct named person or toy.",
        ],
      },
      {
        id: "4.4",
        text: 'Asks simple "Why" and "What" questions',
        activities: [
          'Storytime Q&A — Ask and prompt "what" and "why" questions during reading.',
          "Explore Cause and Effect — Ask questions based on cause-and-effect observations.",
          "Daily Routine Discussions — Prompt questions during everyday activities.",
        ],
      },
      {
        id: "4.5",
        text: 'Follows multi-step directions (e.g., "Get your shoes and come to the door")',
        activities: [
          'Treasure Hunt — "Find your toy car and bring it to me."',
          'Clean-Up Time — "Pick up the blocks and put them in the basket."',
          'Obstacle Course — "Walk to the chair, pick up the ball, and bring it back."',
        ],
      },
      {
        id: "4.6",
        text: "Can state own name and age",
        activities: [
          "Name and Age Song — Sing a song including the child's name and age.",
          'Interactive Mirror Play — Ask "Who is that?" and "How old are you?" in front of a mirror.',
          "Family Introduction Game — Introduce themselves with name and age at gatherings.",
        ],
      },
      {
        id: "4.7",
        text: 'Uses pronouns (e.g., "He", "She", "It") correctly',
        activities: [
          'Doll Play — Refer to dolls using pronouns like "He is happy."',
          'Picture Book Pronouns — Ask "Who is she?" or "What is he doing?" about pictures.',
          "Family Pronouns — Identify people in family photos using pronouns.",
        ],
      },
    ],
  },
  {
    id: "adaptive",
    number: "5",
    title: "Adaptive (Self-Help) Skills",
    items: [
      {
        id: "5.1",
        text: "Fully feeds self with spoon and begins using fork more effectively",
        activities: [
          "Snack Time Practice — Use a spoon and fork with foods like yogurt or mashed potatoes.",
          "Play Kitchen — Practice utensil use while pretending to cook and serve food.",
          "Mealtime Assistance — Use a fork for pasta or cut-up fruit with minimal help.",
        ],
      },
      {
        id: "5.2",
        text: "Drinks from a cup without spilling",
        activities: [
          "Cup Practice with Water — Take small sips while holding the cup steady.",
          "Cup Challenge Game — Carry a cup of water from one spot to another without spilling.",
          "Meal Time Practice — Drink independently from a small, spill-proof cup.",
        ],
      },
      {
        id: "5.3",
        text: "Begins to dress and undress with minimal help",
        activities: [
          "Dress-Up Play — Put on and take off a jacket or shirt with minimal assistance.",
          'Interactive Clothing Game — "Find the sleeves" or "put your feet in the pants."',
          "Morning Routine Practice — Try putting on socks, shoes, or pants during dressing.",
        ],
      },
      {
        id: "5.4",
        text: "Participates in toilet training and stays dry for longer periods",
        activities: [
          "Regular Bathroom Breaks — Sit on the potty at regular intervals with positive reinforcement.",
          "Potty Training Books — Read books about using the toilet and staying dry.",
          "Reward System — Use a sticker chart to celebrate dry periods or potty successes.",
        ],
      },
      {
        id: "5.5",
        text: "Brushes teeth with some assistance",
        activities: [
          "Brush Together — Brush teeth alongside the child, demonstrating the motions.",
          "Toothbrush Play — Demonstrate brushing on a toy or doll first.",
          "Sing a Toothbrush Song — Guide their hand while singing a brushing song.",
        ],
      },
      {
        id: "5.6",
        text: "Helps in simple household tasks (e.g., cleaning up toys, helping set the table)",
        activities: [
          "Toy Clean-Up Time — Put toys back into bins or baskets, with praise for each task.",
          "Setting the Table — Place napkins, cups, or utensils on the table.",
          "Wipe Down Surfaces — Wipe tables, counters, or low shelves with a cloth.",
        ],
      },
      {
        id: "5.7",
        text: "Washes and dries hands independently",
        activities: [
          "Hand-Washing Routine — Turn on the tap, apply soap, scrub 20 seconds, and rinse.",
          "Pretend Play with Water — Practice the steps with a toy sink or doll.",
          "Hand Drying Practice — Dry hands properly with their own small towel.",
        ],
      },
    ],
  },
  {
    id: "sensory_regulation",
    number: "6",
    title: "Sensory and Emotional Regulation",
    items: [
      {
        id: "6.1",
        text: "Adjusts to change in routine with minimal upset",
        activities: [
          "Visual Schedule — Review a picture schedule of the day's activities.",
          "Role-Playing Changes — Practice routine changes with toys or dolls.",
          "Practice Transitions — Give a warning before moving between activities.",
        ],
      },
      {
        id: "6.2",
        text: "Can play alone for short periods (10-15 minutes)",
        activities: [
          "Independent Puzzle Play — Complete a simple puzzle without adult intervention.",
          "Drawing or Coloring — Color or draw independently with you nearby.",
          "Building Blocks — Build towers or structures alone.",
        ],
      },
      {
        id: "6.3",
        text: "Enjoys sensory activities (e.g., finger painting, playing with playdough)",
        activities: [
          "Finger Painting — Explore colors and textures with washable paints.",
          "Playdough Exploration — Mold, squish, and shape playdough with tools.",
          "Sensory Bins — Scoop and pour rice, sand, or water beads with small toys.",
        ],
      },
      {
        id: "6.4",
        text: "Manages frustration better, though may still have tantrums when upset",
        activities: [
          'Deep Breathing Exercises — Practice "smell a flower, blow out a candle" breathing.',
          "Emotion Cards or Books — Identify emotions and appropriate ways to express frustration.",
          "Calm-Down Corner — Use a cozy space with pillows and soothing toys to self-regulate.",
        ],
      },
      {
        id: "6.5",
        text: 'Begins to verbalize emotions (e.g., "I am mad", "I am happy")',
        activities: [
          "Emotion Flashcards — Identify facial expressions and match them to feelings.",
          "Feelings Chart — Point to or say which emotion they are feeling each day.",
          "Storytelling with Emotions — Discuss how characters feel and share their own feelings.",
        ],
      },
    ],
  },
];


const OVERALL_OPTIONS = [
  { value: "on_track", label: "On Track (49 – 72)" },
  { value: "slight_delay", label: "Slight Delay (25 – 48) — provide details below" },
  { value: "significant_delay", label: "Significant Delay (1 – 24) — provide details below" },
  { value: "other", label: "Other" },
];

function scoreOf(rating) {
  if (rating === "Can't do") return 0;
  if (rating === "Does Independently") return 4;
  if (rating === "1" || rating === "2" || rating === "3") return Number(rating);
  return null;
}
const ASSESSMENT_DOMAINS = [
  "Cognitive",
  "Language",
  "Literacy",
  "Numeracy",
  "Social-Emotional",
  "Physical & Motor Skills",
  "Creativity",
  "School Readiness",
];

const ASSESSMENT_STAGES = ["Baseline", "Midline", "Endline"];

/* TODO(backend): replace with real API calls once the Activity Engine
   endpoints from the DB/UI Integration Spec are wired up:
   - GET child profile          -> /children/:id
   - GET assessments            -> /children/:id/assessments
   - GET activity_recommendations joined with activities
   For now this renders with empty/placeholder state so the screen and
   flow can be reviewed before the backend contract lands. */

function ChildProfileTab({ child, editing, setEditing, form, setForm, onSave, saving }) {
  const field = (label, key, type = "text") => (
    <div>
      <label style={S.label}>{label}</label>
      {editing ? (
        type === "textarea" ? (
          <textarea
            style={{ ...S.input, height: 70, resize: "vertical" }}
            value={form[key] || ""}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        ) : (
          <input
            type={type}
            style={S.input}
            value={form[key] || ""}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        )
      ) : (
        <div style={{ fontSize: 13, color: "#374151", padding: "8px 0" }}>{form[key] || "Not added"}</div>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionCard title="Basic Information">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={S.label}>Child ID</label>
            <div style={{ fontSize: 13, color: "#9ca3af", padding: "8px 0" }}>{child.id}</div>
          </div>
          {field("Full Name", "name")}
          {field("Date of Birth", "dob", "date")}
          <div>
            <label style={S.label}>Age</label>
            <div style={{ fontSize: 13, color: "#374151", padding: "8px 0" }}>
              {form.dob ? Math.floor((Date.now() - new Date(form.dob)) / 3.15576e10) + " yrs" : "—"}
            </div>
          </div>
          <div>
            <label style={S.label}>Gender</label>
            {editing ? (
              <select style={S.input} value={form.gender || ""} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select…</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <div style={{ fontSize: 13, color: "#374151", padding: "8px 0" }}>{form.gender || "Not set"}</div>
            )}
          </div>
          {field("Admission Date", "admissionDate", "date")}
          <div>
            <label style={S.label}>Current Level (Milestone-based)</label>
            <div style={{ padding: "8px 0" }}>
              <Badge children="Auto-derived from latest assessment" color="#7c3aed" bg="#ede9fe" />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Additional Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {field("Parent/Guardian Name", "parentName")}
          {field("Contact Number", "contactNumber", "tel")}
          {field("Blood Group", "bloodGroup")}
          {field("Emergency Contact", "emergencyContact")}
        </div>
        {field("Address", "address", "textarea")}
        <div style={{ height: 12 }} />
        {field("Medical Conditions", "medicalConditions", "textarea")}
        <div style={{ height: 12 }} />
        {field("Allergies", "allergies", "textarea")}
        <div style={{ height: 12 }} />
        {field("Special Needs", "specialNeeds", "textarea")}
        <div style={{ height: 12 }} />
        {field("Interests", "interests")}
        <div style={{ height: 12 }} />
        {field("Notes", "notes", "textarea")}
      </SectionCard>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        {editing ? (
          <button onClick={onSave} disabled={saving} style={S.primaryBtn}>
            {saving ? "Saving..." : "💾 Save"}
          </button>
        ) : (
          <button onClick={() => setEditing(true)} style={S.primaryBtn}>
            ✏️ Edit Profile
          </button>
        )}
      </div>
    </div>
  );
}

function computeSectionScores(answers) {
  return SECTIONS.map((section) => {
    let score = 0;
    let max = 0;
    section.items.forEach((item) => {
      const scale = item.ratingScale || RATING_FULL;
      const itemMax = scale.includes("Does Independently") ? 4 : 3;
      max += itemMax;
      const s = scoreOf(answers[item.id]);
      if (s !== null) score += s;
    });
    return { id: section.id, title: section.title, score, max };
  });
}

const PIE_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4"];

function SectionPieChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.score, 0);

  if (total === 0) {
    return (
      <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", border: "1px dashed #cbd5e1", borderRadius: 12 }}>
        Rate at least one item and save the assessment to see the section-wise breakdown.
      </div>
    );
  }

  const cx = 110, cy = 110, radius = 90;
  let cumulative = 0;
  const slices = data
    .filter((d) => d.score > 0)
    .map((d, i) => {
      const fraction = d.score / total;
      const startAngle = cumulative * 2 * Math.PI;
      cumulative += fraction;
      const endAngle = cumulative * 2 * Math.PI;
      const x1 = cx + radius * Math.sin(startAngle);
      const y1 = cy - radius * Math.cos(startAngle);
      const x2 = cx + radius * Math.sin(endAngle);
      const y2 = cy - radius * Math.cos(endAngle);
      const largeArc = fraction > 0.5 ? 1 : 0;
      const path =
        fraction >= 0.999
          ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`
          : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      return { ...d, path, fraction, color: PIE_COLORS[i % PIE_COLORS.length] };
    });

  return (
    <div style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={220} height={220} viewBox="0 0 220 220">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth={2} />
        ))}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color, display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: "#1c1917" }}>{s.title}</span>
            <span style={{ color: "#6b7280" }}>
              {s.score}/{s.max} pts · {Math.round(s.fraction * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChildAssessmentTab({ child, onAssessmentSaved }) {
  const [stage, setStage] = useState("Baseline");
  const [savedAssessments, setSavedAssessments] = useState({});
  const [answers, setAnswers] = useState({});
  const [openActivities, setOpenActivities] = useState({});
  const [overallStatus, setOverallStatus] = useState("");
  const [otherStatusText, setOtherStatusText] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [nextAssessmentDate, setNextAssessmentDate] = useState("");
  const [assessmentDate, setAssessmentDate] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  const storageKey = `assessment_${child?.id}`;

  // Load any previously saved assessments for this child (stand-in for a real API call)
  useEffect(() => {
    if (!child) return;
    try {
      const raw = localStorage.getItem(storageKey);
      console.log("ChildAssessmentTab load raw localStorage:", raw);
      setSavedAssessments(raw ? JSON.parse(raw) : {});
    } catch {
      setSavedAssessments({});
    }
    setStage("Baseline");
  }, [child]); // eslint-disable-line react-hooks/exhaustive-deps

  // Populate the form whenever the stage changes or saved data updates
  useEffect(() => {
    const rec = savedAssessments[stage];
    setAnswers(rec?.answers || {});
    setOverallStatus(rec?.overallStatus || "");
    setOtherStatusText(rec?.otherStatusText || "");
    setRecommendation(rec?.recommendation || "");
    setNextAssessmentDate(rec?.nextAssessmentDate || "");
    setAssessmentDate(rec?.assessmentDate || "");
  }, [stage, savedAssessments]);

  const totalItems = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);
  const answeredCount = Object.keys(answers).length;
  const totalScore = Object.values(answers).reduce((sum, r) => {
    const s = scoreOf(r);
    return sum + (s === null ? 0 : s);
  }, 0);

  const toggleActivities = (id) => setOpenActivities((p) => ({ ...p, [id]: !p[id] }));
  const setAnswer = (id, value) => setAnswers((p) => ({ ...p, [id]: value }));

  const allItemIds = SECTIONS.flatMap((s) => s.items.map((it) => it.id));
  const unansweredIds = allItemIds.filter((id) => !answers[id]);

  const handleSaveAssessment = () => {
    // Validate: all questions must be answered
    if (unansweredIds.length > 0 || !assessmentDate || !overallStatus) {
      setShowValidation(true);
      setSavedMsg("");
      // Scroll to first unanswered item
      const firstMissing = unansweredIds[0] || (!assessmentDate ? "assessment-date" : "");
      const el = document.getElementById(`item-${firstMissing}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setShowValidation(false);
    const sectionScores = computeSectionScores(answers);
    const record = {
      answers,
      overallStatus,
      otherStatusText,
      recommendation,
      nextAssessmentDate,
      assessmentDate,
      sectionScores,
      savedAt: Date.now(),
    };
    const updated = { ...savedAssessments, [stage]: record };
    console.log("ChildAssessmentTab saving updated assessments record:", record);
    setSavedAssessments(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
    // Notify parent to refresh suggestions
    if (onAssessmentSaved) {
      onAssessmentSaved();
    }
    // TODO(backend): POST record to /children/:id/assessments once the endpoint exists
    setSavedMsg(`${stage} assessment saved!`);
    setTimeout(() => setSavedMsg(""), 3000);
  };

  const currentSectionScores = savedAssessments[stage]?.sectionScores || computeSectionScores({});

  const stageBtn = (s) => (
    <button
      key={s}
      onClick={() => setStage(s)}
      style={{
        ...S.exportBtn,
        background: stage === s ? "#1e40af" : "white",
        color: stage === s ? "white" : "#6b7280",
        borderColor: stage === s ? "#1e40af" : "#e5e7eb",
      }}
    >
      {s}
      {savedAssessments[s] && <span style={{ marginLeft: 6 }}>✓</span>}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 8 }}>{ASSESSMENT_STAGES.map(stageBtn)}</div>

      <SectionCard title={`${stage} Assessment`}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div id="item-assessment-date">
            <label style={S.label}>Assessment Date <span style={{ color: "#dc2626" }}>*</span></label>
            <input
              type="date"
              style={{ ...S.input, borderColor: showValidation && !assessmentDate ? "#dc2626" : undefined, boxShadow: showValidation && !assessmentDate ? "0 0 0 2px rgba(220,38,38,0.15)" : undefined }}
              value={assessmentDate}
              onChange={(e) => setAssessmentDate(e.target.value)}
            />
            {showValidation && !assessmentDate && <span style={{ fontSize: 11, color: "#dc2626", marginTop: 4, display: "block" }}>Required</span>}
          </div>
          <div>
            <label style={S.label}>Assessed By</label>
            <div style={{ fontSize: 13, color: "#374151", padding: "8px 0" }}>
              Auto-filled from logged-in teacher
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#1e293b",
            color: "#f1f5f9",
            borderRadius: 10,
            padding: "0.7rem 1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.85rem",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>
            {answeredCount} / {totalItems} items rated
            {unansweredIds.length > 0 && (
              <span style={{ color: "#fbbf24", marginLeft: 8, fontSize: 12 }}>({unansweredIds.length} remaining)</span>
            )}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "#fca5a5", fontSize: 11 }}>All fields are mandatory <span style={{ color: "#ef4444" }}>*</span></span>
            <span>Running score: {totalScore}</span>
          </span>
        </div>
        {showValidation && unansweredIds.length > 0 && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#dc2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            Please rate all {unansweredIds.length} unanswered items before saving. Unanswered items are highlighted in red.
          </div>
        )}

        {SECTIONS.map((section) => (
          <div key={section.id} style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "0.5rem",
                borderBottom: "2px solid #1e293b",
                paddingBottom: "0.4rem",
                marginBottom: "0.8rem",
              }}
            >
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#8a6a4f" }}>
                {section.number}
              </span>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1c1917", margin: 0 }}>
                {section.title} <span style={{ color: "#dc2626", fontSize: 14 }}>*</span>
              </h3>
            </div>

            {section.items.map((item) => {
              const scale = item.ratingScale || RATING_FULL;
              const currentValue = answers[item.id];
              const hasActivities = item.activities?.length > 0;
              const isOpen = !!openActivities[item.id];

              const isUnanswered = showValidation && !currentValue;

              return (
                <div
                  key={item.id}
                  id={`item-${item.id}`}
                  style={{
                    background: isUnanswered ? "#fff5f5" : "white",
                    border: isUnanswered ? "1.5px solid #fca5a5" : "1px solid #e4e2da",
                    borderRadius: 10,
                    padding: "0.9rem 1rem",
                    marginBottom: "0.6rem",
                    boxShadow: isUnanswered ? "0 0 0 2px rgba(220,38,38,0.1)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#1c1917", flex: 1 }}>
                      <span style={{ color: "#8a6a4f", fontWeight: 700 }}>{item.id}</span>{" "}
                      {item.text}
                      <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>
                    </p>
                    {currentValue ? (
                      <span style={{ color: "#5b7a5b", fontWeight: "bold" }}>✓</span>
                    ) : isUnanswered ? (
                      <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 600 }}>Required</span>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {scale.map((option) => {
                      const selected = currentValue === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setAnswer(item.id, option)}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "5px 10px",
                            borderRadius: 999,
                            border: selected ? "1px solid #1e293b" : "1px solid #d8d5cb",
                            background: selected ? "#1e293b" : "#f7f7f5",
                            color: selected ? "#f4f2ec" : "#4b4f45",
                            cursor: "pointer",
                          }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {hasActivities && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => toggleActivities(item.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 11,
                          color: "#8a6a4f",
                          fontWeight: 600,
                          padding: 0,
                        }}
                      >
                        {isOpen ? "Hide" : "Show"} suggested activities {isOpen ? "▲" : "▼"}
                      </button>
                      {isOpen && (
                        <ul style={{ margin: "0.5rem 0 0", paddingLeft: 18, fontSize: 12, color: "#4b4f45", lineHeight: 1.5 }}>
                          {item.activities.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", marginBottom: 8 }}>
            Overall Developmental Progress <span style={{ color: "#dc2626" }}>*</span>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {OVERALL_OPTIONS.map((opt) => (
              <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4b4f45", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="overallStatus"
                  checked={overallStatus === opt.value}
                  onChange={() => setOverallStatus(opt.value)}
                />
                {opt.label}
              </label>
            ))}
            {overallStatus === "other" && (
              <input
                type="text"
                value={otherStatusText}
                onChange={(e) => setOtherStatusText(e.target.value)}
                placeholder="Please specify details"
                style={{ ...S.input, marginTop: 6 }}
              />
            )}
          </div>
          {showValidation && !overallStatus && <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, marginBottom: 8 }}>⚠️ Please select an overall status</div>}

          <label style={S.label}>Recommendations / Next Steps</label>
          <textarea
            style={{ ...S.input, height: 70, resize: "vertical", marginBottom: 12 }}
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            placeholder="Enter recommended activities, therapies, or observations..."
          />

          <label style={S.label}>Next Follow-up Assessment Date</label>
          <input
            type="date"
            style={{ ...S.input, marginBottom: 16 }}
            value={nextAssessmentDate}
            onChange={(e) => setNextAssessmentDate(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button onClick={handleSaveAssessment} style={S.primaryBtn}>
            💾 Save {stage} Assessment
          </button>
          {savedMsg && <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>✓ {savedMsg}</span>}
          {showValidation && unansweredIds.length > 0 && (
            <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 700 }}>
              ⚠️ {unansweredIds.length} unanswered item{unansweredIds.length > 1 ? "s" : ""} — please complete all fields
            </span>
          )}
        </div>
      </SectionCard>

      <SectionCard title="📈 Section-wise Score Breakdown">
        <SectionPieChart data={currentSectionScores} />
      </SectionCard>
    </div>
  );
}
/**
 * Build activity recommendations from the Section-wise Score Breakdown chart.
 * HIGH score → 1-2 suggestions only (child is doing well)
 * LOW score  → MORE suggestions (child needs support)
 */
function buildRecommendationsFromChart(chartScores, answers) {
  return SECTIONS.map((section) => {
    const chartEntry = chartScores.find((cs) => cs.id === section.id);
    if (!chartEntry) return null;

    const pct = chartEntry.max > 0 ? Math.round((chartEntry.score / chartEntry.max) * 100) : 0;

    // HIGH score = fewer suggestions, LOW score = more suggestions
    let maxItems, maxActivitiesPerItem;
    if (pct >= 76) {
      // Doing great — just 1 item, 1 activity
      maxItems = 1;
      maxActivitiesPerItem = 1;
    } else if (pct >= 51) {
      // Good progress — 2 items, 1 activity each
      maxItems = 2;
      maxActivitiesPerItem = 1;
    } else if (pct >= 26) {
      // Needs support — all items, 2 activities each
      maxItems = section.items.length;
      maxActivitiesPerItem = 2;
    } else {
      // Needs strong support — ALL items, ALL activities
      maxItems = section.items.length;
      maxActivitiesPerItem = 3;
    }

    // Sort items by individual score (weakest first)
    const sortedItems = [...section.items].sort((a, b) => {
      const sa = scoreOf(answers[a.id]);
      const sb = scoreOf(answers[b.id]);
      return (sa === null ? -1 : sa) - (sb === null ? -1 : sb);
    });

    const items = sortedItems.slice(0, maxItems).map((item) => ({
      ...item,
      itemScore: scoreOf(answers[item.id]),
      activities: item.activities.slice(0, maxActivitiesPerItem),
    }));

    return {
      sectionId: section.id,
      sectionNumber: section.number,
      title: section.title,
      score: chartEntry.score,
      max: chartEntry.max,
      pct,
      items,
      totalActivities: items.reduce((sum, it) => sum + it.activities.length, 0),
    };
  })
    .filter(Boolean)
    .sort((a, b) => a.pct - b.pct);
}

// Section icons for visual flair
const SECTION_ICONS = {
  gross_fine_motor: "🏃",
  cognitive: "🧠",
  social_emotional: "🤝",
  language: "🗣️",
  adaptive: "🎒",
  sensory_regulation: "🎨",
};
/* ─────────────────────────────────────────
   Teacher-Side AI Feedback Generation
   Freeform notes → AI structuring → teacher
   review/edit → submit to admin.
───────────────────────────────────────── */
const EMPTY_STRUCTURED = { strengths: "", areasNeedingSupport: "", recommendation: "" };

function ChildFeedbackTab({ child }) {
  const [freeformText, setFreeformText] = useState("");
  const [structured, setStructured] = useState(null); // null until AI has generated something
  const [aiProvider, setAiProvider] = useState("local");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Reset local state whenever a different child's profile is opened.
    setFreeformText("");
    setStructured(null);
    setAiProvider("local");
    setGenerating(false);
    setSubmitting(false);
    setError("");
    setSubmitted(false);
  }, [child?.id]);

  const handleGenerate = async () => {
    if (!freeformText.trim()) {
      setError("Please write some observations before generating AI feedback.");
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const res = await generateAIChildFeedback({ childId: child.id, freeformText });
      const fb = res?.feedback;
      if (fb) {
        setStructured({
          strengths: fb.strengths || "",
          areasNeedingSupport: fb.areasNeedingSupport || "",
          recommendation: fb.recommendation || "",
        });
        setAiProvider(fb.provider || "local");
      } else {
        setError("AI did not return a result. Please try again.");
      }
    } catch (err) {
      setError(err?.message || "Failed to generate AI feedback. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!structured) return;
    setError("");
    setSubmitting(true);
    try {
      await submitChildFeedback({
        childId: child.id,
        freeformText,
        strengths: structured.strengths,
        areasNeedingSupport: structured.areasNeedingSupport,
        recommendation: structured.recommendation,
        aiProvider,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err?.message || "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (key, value) => {
    setStructured((prev) => ({ ...(prev || EMPTY_STRUCTURED), [key]: value }));
  };

  const structuredField = (label, key, rows = 4) => (
    <div style={{ marginBottom: 16 }}>
      <label style={S.label}>{label}</label>
      <textarea
        style={{ ...S.input, height: rows * 20, resize: "vertical" }}
        value={structured?.[key] || ""}
        onChange={(e) => updateField(key, e.target.value)}
        disabled={submitted}
      />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {submitted && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "#d1fae5", color: "#065f46", fontWeight: 700, fontSize: 13 }}>
          ✅ Feedback submitted to admin for {child.name}.
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fee2e2", color: "#991b1b", fontWeight: 600, fontSize: 13 }}>
          {error}
        </div>
      )}

      <SectionCard title="Freeform Observations">
        <div style={{ marginBottom: 8 }}>
          <label style={S.label}>Child</label>
          <div style={{ fontSize: 13, color: "#374151", padding: "8px 0", fontWeight: 700 }}>{child.name}</div>
        </div>
        <div>
          <label style={S.label}>Write your observations in any format</label>
          <textarea
            style={{ ...S.input, height: 140, resize: "vertical" }}
            placeholder={`e.g. "${child.name} shared toys with classmates today, but struggled to sit still during story time. Needs more practice with fine motor tasks like buttoning..."`}
            value={freeformText}
            onChange={(e) => setFreeformText(e.target.value)}
            disabled={submitted}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button
            onClick={handleGenerate}
            disabled={generating || submitted || !freeformText.trim()}
            style={{ ...S.primaryBtn, opacity: generating || submitted ? 0.7 : 1 }}
          >
            {generating ? "Generating..." : "🤖 Generate AI Feedback"}
          </button>
        </div>
      </SectionCard>

      {structured && (
        <SectionCard
          title="AI-Structured Feedback — Review & Edit"
          action={<Badge children={aiProvider === "local" ? "Local draft (no AI key configured)" : `Generated · ${aiProvider}`} color="#7c3aed" bg="#ede9fe" />}
        >
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Child Name</label>
            <div style={{ fontSize: 13, color: "#374151", padding: "8px 0" }}>{child.name}</div>
          </div>
          {structuredField("Strengths Observed", "strengths")}
          {structuredField("Areas Needing Support", "areasNeedingSupport")}
          {structuredField("Teacher Recommendation", "recommendation", 3)}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              onClick={handleSubmit}
              disabled={submitting || submitted}
              style={{ ...S.primaryBtn, opacity: submitting || submitted ? 0.7 : 1 }}
            >
              {submitted ? "✓ Submitted" : submitting ? "Submitting..." : "📤 Submit to Admin"}
            </button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function ActivitySuggestionsTab({ child }) {
  const [expandedSections, setExpandedSections] = useState({});
  const [completedActivities, setCompletedActivities] = useState({});

  const storageKey = `assessment_${child?.id}`;
  let chartScores = null;
  let answers = {};
  let latestStage = "";

  try {
    const raw = localStorage.getItem(storageKey);
    console.log("ActivitySuggestionsTab storageKey:", storageKey);
    console.log("ActivitySuggestionsTab raw localStorage content:", raw);
    if (raw) {
      const savedAssessments = JSON.parse(raw);
      for (const stage of ["Endline", "Midline", "Baseline"]) {
        if (savedAssessments[stage] && savedAssessments[stage].answers && Object.keys(savedAssessments[stage].answers).length > 0) {
          const rec = savedAssessments[stage];
          answers = rec.answers || {};
          chartScores = rec.sectionScores || computeSectionScores(answers);
          latestStage = stage;
          console.log(`ActivitySuggestionsTab picked stage: ${stage}, answers:`, answers, "chartScores:", chartScores);
          break;
        }
      }
    }
  } catch (err) {
    console.error("ActivitySuggestionsTab error reading localStorage:", err);
  }

  const hasChartData = chartScores && chartScores.some((s) => s.score > 0);

  // ── No data state ──
  if (!hasChartData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 0" }}>
        <div
          style={{
            background: "white",
            borderRadius: 20,
            border: "2px dashed #d97706",
            padding: "48px 40px",
            textAlign: "center",
            maxWidth: 500,
            width: "100%",
            boxShadow: "0 4px 24px rgba(217,119,6,0.08)",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, #fef3c7, #fde68a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              margin: "0 auto 20px",
              boxShadow: "0 4px 12px rgba(245,158,11,0.2)",
            }}
          >
            🎯
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
            Complete an Assessment First
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
            Activity suggestions are based on the <strong style={{ color: "#d97706" }}>Section-wise Score Breakdown</strong> chart.
            Go to the <strong>Child Assessment</strong> tab, rate each section, and save. Suggestions will appear here automatically.
          </div>
        </div>
      </div>
    );
  }

  const recommendations = buildRecommendationsFromChart(chartScores, answers);
  const totalActivities = recommendations.reduce((sum, r) => sum + r.totalActivities, 0);
  const completedCount = Object.values(completedActivities).filter(Boolean).length;

  const toggleSection = (id) => setExpandedSections((p) => ({ ...p, [id]: !p[id] }));
  const toggleComplete = (key) => setCompletedActivities((p) => ({ ...p, [key]: !p[key] }));

  // Score-to-label helper
  const getScoreLabel = (pct) => {
    if (pct >= 76) return { text: "Doing Well", color: "#059669", bg: "#d1fae5" };
    if (pct >= 51) return { text: "Good Progress", color: "#d97706", bg: "#fef3c7" };
    if (pct >= 26) return { text: "Needs Support", color: "#ea580c", bg: "#fff7ed" };
    return { text: "Needs Focus", color: "#dc2626", bg: "#fee2e2" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Header Banner ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)",
          borderRadius: 16,
          padding: "22px 24px",
          color: "white",
          borderTop: "3px solid #f59e0b",
          boxShadow: "0 4px 20px rgba(15,23,42,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 3, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                🎯 Activity Suggestions
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              Based on <span style={{ color: "#fbbf24", fontWeight: 700 }}>{latestStage}</span> Score Breakdown · Low scores get more suggestions
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ textAlign: "center", padding: "6px 14px", background: "rgba(245,158,11,0.12)", borderRadius: 10, border: "1px solid rgba(245,158,11,0.25)" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fbbf24" }}>{totalActivities}</div>
              <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Total</div>
            </div>
            <div style={{ textAlign: "center", padding: "6px 14px", background: "rgba(16,185,129,0.12)", borderRadius: 10, border: "1px solid rgba(16,185,129,0.25)" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#34d399" }}>{completedCount}</div>
              <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Done</div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginTop: 14, background: "#334155", borderRadius: 999, height: 5, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg, #f59e0b, #d97706)",
              width: totalActivities > 0 ? `${(completedCount / totalActivities) * 100}%` : "0%",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* ── Section Cards ── */}
      {recommendations.map((rec) => {
        const isExpanded = expandedSections[rec.sectionId] !== false;
        const label = getScoreLabel(rec.pct);
        const icon = SECTION_ICONS[rec.sectionId] || "📋";

        return (
          <div
            key={rec.sectionId}
            style={{
              background: "white",
              borderRadius: 16,
              border: "1px solid #f1f5f9",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            {/* Section Header */}
            <div
              onClick={() => toggleSection(rec.sectionId)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 20px",
                background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                cursor: "pointer",
                borderBottom: isExpanded ? "1px solid #fde68a" : "none",
                userSelect: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                    boxShadow: "0 2px 8px rgba(217,119,6,0.3)",
                  }}
                >
                  {icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 3 }}>
                    {rec.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: label.color,
                        background: label.bg,
                        padding: "2px 10px",
                        borderRadius: 20,
                        border: `1px solid ${label.color}30`,
                      }}
                    >
                      {label.text}
                    </span>
                    <span style={{ fontSize: 11, color: "#92400e", fontWeight: 600 }}>
                      {rec.score}/{rec.max} pts
                    </span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>
                      · {rec.totalActivities} {rec.totalActivities === 1 ? "activity" : "activities"}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Score ring */}
                <div style={{ position: "relative", width: 44, height: 44 }}>
                  <svg width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="18" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                    <circle
                      cx="22" cy="22" r="18" fill="none"
                      stroke={rec.pct >= 76 ? "#059669" : rec.pct >= 51 ? "#d97706" : rec.pct >= 26 ? "#ea580c" : "#dc2626"}
                      strokeWidth="3"
                      strokeDasharray={`${(rec.pct / 100) * 113.1} 113.1`}
                      strokeLinecap="round"
                      transform="rotate(-90 22 22)"
                    />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#0f172a" }}>
                    {rec.pct}%
                  </div>
                </div>

                <span style={{ fontSize: 14, color: "#d97706", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>
                  ▼
                </span>
              </div>
            </div>

            {/* Activity Cards */}
            {isExpanded && (
              <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                {rec.items.map((item) => (
                  <div key={item.id}>
                    {/* Item label */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span
                        style={{
                          background: "linear-gradient(135deg, #f59e0b, #d97706)",
                          color: "white",
                          fontSize: 10,
                          fontWeight: 800,
                          borderRadius: 6,
                          padding: "3px 9px",
                          flexShrink: 0,
                        }}
                      >
                        {item.id}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", lineHeight: 1.4, flex: 1 }}>
                        {item.text}
                      </span>
                      {item.itemScore !== null && item.itemScore !== undefined && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: item.itemScore <= 1 ? "#dc2626" : item.itemScore <= 2 ? "#d97706" : "#059669",
                            background: item.itemScore <= 1 ? "#fee2e2" : item.itemScore <= 2 ? "#fef3c7" : "#d1fae5",
                            borderRadius: 20,
                            padding: "2px 10px",
                            flexShrink: 0,
                          }}
                        >
                          Score {item.itemScore}
                        </span>
                      )}
                    </div>

                    {/* Activity cards grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
                      {item.activities.map((activity, ai) => {
                        const actKey = `${item.id}_${ai}`;
                        const isDone = !!completedActivities[actKey];
                        // Parse activity name (before —) and description (after —)
                        const dashIdx = activity.indexOf("—");
                        const actName = dashIdx > -1 ? activity.slice(0, dashIdx).trim() : activity;
                        const actDesc = dashIdx > -1 ? activity.slice(dashIdx + 1).trim() : "";

                        return (
                          <div
                            key={ai}
                            style={{
                              background: isDone
                                ? "linear-gradient(135deg, #f0fdf4, #dcfce7)"
                                : "white",
                              border: isDone ? "1.5px solid #86efac" : "1.5px solid #f1f5f9",
                              borderRadius: 14,
                              padding: "16px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                              transition: "all 0.25s ease",
                              opacity: isDone ? 0.8 : 1,
                              boxShadow: isDone
                                ? "none"
                                : "0 2px 8px rgba(0,0,0,0.04)",
                              borderTop: isDone
                                ? "3px solid #10b981"
                                : "3px solid #f59e0b",
                            }}
                          >
                            {/* Activity name */}
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: isDone ? "#059669" : "#0f172a",
                                textDecoration: isDone ? "line-through" : "none",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <span style={{ fontSize: 14 }}>{isDone ? "✅" : "📌"}</span>
                              {actName}
                            </div>

                            {/* Activity description */}
                            {actDesc && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: isDone ? "#6b7280" : "#64748b",
                                  lineHeight: 1.6,
                                  textDecoration: isDone ? "line-through" : "none",
                                }}
                              >
                                {actDesc}
                              </div>
                            )}

                            {/* Mark done button */}
                            <button
                              onClick={() => toggleComplete(actKey)}
                              style={{
                                alignSelf: "flex-start",
                                marginTop: "auto",
                                background: isDone
                                  ? "linear-gradient(135deg, #10b981, #059669)"
                                  : "linear-gradient(135deg, #f59e0b, #d97706)",
                                border: "none",
                                borderRadius: 8,
                                padding: "6px 16px",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "white",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                boxShadow: isDone
                                  ? "0 2px 8px rgba(16,185,129,0.25)"
                                  : "0 2px 8px rgba(217,119,6,0.25)",
                              }}
                            >
                              {isDone ? "✓ Completed" : "Mark Done"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ChildDashboardModal({ child, onClose }) {
  const [tab, setTab] = useState("profile");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: child?.name || "" });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setForm({ name: child?.name || "" });
    setTab("profile");
    setEditing(false);
  }, [child]);

  const handleSaveProfile = () => {
    setSaving(true);
    // TODO(backend): call updateChildProfile(child.id, form) once endpoint exists
    setTimeout(() => {
      setSaving(false);
      setEditing(false);
    }, 400);
  };

  const handleAssessmentSaved = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const tabBtn = (key, label, icon) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "9px 16px",
        border: "none",
        borderRadius: 10,
        background: tab === key ? "#dbeafe" : "transparent",
        color: tab === key ? "#1e40af" : "#6b7280",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      <span>{icon}</span> {label}
    </button>
  );

  if (!child) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 1200,
        backdropFilter: "blur(4px)",
        overflowY: "auto",
        padding: "32px 16px",
      }}
    >
      <div style={{ background: "#f8fafc", borderRadius: 20, width: "100%", maxWidth: 960, boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e5e7eb", background: "white", borderRadius: "20px 20px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👶</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#1c1917" }}>{child.name}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Roll No: {child.rollNo}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "12px 24px 0", background: "white", borderBottom: "1px solid #f1f5f9" }}>
          {tabBtn("profile", "Child Profile", "🧾")}
          {tabBtn("assessment", "Child Assessment", "📊")}
          {tabBtn("activities", "Activity Suggestions", "🎯")}
          {tabBtn("ai_feedback", "AI Feedback", "🤖")}
        </div>

        {/* Content */}
        <div style={{ padding: 24, maxHeight: "70vh", overflowY: "auto" }}>
          {tab === "profile" && (
            <ChildProfileTab child={child} editing={editing} setEditing={setEditing} form={form} setForm={setForm} onSave={handleSaveProfile} saving={saving} />
          )}
          {tab === "assessment" && (
            <ChildAssessmentTab child={child} onAssessmentSaved={handleAssessmentSaved} />
          )}
          {tab === "activities" && (
            <ActivitySuggestionsTab key={`${child.id}_${refreshKey}`} child={child} />
          )}
          {tab === "ai_feedback" && (
            <ChildFeedbackTab key={child.id} child={child} />
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #e5e7eb", background: "white", borderRadius: "0 0 20px 20px", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={S.exportBtn}>← Back</button>
        </div>
      </div>
    </div>
  );
}
// Prajwal end
