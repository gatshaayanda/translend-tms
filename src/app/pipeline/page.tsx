import Link from "next/link";
import styles from "./pipeline.module.css";

type Item = {
  stage: "PLANNED" | "BUILDING" | "RELEASED";
  area: string;
  title: string;
  description: string;
  detail: string;
};

const items: Item[] = [
  {
    stage: "BUILDING",
    area: "Product control",
    title: "Translend pipeline",
    description: "A single place to see what has shipped, what is being tightened now, and what is planned next for the Truck Division.",
    detail: "Seeded from the current operational MVP and QA pass.",
  },
  {
    stage: "BUILDING",
    area: "Operational workflow",
    title: "Delivery → invoice → payment → journal",
    description: "Complete the commercial chain so a completed delivery can flow cleanly into billing, payment tracking and financial records.",
    detail: "Current product gap identified for the next controlled pass.",
  },
  {
    stage: "BUILDING",
    area: "Reliability",
    title: "Audit and data-integrity sweep",
    description: "Verify mutations, ownership boundaries and record relationships across customers, trucks, drivers, trips, deliveries and commercial records.",
    detail: "Protects the real company workspace as the source of truth.",
  },
  {
    stage: "PLANNED",
    area: "Admin control",
    title: "Pipeline administration",
    description: "Give authorised Admin users control over pipeline entries, status, copy and release notes without changing the operational application.",
    detail: "Future admin capability — not connected yet.",
  },
  {
    stage: "PLANNED",
    area: "Admin oversight",
    title: "Translend operations oversight",
    description: "Provide a controlled Admin view of application health, workspace activity and important operational signals.",
    detail: "Future oversight layer; organisation-scoped data remains protected.",
  },
  {
    stage: "PLANNED",
    area: "Product operations",
    title: "Production monitoring",
    description: "Surface the operational signals that help an administrator understand whether Translend is behaving as expected after release.",
    detail: "Designed as an oversight layer, not a replacement for the owner workspace.",
  },
  {
    stage: "RELEASED",
    area: "Workspace",
    title: "Real company workspace",
    description: "Translend operates against the authenticated, organisation-scoped company workspace rather than a demo-only surface.",
    detail: "Current operational foundation.",
  },
  {
    stage: "RELEASED",
    area: "Fleet & people",
    title: "Customer, truck and driver workflow",
    description: "Owner workflows cover customer, truck and driver records, including linking drivers and assigning operational work.",
    detail: "Current workflow foundation.",
  },
  {
    stage: "RELEASED",
    area: "Driver operations",
    title: "Trip and delivery workflow",
    description: "Driver-side operations cover trip status, movement, unloading, delivery notes, proof of delivery and completion.",
    detail: "Current operational workflow.",
  },
  {
    stage: "RELEASED",
    area: "Commercial follow-through",
    title: "POD queue and invoice workspace",
    description: "Completed deliveries can enter the owner-side POD and invoicing workflow for operational follow-through.",
    detail: "The remaining accounting chain is tracked above.",
  },
  {
    stage: "RELEASED",
    area: "Quality",
    title: "Controlled QA pass",
    description: "The current product is being tightened against the owner's mobile, accessibility, copy, action hierarchy and error-recovery audit.",
    detail: "QA remains controlled: fix the real application, verify, then checkpoint.",
  },
];

const order = ["BUILDING", "PLANNED", "RELEASED"] as const;

export default function PipelinePage() {
  const counts = {
    planned: items.filter((item) => item.stage === "PLANNED").length,
    building: items.filter((item) => item.stage === "BUILDING").length,
    released: items.filter((item) => item.stage === "RELEASED").length,
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.mark}>T</span>
            <div>
              <strong>Translend</strong>
              <span>TMS · Truck Division</span>
            </div>
          </div>
          <nav className={styles.nav} aria-label="Pipeline navigation">
            <Link href="/translend">Operations</Link>
            <span className={styles.active}>Pipeline</span>
          </nav>
        </header>

        <section className={styles.hero}>
          <span className={styles.eyebrow}>Translend pipeline</span>
          <h1>The Truck Division keeps moving.</h1>
          <p>
            See what has shipped, what is being tightened now, and what is planned
            next — with the real operational product kept separate from future admin
            control.
          </p>
          <div className={styles.meta}>
            <span>Seeded operational roadmap</span>
            <span>Admin controls coming later</span>
          </div>
        </section>

        <section className={styles.stats} aria-label="Pipeline summary">
          <Stat label="Planned" value={counts.planned} />
          <Stat label="Building" value={counts.building} />
          <Stat label="Released" value={counts.released} />
          <Stat label="Total tracked" value={items.length} />
        </section>

        <section className={styles.board} aria-label="Translend product pipeline">
          {order.map((stage) => (
            <div className={styles.column} key={stage}>
              <div className={styles.columnHeader}>
                <div>
                  <span className={styles.stage}>{stage}</span>
                  <h2>{stage === "BUILDING" ? "In the desk" : stage === "PLANNED" ? "What's next" : "Recently shipped"}</h2>
                </div>
                <span className={styles.count}>{items.filter((item) => item.stage === stage).length}</span>
              </div>

              <div className={styles.cards}>
                {items.filter((item) => item.stage === stage).map((item) => (
                  <article className={styles.card} key={item.title}>
                    <span className={styles.area}>{item.area}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className={styles.detail}>{item.detail}</div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>

        <footer className={styles.footer}>
          <span>Translend TMS · Independent product pipeline</span>
          <span>Public roadmap now · Admin control later</span>
        </footer>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
