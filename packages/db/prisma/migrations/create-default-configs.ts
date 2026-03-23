import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_ENABLED_MODULES = [
  "daily_tracker",
  "homework",
  "journal",
  "assessments",
  "strategy_cards",
  "todo_list",
  "calendar",
  "program_modules",
  "secure_messaging",
  "rtm_billing",
  "pre_visit_summary",
];

const DEFAULT_DASHBOARD_LAYOUT = [
  { widgetId: "rtm_overview", visible: true },
  { widgetId: "homework_status", visible: true },
  { widgetId: "assessment_scores", visible: true },
  { widgetId: "tracker_summary", visible: true },
  { widgetId: "pre_visit", visible: true },
  { widgetId: "recent_messages", visible: true },
];

const DEFAULT_ASSESSMENTS = [
  { instrumentId: "PHQ9", frequency: "WEEKLY" },
  { instrumentId: "GAD7", frequency: "WEEKLY" },
];

async function main() {
  const cliniciansWithoutConfig = await prisma.clinicianProfile.findMany({
    where: { config: null },
    select: { id: true, userId: true },
  });

  console.log(
    `Found ${cliniciansWithoutConfig.length} clinicians without config`
  );

  if (cliniciansWithoutConfig.length === 0) {
    console.log("Nothing to do - all clinicians already have configs.");
    return;
  }

  for (const clinician of cliniciansWithoutConfig) {
    await prisma.clinicianConfig.create({
      data: {
        clinicianId: clinician.id,
        providerType: "THERAPIST",
        presetId: "THERAPIST_CBT",
        enabledModules: DEFAULT_ENABLED_MODULES,
        dashboardLayout: DEFAULT_DASHBOARD_LAYOUT,
        defaultTrackerPreset: "mood_log",
        defaultAssessments: DEFAULT_ASSESSMENTS,
        setupCompleted: true,
      },
    });
    console.log(`  Created config for clinician ${clinician.id}`);
  }

  console.log(
    `\nDone! Created ${cliniciansWithoutConfig.length} default configs.`
  );
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
