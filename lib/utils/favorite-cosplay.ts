const FAVORITE_COSPLAY_MARKER = "[[favorite_lumina_cosplay:";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const favoriteCosplayPattern = new RegExp(
  `${escapeRegExp(FAVORITE_COSPLAY_MARKER)}(.*?)\\]\\]`,
  "i"
);

export function extractFavoriteLuminaCosplay(
  favoriteLuminaCosplay: string | null | undefined,
  adminNote: string | null | undefined
) {
  if (favoriteLuminaCosplay?.trim()) {
    return favoriteLuminaCosplay.trim();
  }

  const match = adminNote?.match(favoriteCosplayPattern);
  return match?.[1]?.trim() || null;
}

export function stripFavoriteLuminaCosplayMarker(adminNote: string | null | undefined) {
  if (!adminNote) {
    return null;
  }

  const cleaned = adminNote
    .replace(favoriteCosplayPattern, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned || null;
}

export function mergeFavoriteLuminaCosplayIntoAdminNote(
  adminNote: string | null | undefined,
  favoriteLuminaCosplay: string | null | undefined
) {
  const visibleNote = stripFavoriteLuminaCosplayMarker(adminNote);
  const normalizedFavorite = favoriteLuminaCosplay?.trim() || null;

  if (!normalizedFavorite) {
    return visibleNote;
  }

  const marker = `${FAVORITE_COSPLAY_MARKER}${normalizedFavorite}]]`;
  return visibleNote ? `${visibleNote}\n\n${marker}` : marker;
}
