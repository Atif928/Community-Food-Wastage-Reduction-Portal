/**
 * PageHeader - consistent title block for every page.
 */
export function PageHeader({ title, subtitle, actions = null, breadcrumb = null, className = '' }) {
  return (
    <div className={`mb-6 flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {breadcrumb}
        <h1 className="truncate text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export default PageHeader;
