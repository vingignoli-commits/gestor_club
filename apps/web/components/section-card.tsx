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
      className={`rounded-3xl border border-ink/10 bg-white/90 p-4 shadow-sm sm:p-5 lg:p-6 ${className}`}
    >
      <div className="mb-5 min-w-0">
        <h2 className="text-xl font-bold leading-tight text-ink sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink/60">
            {description}
          </p>
        ) : null}
      </div>

      <div className="min-w-0">{children}</div>
    </section>
  );
}