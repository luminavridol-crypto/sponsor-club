export function slugify(input: string) {
  const safe = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яёіїєґ\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return `${safe || "post"}-${Date.now().toString().slice(-6)}`;
}
