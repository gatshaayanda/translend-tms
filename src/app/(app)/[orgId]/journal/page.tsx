import FinancialAndControlViews from "@/components/v19/FinancialAndControlViews";
import AccountingControls from "@/components/v19/AccountingControls";
import AccountingMaturity from "@/components/v19/AccountingMaturity";

export default function JournalPage() {
  return <div className="space-y-6"><FinancialAndControlViews kind="journal" /><AccountingControls /><AccountingMaturity /></div>;
}
