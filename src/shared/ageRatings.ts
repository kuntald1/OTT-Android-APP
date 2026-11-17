// Mirrors the web app's src/shared/ageRatings.js and AgeRating in
// backend/app/models.py. "A" is the stored certificate code; "18+" is
// what people actually read, so this is display only — nothing reads or
// writes the label.
//
// Which ratings are off limits to under-18 profiles is NOT decided here.
// That is an admin setting the server enforces (Admin > Age Restriction,
// backend/app/age_gate.py). The app never decides who may watch what:
// a restricted video simply never arrives in any list, and its id 404s.
const LABELS: Record<string, string> = { A: "18+" };

export function ageRatingLabel(value?: string | null): string {
  if (!value) return "";
  return LABELS[value] || value;
}
