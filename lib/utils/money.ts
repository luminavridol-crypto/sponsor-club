export function formatEuroAmount(value: number | string | null | undefined) {
  const numeric = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(numeric ?? NaN)) {
    return null;
  }

  const rounded = Math.round((numeric as number) * 100) / 100;
  const fractionDigits = Number.isInteger(rounded) ? 0 : 2;

  return `${rounded.toFixed(fractionDigits)} EUR`;
}
