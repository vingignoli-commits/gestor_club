type KpiCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <article className="rounded-3xl bg-panel p-5 shadow-card">
      <p className="text-sm uppercase tracking-[0.18em] text-ink/45">{label}</p>
      <p className="mt-4 font-display text-4xl font-semibold">{value}</p>
      <p className="mt-3 text-sm text-ink/60">{hint}</p>
    </article>
  );
}

