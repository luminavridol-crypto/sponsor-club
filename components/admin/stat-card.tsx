export function StatCard({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "cyan";
}) {
  const styles = {
    default: "border-white/10 bg-white/5",
    accent: "border-accent/30 bg-accent/10",
    cyan: "border-cyanGlow/30 bg-cyanGlow/10"
  };

  return (
    <div className={`rounded-3xl border p-5 ${styles[tone]}`}>
      <p className="text-sm text-white/55">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
