import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  pageSize,
  total,
  pathname,
  query = {},
  pageKey = "page",
}: {
  page: number;
  pageSize: number;
  total: number;
  pathname: string;
  query?: Record<string, string | number | undefined>;
  pageKey?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const first = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const last = Math.min(currentPage * pageSize, total);
  const pages = pageNumbers(currentPage, totalPages);

  const href = (nextPage: number) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== "") params.set(key, String(value));
    });
    if (nextPage > 1) params.set(pageKey, String(nextPage));
    else params.delete(pageKey);
    const search = params.toString();
    return search ? `${pathname}?${search}` : pathname;
  };

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-[#e5e5e0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-xs font-medium text-[#686864]">Showing {first}-{last} of {total}</p>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <PageLink href={href(currentPage - 1)} disabled={currentPage === 1} label="Previous page">
          <ChevronLeft className="size-4" />
        </PageLink>
        {pages.map((item, index) => item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="grid size-9 place-items-center text-xs text-[#777771]">...</span>
        ) : (
          <Link key={item} href={href(item)} aria-current={item === currentPage ? "page" : undefined} className={`grid size-9 place-items-center rounded-md border text-xs font-semibold ${item === currentPage ? "border-black bg-black text-white" : "border-[#d8d8d2] bg-white text-[#686864] hover:border-black hover:text-black"}`}>
            {item}
          </Link>
        ))}
        <PageLink href={href(currentPage + 1)} disabled={currentPage === totalPages} label="Next page">
          <ChevronRight className="size-4" />
        </PageLink>
      </nav>
    </div>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  if (disabled) return <span aria-disabled="true" className="grid size-9 place-items-center rounded-md border border-[#e4e4df] bg-[#f4f4f1] text-[#b0b0aa]">{children}</span>;
  return <Link href={href} aria-label={label} className="grid size-9 place-items-center rounded-md border border-[#d8d8d2] bg-white text-[#686864] hover:border-black hover:text-black">{children}</Link>;
}

function pageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3) return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}
