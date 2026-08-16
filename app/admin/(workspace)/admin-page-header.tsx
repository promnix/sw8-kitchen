import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
  showDate = true,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  showDate?: boolean;
}) {
  const currentDate = new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <section className="relative overflow-hidden rounded-lg bg-black px-6 py-7 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8 sm:py-8">
      <span className="absolute inset-y-0 left-0 w-1.5 bg-[#ff4800]" />
      <div>
        <p className="text-sm font-semibold text-[#ffb132]">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-white/55">{description}</p>
      </div>
      <div className="mt-5 flex shrink-0 flex-col gap-3 sm:mt-0 sm:items-end">
        {action}
        {showDate ? (
          <p suppressHydrationWarning className="text-xs font-medium text-white/50 sm:absolute sm:bottom-8 sm:right-8 sm:text-right">
            {currentDate}
          </p>
        ) : null}
      </div>
    </section>
  );
}
