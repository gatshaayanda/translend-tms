import Link from "next/link";
import styles from "./pipeline.module.css";
import PipelineUpdates from "./pipeline-updates";

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
    area: "Final acceptance",
    title: "Owner clarity & acceptance QA",
    description: "Walk the deployed Truck Division through the owner's operational story: job → dispatch → trip → delivery/POD → invoice → payment → financial records. Confirm navigation, terminology, visual hierarchy, queues, exceptions and next actions make sense without the owner having to repeat the Loom.",
    detail: "Final acceptance gate · any failure becomes a targeted final revision.",
  },
  {
    stage: "PLANNED",
    area: "Bank control",
    title: "Bank reconciliation",
    description: "Import or model bank transactions, match them to customer payments and journals, control adjustments and retain an audit trail.",
    detail: "Next product phase after acceptance.",
  },
  {
    stage: "PLANNED",
    area: "Driver settlement",
    title: "Payroll / driver settlement",
    description: "Link driver or subcontractor earnings and costs to trips, with approval, payment state and accounting consequences.",
    detail: "Next product phase after acceptance.",
  },
  {
    stage: "PLANNED",
    area: "Reporting & integrations",
    title: "Richer exports and selected provider integrations",
    description: "Add durable scheduled/export reporting and introduce email, push, telematics or mapping integrations where a real provider is selected.",
    detail: "Next product phase after acceptance.",
  },
  {
    stage: "RELEASED",
    area: "Everyday operations",
    title: "Clear operational control",
    description: "Operations Hub, dispatch, trip lookup, delivery queues, exceptions, fleet visibility and role-based workspaces now present the operating picture and the next action.",
    detail: "Implemented · ready for owner acceptance.",
  },
  {
    stage: "RELEASED",
    area: "Commercial flow",
    title: "Delivery → invoice → payment → records",
    description: "Completed PODs feed billing; invoice issue applies workspace VAT settings; customer payments post to Accounts Receivable/Cash; delivery expenses can be linked to the Trip and Delivery Note.",
    detail: "Implemented · ready for owner acceptance.",
  },
  {
    stage: "RELEASED",
    area: "Company workspace",
    title: "Real company workspace",
    description: "The owner works inside the company's workspace rather than a demo, with people and operational records connected to the business.",
    detail: "Available now.",
  },
  {
    stage: "RELEASED",
    area: "Fleet & people",
    title: "Customers, trucks and drivers",
    description: "Create and manage customers, trucks and drivers, link drivers to work and keep the active fleet register current.",
    detail: "Available now.",
  },
  {
    stage: "RELEASED",
    area: "Trip operations",
    title: "Trips and driver work",
    description: "Drivers can see their work, update trip progress, handle movement and unloading, and record what happened on delivery.",
    detail: "Available now.",
  },
  {
    stage: "RELEASED",
    area: "Delivery records",
    title: "Delivery notes and proof of delivery",
    description: "Capture delivery details and proof, then bring completed work back to the owner for follow-through.",
    detail: "Available now.",
  },
  {
    stage: "RELEASED",
    area: "Owner follow-through",
    title: "POD queue, invoicing and financial records",
    description: "Delivered work with incomplete evidence is surfaced for action; completed PODs can move into invoicing, payments and accounting records with tax detail.",
    detail: "Available now · owner acceptance remains.",
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
            <div><strong>Translend</strong><span>TMS · Truck Division</span></div>
          </div>
          <nav className={styles.nav} aria-label="Pipeline navigation">
            <Link href="/translend">Operations</Link>
            <span className={styles.active}>Pipeline</span>
          </nav>
        </header>

        <section className={styles.hero}>
          <span className={styles.eyebrow}>Translend pipeline</span>
          <h1>The Truck Division keeps moving.</h1>
          <p>See what the app can do today, what we are tightening now, and what comes next. The owner can add dated updates and a Loom walkthrough below.</p>
          <div className={styles.meta}><span>Owner updates are dated</span><span>Loom links welcome</span><span>Admin control later</span></div>
        </section>

        <section className={styles.stats} aria-label="Pipeline summary">
          <Stat label="Planned" value={counts.planned} />
          <Stat label="Building" value={counts.building} />
          <Stat label="Released" value={counts.released} />
          <Stat label="Tracked" value={items.length} />
        </section>

        <section className={styles.board} aria-label="Translend product pipeline">
          {order.map((stage) => (
            <div className={styles.column} key={stage}>
              <div className={styles.columnHeader}>
                <div><span className={styles.stage}>{stage}</span><h2>{stage === "BUILDING" ? "Working on now" : stage === "PLANNED" ? "What's next" : "Already in the app"}</h2></div>
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

        <PipelineUpdates />

        <footer className={styles.footer}>
          <span>Translend TMS · Truck Division</span>
          <span>Product pipeline · Owner updates</span>
        </footer>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className={styles.stat}><span>{label}</span><strong>{value}</strong></div>;
}
