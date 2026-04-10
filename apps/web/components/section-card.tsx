import { ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="rounded-3xl bg-panel p-6 shadow-card">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-ink/60">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

