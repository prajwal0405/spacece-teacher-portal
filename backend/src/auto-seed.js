import { hashPassword } from "./auth.js";
import { User } from "./models/User.js";
import { Center } from "./models/Center.js";
import { ClassModel } from "./models/Class.js";
import { Child } from "./models/Child.js";
import { Course } from "./models/Course.js";
import { CourseAssignment } from "./models/CourseAssignment.js";
import { LessonPlan } from "./models/LessonPlan.js";
import { LessonPlanAssignment } from "./models/LessonPlanAssignment.js";
import { Trainer } from "./models/Trainer.js";
import { Batch } from "./models/Batch.js";
import { AttendanceAlert } from "./models/AttendanceAlert.js";
import { CurriculumUnit } from "./models/CurriculumUnit.js";
import { ParentModule } from "./models/ParentModule.js";
import { ParentModuleAssignment } from "./models/ParentModuleAssignment.js";
import { ParentSessionAssignment } from "./models/ParentSessionAssignment.js";


export async function autoSeed() {
  console.log("Seeding database with initial portal data...");

  const adminPassword = await hashPassword("Admin@123");
  const teacherPassword = await hashPassword("Teacher@123");

  const admin = await User.findOneAndUpdate(
    { email: "admin@spaceece.com" },
    {
      role: "admin",
      name: "Admin User",
      email: "admin@spaceece.com",
      phone: "9999999999",
      passwordHash: adminPassword,
      status: "approved",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const center = await Center.findOneAndUpdate(
    { name: "Spacece Mumbai Center" },
    {
      name: "Spacece Mumbai Center",
      address: "Demo address, Mumbai",
      city: "Mumbai",
      pincode: "400001",
      contactPerson: "Center Head",
      phone: "9876543210",
      email: "mumbai@spaceece.in",
      status: "active",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const classRecord = await ClassModel.findOneAndUpdate(
    { center: center._id, name: "Nursery A" },
    {
      center: center._id,
      name: "Nursery A",
      ageGroup: "3-4 years",
      curriculumLevel: "Foundation",
      schedule: "Mon-Fri 9:00 AM to 12:00 PM",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Start: Dnyaneshwari Thorat
  const teacherInputs = [
    { name: "Dnyaneshwari Thorat", email: "dnyaneshwarit27@gmail.com", phone: "8605689467", subject: "Pre-Primary", qualification: "Graduate" },
    { name: "Gauri Thorat", email: "dnyaneshwarithrt@gmail.com", phone: "8605689467", subject: "Montessori", qualification: "Graduate" },
  ];

  // Clean up any other teachers from the database
  await User.deleteMany({
    role: "teacher",
    email: { $nin: ["dnyaneshwarit27@gmail.com", "dnyaneshwarithrt@gmail.com"] }
  });
  // End: Dnyaneshwari Thorat

  const teachers = [];
  for (const input of teacherInputs) {
    const teacher = await User.findOneAndUpdate(
      { email: input.email },
      {
        role: "teacher",
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash: teacherPassword,
        status: "approved",
        teacherProfile: {
          center: center._id,
          classes: [classRecord._id],
          qualification: input.qualification,
          subject: input.subject,
          experience: "Fresher",
          address: "Pune, Maharashtra",
          performanceRating: 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    teachers.push(teacher);
  }

  await Child.findOneAndUpdate(
    { class: classRecord._id, rollNo: "N-A-001" },
    {
      center: center._id,
      class: classRecord._id,
      fullName: "Aarav Mehta",
      rollNo: "N-A-001",
      guardianName: "Rohit Mehta",
      guardianPhone: "9000000001",
      status: "active",
    },
    { upsert: true, new: true }
  );

  await Child.findOneAndUpdate(
    { class: classRecord._id, rollNo: "N-A-002" },
    {
      center: center._id,
      class: classRecord._id,
      fullName: "Anaya Shah",
      rollNo: "N-A-002",
      guardianName: "Kiran Shah",
      guardianPhone: "9000000002",
      status: "active",
    },
    { upsert: true, new: true }
  );

  const course = await Course.findOneAndUpdate(
    { title: "Pre-Primary Teacher Training" },
    {
      title: "Pre-Primary Teacher Training",
      description: "Foundation course for preschool teachers.",
      objectives: "Improve classroom delivery and child-centered learning.",
      category: "Foundation",
      level: "Beginner",
      topic: "ECCE",
      durationText: "6 Weeks",
      status: "published",
      createdBy: admin._id,
      modules: [
        {
          title: "ECCE Foundations",
          order: 1,
          description: "Introduction to early childhood care and education.",
          contents: [
            {
              title: "Introduction to ECCE",
              type: "video",
              externalUrl: "https://example.com/ecce-intro",
              order: 1,
            },
          ],
        },
      ],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Start: Dnyaneshwari Thorat
  for (const teacher of teachers) {
    const existing = await CourseAssignment.findOne({ course: course._id, teacher: teacher._id });
    if (!existing) {
      await CourseAssignment.create({
        course: course._id,
        teacher: teacher._id,
        assignedBy: admin._id,
        progressPercent: 0,
        status: "assigned",
      });
    }
  }
  // End: Dnyaneshwari Thorat

  const lesson = await LessonPlan.findOneAndUpdate(
    { title: "Number Patterns", course: course._id },
    {
      course: course._id,
      title: "Number Patterns",
      objectives: "Introduce counting and visual number patterns.",
      instructions: "Use blocks and picture cards.",
      activities: "Sorting, grouping, and matching activity.",
      resources: "Flash cards, blocks",
      scheduleDate: new Date(),
      createdBy: admin._id,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await LessonPlanAssignment.findOneAndUpdate(
    {
      lessonPlan: lesson._id,
      teacher: teachers[0]._id,
      assignedDate: new Date(new Date().toDateString()),
    },
    {
      lessonPlan: lesson._id,
      teacher: teachers[0]._id,
      center: center._id,
      class: classRecord._id,
      assignedDate: new Date(new Date().toDateString()),
      status: "pending",
    },
    { upsert: true, new: true }
  );

  const trainerCount = await Trainer.countDocuments();
  if (trainerCount === 0) {
    await Trainer.create([
      {
        name: "SpaceECE Lead Trainer",
        subject: "Teacher Training",
        email: "trainer@spaceece.in",
        phone: "8605689467",
        qualification: "Teacher Trainer",
        linkedin: "",
        bio: "Lead trainer for assigned teacher training courses.",
        courses: 1,
        sessions: 0,
        rating: 0,
        status: "active",
      },
    ]);
  }

  // Feedback data is created by users through the feedback submission form — no seed data needed

  const sampleLessons = [
    {
      title: "Number Patterns & Counting",
      course: course._id,
      objectives: "Introduce counting and visual number patterns.",
      instructions: "Use blocks and picture cards.",
      activities: "Sorting, grouping, and matching activity.",
      resources: "Flash cards, blocks",
      scheduleDate: new Date(Date.now() + 86400000),
      createdBy: admin._id,
    },
    {
      title: "Phonics & Letter Sounds",
      course: course._id,
      objectives: "Teach letter recognition and phonetic sounds.",
      instructions: "Use alphabet charts and songs.",
      activities: "Singing, tracing letters, matching objects.",
      resources: "Alphabet charts, crayons, worksheets",
      scheduleDate: new Date(Date.now() + 2 * 86400000),
      createdBy: admin._id,
    },
    {
      title: "Storytelling & Moral Values",
      course: course._id,
      objectives: "Develop listening skills and moral understanding.",
      instructions: "Use picture books and puppets.",
      activities: "Group story time, role play, discussion.",
      resources: "Story books, puppets, charts",
      scheduleDate: new Date(Date.now() + 3 * 86400000),
      createdBy: admin._id,
    },
    {
      title: "Colors & Shapes Exploration",
      course: course._id,
      objectives: "Identify and differentiate colors and shapes.",
      instructions: "Use color cards and shape cutouts.",
      activities: "Coloring, sorting shapes, collage making.",
      resources: "Color cards, scissors, glue, paper",
      scheduleDate: new Date(Date.now() + 4 * 86400000),
      createdBy: admin._id,
    },
    {
      title: "Circle Time & Calendar",
      course: course._id,
      objectives: "Build routine and calendar awareness.",
      instructions: "Use a large calendar and song charts.",
      activities: "Good morning song, date/weather discussion.",
      resources: "Calendar, weather chart, song chart",
      scheduleDate: new Date(Date.now() + 5 * 86400000),
      createdBy: admin._id,
    },
  ];

  for (const lessonData of sampleLessons) {
    const lesson = await LessonPlan.findOneAndUpdate(
      { title: lessonData.title, course: lessonData.course },
      lessonData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    for (const teacher of teachers) {
      await LessonPlanAssignment.findOneAndUpdate(
        { lessonPlan: lesson._id, teacher: teacher._id },
        {
          lessonPlan: lesson._id,
          teacher: teacher._id,
          center: center._id,
          class: classRecord._id,
          assignedDate: lesson.scheduleDate,
          status: "pending",
        },
        { upsert: true, new: true }
      );
    }
  }

  const existingBatch = await Batch.findOne({ code: "BATCH-ECCE-2026-01" });
  if (!existingBatch) {
    await Batch.create({
      name: "ECCE Foundation Batch - June 2026",
      code: "BATCH-ECCE-2026-01",
      description: "Foundation batch for new ECCE teachers starting June 2026.",
      course: course._id,
      center: center._id,
      trainer: (await User.findOne({ role: "trainer" }))?._id || admin._id,
      teachers: teachers.map((t) => t._id),
      startDate: new Date(),
      endDate: new Date(Date.now() + 180 * 86400000),
      schedule: {
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        startTime: "09:00",
        endTime: "12:00",
        timezone: "Asia/Kolkata",
      },
      maxTeachers: 30,
      enrolledCount: teachers.length,
      status: "ongoing",
      createdBy: admin._id,
    });
  }

  const attendanceAlertData = [
    teachers[0] ? { teacher: teachers[0]._id, center: center._id, class: classRecord._id, attendanceRate: 72, threshold: 75, alertType: "low_attendance", severity: "warning", message: "Attendance below 75% threshold. Please ensure regular attendance." } : null,
    teachers[1] ? { teacher: teachers[1]._id, center: center._id, class: classRecord._id, attendanceRate: 58, threshold: 75, alertType: "critical_low_attendance", severity: "critical", message: "Attendance critically low at 58%. Immediate action required." } : null,
  ].filter(Boolean);

  for (const alertData of attendanceAlertData) {
    const existingAlert = await AttendanceAlert.findOne({ teacher: alertData.teacher, center: alertData.center, class: alertData.class, alertType: alertData.alertType });
    if (!existingAlert) {
      await AttendanceAlert.create(alertData);
    }
  }

  const curriculumCount = await CurriculumUnit.countDocuments();
  if (curriculumCount === 0) {
    const demoUnits = [
      {
        title: "Foundations of Early Literacy",
        subject: "Language & Literacy",
        grade: "Pre-K – Class 1",
        status: "active",
        progress: 72,
        topics: [
          { title: "Phonemic Awareness", status: "completed", duration: "2 weeks" },
          { title: "Letter Recognition (A–M)", status: "completed", duration: "2 weeks" },
          { title: "Letter Recognition (N–Z)", status: "in_progress", duration: "2 weeks" },
          { title: "Sight Words — Level 1", status: "pending", duration: "3 weeks" },
        ],
        resources: 8,
      },
      {
        title: "Numeracy & Number Sense",
        subject: "Mathematics",
        grade: "Class 1 – Class 2",
        status: "active",
        progress: 45,
        topics: [
          { title: "Counting 1–50", status: "completed", duration: "1 week" },
          { title: "Addition Basics", status: "in_progress", duration: "2 weeks" },
          { title: "Subtraction Basics", status: "pending", duration: "2 weeks" },
          { title: "Shapes & Patterns", status: "pending", duration: "1 week" },
        ],
        resources: 12,
      },
      {
        title: "Environmental Awareness",
        subject: "EVS",
        grade: "Class 2 – Class 3",
        status: "draft",
        progress: 10,
        topics: [
          { title: "My Neighborhood", status: "in_progress", duration: "1 week" },
          { title: "Plants & Animals Around Us", status: "pending", duration: "2 weeks" },
          { title: "Weather & Seasons", status: "pending", duration: "1 week" },
        ],
        resources: 4,
      },
      {
        title: "Creative Expression",
        subject: "Art & Craft",
        grade: "Pre-K – Class 3",
        status: "completed",
        progress: 100,
        topics: [
          { title: "Color Theory Basics", status: "completed", duration: "1 week" },
          { title: "Paper Craft", status: "completed", duration: "1 week" },
          { title: "Storytelling Through Drawing", status: "completed", duration: "1 week" },
        ],
        resources: 6,
      },
    ];
    await CurriculumUnit.insertMany(demoUnits);
    console.log("Seeded default curriculum units.");
  }

  // ── Seed Parent Capacity Building Modules ──
  const parentModuleCount = await ParentModule.countDocuments();
  if (parentModuleCount === 0) {
    const parentModule = await ParentModule.create({
      moduleNumber: 1,
      title: "Positive Parenting & Early Child Development",
      category: "Parenting",
      ageGroup: "3-6 Years",
      duration: "4 Weeks",
      year: 1,
      objective: "Empower parents with foundational knowledge and practical strategies for positive parenting, emotional nurturing, and supporting early child development at home.",
      outcomes: [
        "Understand key developmental milestones in early childhood",
        "Implement positive discipline and constructive communication",
        "Create a stimulating learning environment at home"
      ],
      sessions: [
        {
          sessionNumber: 1,
          title: "Understanding Child Milestones & Emotional Needs",
          objective: "Help parents understand physical, cognitive, and social-emotional milestones of 3-6 year olds.",
          homePractice: "Observe your child's play habits for 15 minutes daily and note key interests.",
          activities: [
            { time: "10 mins", activity: "Icebreaker & Welcome", keyFocus: "Building rapport" },
            { time: "20 mins", activity: "Interactive Presentation on Milestones", keyFocus: "Cognitive & Emotional development" },
            { time: "15 mins", activity: "Group Discussion & Q&A", keyFocus: "Addressing parent concerns" }
          ]
        },
        {
          sessionNumber: 2,
          title: "Positive Discipline & Effective Communication",
          objective: "Guide parents on non-violent discipline techniques and active listening.",
          homePractice: "Practice positive reinforcement twice daily when child demonstrates good behavior.",
          activities: [
            { time: "15 mins", activity: "Roleplay Scenarios", keyFocus: "Handling tantrums calmly" },
            { time: "25 mins", activity: "Communication Strategies Workshop", keyFocus: "Active listening techniques" }
          ]
        }
      ]
    });

    for (const t of teachers) {
      await ParentModuleAssignment.findOneAndUpdate(
        { module: parentModule._id, class: classRecord._id, teacher: t._id },
        { module: parentModule._id, class: classRecord._id, teacher: t._id, assignedBy: admin._id },
        { upsert: true, new: true }
      );

      for (const s of parentModule.sessions) {
        await ParentSessionAssignment.findOneAndUpdate(
          { teacher: t._id, module: parentModule._id, sessionNumber: s.sessionNumber },
          {
            teacher: t._id,
            module: parentModule._id,
            sessionNumber: s.sessionNumber,
            status: "Pending",
            assignedDate: new Date()
          },
          { upsert: true, new: true }
        );
      }
    }
    console.log("Seeded Parent Capacity Building modules and assignments.");
  }

  console.log("Automatic database seeding complete.");
  console.log("Admin account: admin@spaceece.com / Admin@123");
  console.log("Teacher accounts use the seeded email addresses / Teacher@123");
}
