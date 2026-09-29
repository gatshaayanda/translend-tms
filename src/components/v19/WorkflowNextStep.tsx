import Link from "next/link";

export type WorkflowStep = {
  label: string;
  state: "done" | "current" | "next" | "blocked";
  href?: string;
};

export function WorkflowNextStep({
  steps,
  title = "Where this goes next",
}: {
  steps: WorkflowStep[];
  title?: string;
}) {
  const next = steps.find((step) => (step.state === "current" || step.state === "next") && step.href);
  return (
    <section className="panel" aria-label={title}>
      <div className="section-header">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="section-sub">Follow the work forward without hunting through the navigation.</p>
        </div>
        {next?.href && (
          <Link href={next.href} className="btn-secondary">
            {next.label} →
          </Link>
        )}
      </div>
      <div className="grid gap-2 md:grid-cols-5">
        {steps.map((step, index) => {
          const content = (
            <div
              className="rounded-lg border p-3"
              style={{
                borderColor:
                  step.state === "current" ? "var(--teal)" :
                  step.state === "done" ? "var(--border)" :
                  step.state === "blocked" ? "var(--red)" : "var(--border)",
                background:
                  step.state === "current" ? "var(--surface-3)" :
                  step.state === "blocked" ? "var(--red-100)" : "var(--surface)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{index + 1}</span>
                <span className="text-xs font-semibold">{step.label}</span>
              </div>
              <p className="mt-1 text-[11px] capitalize text-slate-500">{step.state}</p>
            </div>
          );
          return step.href ? <Link key={step.label} href={step.href} className="block">{content}</Link> : <div key={step.label}>{content}</div>;
        })}
      </div>
    </section>
  );
}
