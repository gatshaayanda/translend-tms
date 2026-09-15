import PrintableDocument from "@/components/v19/PrintableDocument";

export default async function Page({ params }: { params: Promise<{ orgId: string; deliveryNoteId: string }> }) {
  const { deliveryNoteId } = await params;
  return <PrintableDocument kind="delivery-note" recordId={deliveryNoteId} />;
}
