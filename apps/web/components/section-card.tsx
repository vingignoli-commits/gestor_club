import { ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  description,
  children,
  className = '',
}: SectionCardProps) {
  return (
    <section
      className={`rounded-2xl border border-ink/10 bg-white p-6 shadow-soft ${className}`}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-ink/60">{description}</p>
        ) : null}
      </div>

      {children}
    </section>
  );
}
