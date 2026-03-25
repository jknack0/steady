import { prisma } from "@steady/db";
import { logger } from "../lib/logger";

async function mergeTrackers() {
  // Find participants with >1 tracker (only participant-scoped)
  const groups = await prisma.dailyTracker.groupBy({
    by: ["participantId"],
    where: { participantId: { not: null } },
    _count: true,
    having: { participantId: { _count: { gt: 1 } } },
  });

  logger.info(`Found ${groups.length} participants with multiple trackers`);

  let totalMerged = 0;

  for (const group of groups) {
    const participantId = group.participantId!;
    logger.info(`Processing participant`, participantId);

    try {
      await prisma.$transaction(async (tx) => {
        // Get all trackers, ordered by entry count desc
        const trackers = await tx.dailyTracker.findMany({
          where: { participantId },
          include: {
            fields: { orderBy: { sortOrder: "asc" } },
            _count: { select: { entries: true } },
          },
        });

        // Sort: most entries first = primary
        trackers.sort((a, b) => b._count.entries - a._count.entries);
        const primary = trackers[0];
        const others = trackers.slice(1);

        logger.info(
          `Primary tracker for participant ${participantId}`,
          `"${primary.name}" (${primary._count.entries} entries, ${primary.fields.length} fields)`,
        );

        // Build dedup set from primary's fields
        const fieldKey = (f: { label: string; fieldType: string; options: any }) =>
          `${f.label}|${f.fieldType}|${JSON.stringify(f.options)}`;

        const primaryFieldKeys = new Set(primary.fields.map(fieldKey));
        let maxSortOrder =
          primary.fields.length > 0
            ? Math.max(...primary.fields.map((f) => f.sortOrder))
            : -1;

        const fieldIdMap = new Map<string, string>();

        // Map primary fields by key for dedup matching
        const primaryFieldsByKey = new Map<string, string>();
        for (const f of primary.fields) {
          primaryFieldsByKey.set(fieldKey(f), f.id);
        }

        for (const other of others) {
          logger.info(
            `Merging tracker "${other.name}"`,
            `${other._count.entries} entries, ${other.fields.length} fields`,
          );

          // Merge unique fields
          for (const field of other.fields) {
            const key = fieldKey(field);
            if (!primaryFieldKeys.has(key)) {
              maxSortOrder++;
              const newField = await tx.dailyTrackerField.create({
                data: {
                  trackerId: primary.id,
                  label: field.label,
                  fieldType: field.fieldType,
                  options: field.options,
                  sortOrder: maxSortOrder,
                  isRequired: field.isRequired,
                },
              });
              fieldIdMap.set(field.id, newField.id);
              primaryFieldKeys.add(key);
              primaryFieldsByKey.set(key, newField.id);
              logger.info(`Added field "${field.label}" (${field.fieldType})`);
            } else {
              // Map to existing primary field
              const existingId = primaryFieldsByKey.get(key);
              if (existingId) fieldIdMap.set(field.id, existingId);
            }
          }

          // Merge entries
          const entries = await tx.dailyTrackerEntry.findMany({
            where: { trackerId: other.id },
          });

          let entriesMigrated = 0;
          let entriesMerged = 0;

          for (const entry of entries) {
            // Remap response keys
            const remapped: Record<string, any> = {};
            for (const [oldFieldId, value] of Object.entries(
              entry.responses as Record<string, any>,
            )) {
              const newFieldId = fieldIdMap.get(oldFieldId) || oldFieldId;
              remapped[newFieldId] = value;
            }

            // Check if primary already has an entry for this date+user
            const existing = await tx.dailyTrackerEntry.findUnique({
              where: {
                trackerId_userId_date: {
                  trackerId: primary.id,
                  userId: entry.userId,
                  date: entry.date,
                },
              },
            });

            if (existing) {
              // Merge responses
              const merged = {
                ...(existing.responses as Record<string, any>),
                ...remapped,
              };
              await tx.dailyTrackerEntry.update({
                where: { id: existing.id },
                data: { responses: merged },
              });
              entriesMerged++;
            } else {
              await tx.dailyTrackerEntry.create({
                data: {
                  trackerId: primary.id,
                  userId: entry.userId,
                  date: entry.date,
                  responses: remapped,
                  completedAt: entry.completedAt,
                },
              });
              entriesMigrated++;
            }
          }

          logger.info(
            `Entries for tracker ${other.id}`,
            `${entriesMigrated} migrated, ${entriesMerged} merged`,
          );

          // Delete the non-primary tracker (cascade deletes fields + entries)
          await tx.dailyTracker.delete({ where: { id: other.id } });
          logger.info(`Deleted tracker`, other.id);
        }

        logger.info(
          `Merged ${others.length} trackers into "${primary.name}"`,
          primary.id,
        );
        totalMerged += others.length;
      });
    } catch (err) {
      logger.error(`Failed for participant ${participantId}`, err);
    }
  }

  logger.info(
    `Migration complete`,
    `Merged ${totalMerged} trackers across ${groups.length} participants`,
  );
  await prisma.$disconnect();
}

mergeTrackers().catch((err) => {
  logger.error("Migration failed", err);
  process.exit(1);
});
