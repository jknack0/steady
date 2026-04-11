/**
 * Shared helpers for deep-copying program modules/parts and daily trackers.
 * Used by: programs.ts (promote, clone), assignment.ts (assignProgram, appendModules).
 */

interface SourceModule {
  id: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  estimatedMinutes: number | null;
  sortOrder: number;
  unlockRule: string | null;
  unlockDelayDays: number | null;
  parts: Array<{
    id: string;
    type: string;
    title: string;
    sortOrder: number;
    isRequired: boolean;
    content: unknown;
  }>;
}

interface SourceTracker {
  name: string;
  description: string | null;
  fields: Array<{
    label: string;
    fieldType: string;
    sortOrder: number;
    isRequired: boolean;
    options: unknown;
  }>;
}

interface DeepCopyModulesOptions {
  excludedModuleIds?: Set<string>;
  excludedPartIds?: Set<string>;
  /** Offset added to each module's sortOrder (for append operations) */
  sortOrderOffset?: number;
}

/**
 * Deep-copy modules and their parts into a target program.
 * Handles exclusion lists and sort order offsets.
 *
 * @returns The number of modules actually copied.
 */
export async function deepCopyModules(
  tx: any,
  sourceModules: SourceModule[],
  targetProgramId: string,
  options: DeepCopyModulesOptions = {}
): Promise<number> {
  const { excludedModuleIds, excludedPartIds, sortOrderOffset } = options;
  let copiedCount = 0;

  for (const mod of sourceModules) {
    if (excludedModuleIds?.has(mod.id)) continue;

    copiedCount++;
    const newSortOrder = sortOrderOffset != null
      ? sortOrderOffset + copiedCount
      : mod.sortOrder;

    const newModule = await tx.module.create({
      data: {
        programId: targetProgramId,
        title: mod.title,
        subtitle: mod.subtitle,
        summary: mod.summary,
        estimatedMinutes: mod.estimatedMinutes,
        sortOrder: newSortOrder,
        unlockRule: mod.unlockRule,
        unlockDelayDays: mod.unlockDelayDays,
      },
    });

    const includedParts = excludedPartIds
      ? mod.parts.filter((p) => !excludedPartIds.has(p.id))
      : mod.parts;

    if (includedParts.length > 0) {
      await tx.part.createMany({
        data: includedParts.map((p) => ({
          moduleId: newModule.id,
          type: p.type,
          title: p.title,
          sortOrder: p.sortOrder,
          isRequired: p.isRequired,
          content: p.content as any,
        })),
      });
    }
  }

  return copiedCount;
}

/**
 * Deep-copy daily trackers and their fields into a target program.
 * Optionally deduplicates by name (for append operations).
 */
export async function deepCopyTrackers(
  tx: any,
  sourceTrackers: SourceTracker[],
  targetProgramId: string,
  clinicianId: string,
  existingTrackerNames?: Set<string>
): Promise<void> {
  for (const tracker of sourceTrackers) {
    if (existingTrackerNames?.has(tracker.name)) continue;

    const newTracker = await tx.dailyTracker.create({
      data: {
        programId: targetProgramId,
        createdById: clinicianId,
        name: tracker.name,
        description: tracker.description,
      },
    });

    if (tracker.fields.length > 0) {
      await tx.dailyTrackerField.createMany({
        data: tracker.fields.map((f) => ({
          trackerId: newTracker.id,
          label: f.label,
          fieldType: f.fieldType,
          sortOrder: f.sortOrder,
          isRequired: f.isRequired,
          options: f.options as any,
        })),
      });
    }
  }
}
