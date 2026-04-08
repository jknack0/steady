/**
 * Shared billing constants.
 *
 * Consolidates duplicate constant definitions that were previously
 * defined locally across multiple billing and claims components.
 */

export const COMMON_MODIFIERS = [
  { code: "95", label: "Synchronous Telehealth" },
  { code: "GT", label: "Telehealth" },
  { code: "HO", label: "Master's level" },
  { code: "AH", label: "Clinical psychologist" },
  { code: "AJ", label: "Clinical social worker" },
] as const;

export const PLACE_OF_SERVICE_OPTIONS = [
  { code: "02", label: "02 - Telehealth (Other)" },
  { code: "10", label: "10 - Telehealth (Patient Home)" },
  { code: "11", label: "11 - Office" },
  { code: "12", label: "12 - Home" },
  { code: "53", label: "53 - Community MH Center" },
  { code: "99", label: "99 - Other" },
] as const;

export const INVOICE_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
  SENT: { bg: "bg-blue-100", text: "text-blue-700", label: "Sent" },
  PAID: { bg: "bg-green-100", text: "text-green-700", label: "Paid" },
  PARTIALLY_PAID: { bg: "bg-amber-100", text: "text-amber-700", label: "Partial" },
  OVERDUE: { bg: "bg-red-100", text: "text-red-700", label: "Overdue" },
  VOID: { bg: "bg-gray-100", text: "text-gray-400", label: "Void" },
};

export const ENROLLMENT_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
  PAUSED: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Paused" },
  COMPLETED: { bg: "bg-blue-100", text: "text-blue-700", label: "Completed" },
  WITHDRAWN: { bg: "bg-gray-100", text: "text-gray-500", label: "Withdrawn" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
};

/**
 * Settings-style PLACE_OF_SERVICE using value/label keys.
 * Used by SelectItem components in settings pages.
 */
export const PLACE_OF_SERVICE_SELECT_OPTIONS = [
  { value: "02", label: "02 - Telehealth" },
  { value: "11", label: "11 - Office" },
] as const;

export const COMMON_ICD10_CODES = [
  // Depression
  { code: "F32.0", label: "Major depressive disorder, single episode, mild" },
  { code: "F32.1", label: "Major depressive disorder, single episode, moderate" },
  { code: "F32.2", label: "Major depressive disorder, single episode, severe" },
  { code: "F32.9", label: "Major depressive disorder, single episode, unspecified" },
  { code: "F33.0", label: "Major depressive disorder, recurrent, mild" },
  { code: "F33.1", label: "Major depressive disorder, recurrent, moderate" },
  { code: "F33.2", label: "Major depressive disorder, recurrent, severe" },
  { code: "F33.9", label: "Major depressive disorder, recurrent, unspecified" },
  // Anxiety
  { code: "F41.0", label: "Panic disorder without agoraphobia" },
  { code: "F41.1", label: "Generalized anxiety disorder" },
  { code: "F41.9", label: "Anxiety disorder, unspecified" },
  { code: "F40.10", label: "Social anxiety disorder, unspecified" },
  { code: "F40.11", label: "Social anxiety disorder, generalized" },
  // PTSD / Trauma
  { code: "F43.10", label: "Post-traumatic stress disorder, unspecified" },
  { code: "F43.11", label: "Post-traumatic stress disorder, acute" },
  { code: "F43.12", label: "Post-traumatic stress disorder, chronic" },
  { code: "F43.20", label: "Adjustment disorder, unspecified" },
  { code: "F43.21", label: "Adjustment disorder with depressed mood" },
  { code: "F43.22", label: "Adjustment disorder with anxiety" },
  { code: "F43.23", label: "Adjustment disorder with mixed anxiety and depressed mood" },
  { code: "F43.25", label: "Adjustment disorder with mixed disturbance of emotions and conduct" },
  // ADHD
  { code: "F90.0", label: "ADHD, predominantly inattentive type" },
  { code: "F90.1", label: "ADHD, predominantly hyperactive-impulsive type" },
  { code: "F90.2", label: "ADHD, combined type" },
  { code: "F90.9", label: "ADHD, unspecified type" },
  // OCD
  { code: "F42.2", label: "Obsessive-compulsive disorder, mixed obsessional thoughts and acts" },
  { code: "F42.3", label: "Hoarding disorder" },
  { code: "F42.8", label: "Other obsessive-compulsive disorder" },
  { code: "F42.9", label: "Obsessive-compulsive disorder, unspecified" },
  // Eating disorders
  { code: "F50.00", label: "Anorexia nervosa, unspecified" },
  { code: "F50.01", label: "Anorexia nervosa, restricting type" },
  { code: "F50.02", label: "Anorexia nervosa, binge eating/purging type" },
  { code: "F50.2", label: "Bulimia nervosa" },
  { code: "F50.81", label: "Binge eating disorder" },
  { code: "F50.89", label: "Other specified eating disorder" },
  // Substance use
  { code: "F10.10", label: "Alcohol use disorder, mild" },
  { code: "F10.20", label: "Alcohol use disorder, moderate" },
  { code: "F11.10", label: "Opioid use disorder, mild" },
  { code: "F11.20", label: "Opioid use disorder, moderate" },
  { code: "F12.10", label: "Cannabis use disorder, mild" },
  { code: "F12.20", label: "Cannabis use disorder, moderate" },
  // Insomnia
  { code: "F51.01", label: "Primary insomnia" },
  { code: "F51.02", label: "Adjustment insomnia" },
  { code: "F51.09", label: "Other insomnia not due to a substance or known physiological condition" },
  // Anger / Impulse
  { code: "F63.81", label: "Intermittent explosive disorder" },
] as const;

export const CUSTOM_ICD10_PATTERN = /^F\d{2}\.\d{1,2}$/;

export const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" }, { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" }, { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" }, { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" }, { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" }, { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" }, { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" }, { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "AS", label: "American Samoa" }, { value: "GU", label: "Guam" },
  { value: "MP", label: "Northern Mariana Islands" }, { value: "PR", label: "Puerto Rico" },
  { value: "VI", label: "U.S. Virgin Islands" },
] as const;

/**
 * Simple string array of US state abbreviations.
 * Used by native <select> elements that just need the code.
 */
export const US_STATE_CODES = US_STATES.map((s) => s.value);
