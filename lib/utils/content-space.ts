import { slugify } from "@/lib/utils/slug";

export function buildContentSlug(title: string) {
  return slugify(title) || "lumina-post";
}
