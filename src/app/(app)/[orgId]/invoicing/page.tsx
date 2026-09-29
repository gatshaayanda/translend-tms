import FinancialAndControlViews from "@/components/v19/FinancialAndControlViews";
import { WorkflowNextStep } from "@/components/v19/WorkflowNextStep";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function InvoicingPage() {
  const { activeOrg } = useWorkspace();
  if (!activeOrg) return null;
  return <div className="space-y-6">
    <WorkflowNextStep
      steps={[
        { label: "Customer", state: "done", href: `/${activeOrg.id}/customers` },
        { label: "Job / order", state: "done", href: `/${activeOrg.id}/jobs` },
        { label: "Dispatch / trip", state: "done", href: `/${activeOrg.id}/trips` },
        { label: "Delivery + POD", state: "done", href: `/${activeOrg.id}/deliveries` },
        { label: "Invoice + payment", state: "current" },
      ]}
    />
    <FinancialAndControlViews kind="invoicing" />
  </div>;
}
