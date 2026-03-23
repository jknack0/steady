export const CPT_CODES = {
  "98975": { description: "RTM initial setup and patient education", rate: 19.65 },
  "98978": { description: "RTM device supply with scheduled recordings, each 30 days (CBT)", rate: 55.00 },
  "98986": { description: "RTM device supply with scheduled recordings, 2-15 days (CBT)", rate: 50.00 },
  "98980": { description: "RTM treatment management, first 20 minutes", rate: 54.00 },
  "98979": { description: "RTM treatment management, 10-19 minutes", rate: 26.00 },
  "98981": { description: "RTM treatment management, each additional 20 minutes", rate: 41.00 },
} as const;

export type CptCode = keyof typeof CPT_CODES;

export function getCptRate(code: string): number {
  return CPT_CODES[code as CptCode]?.rate ?? 0;
}

export function getCptDescription(code: string): string {
  return CPT_CODES[code as CptCode]?.description ?? code;
}
