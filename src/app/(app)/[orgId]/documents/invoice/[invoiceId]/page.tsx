import PrintableDocument from "@/components/v19/PrintableDocument";

export default async function Page({ params }: { params: Promise<{ orgId: string; invoiceId: string }> }) {
  const { invoiceId } = await params;
  return <PrintableDocument kind="invoice" recordId={invoiceId} />;
}
