export interface VipLevel {
  level: number;
  name: string;
  totalRequired: number;
}

export const VIP_LEVELS: VipLevel[] = [
  { level: 1, name: "Start", totalRequired: 50 },
  { level: 2, name: "Silver", totalRequired: 150 },
  { level: 3, name: "Gold", totalRequired: 300 },
  { level: 4, name: "Platinum", totalRequired: 500 },
  { level: 5, name: "Diamond", totalRequired: 750 },
  { level: 6, name: "Elite", totalRequired: 1000 },
  { level: 7, name: "Royal", totalRequired: 1500 },
  { level: 8, name: "Legend", totalRequired: 2500 },
  { level: 9, name: "Mythic", totalRequired: 4000 },
  { level: 10, name: "Supreme", totalRequired: 6000 }
];

export function normalizeDonationAmount(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) {
    return 0;
  }

  return Number(value);
}

export function getVipProgress(totalDonations: number | null | undefined) {
  const total = normalizeDonationAmount(totalDonations);

  let current = VIP_LEVELS[0];
  for (const level of VIP_LEVELS) {
    if (total >= level.totalRequired) {
      current = level;
    }
  }

  const next = VIP_LEVELS.find((level) => level.totalRequired > total) ?? null;
  const remaining = next ? Math.max(next.totalRequired - total, 0) : 0;

  return {
    total,
    current,
    next,
    remaining
  };
}
