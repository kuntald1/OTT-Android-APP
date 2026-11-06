// What the two content sections are CALLED on screen.
//
// The stored values are still "play" and "archive" everywhere — in the
// database, in the API and in the navigation route names. Only the
// wording people read changed (Nov 2026: Plays -> Contemporary,
// Archive -> Heritage), so print a section through sectionLabel()
// instead of renaming the value itself.
export const SECTION_LABELS: Record<string, string> = {
  play: "Contemporary",
  archive: "Heritage",
  both: "Both",
};

export function sectionLabel(value?: string | null): string {
  if (!value) return "";
  return SECTION_LABELS[value] || value;
}
