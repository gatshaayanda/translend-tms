import type { Delivery, DeliveryException, DeliveryNote, DeliveryPodState } from "@/types/core";

export function deriveDeliveryPodState(
  note: DeliveryNote,
  delivery: Delivery | null,
  exceptions: DeliveryException[],
): DeliveryPodState {
  const hasStarted = Boolean(
    note.arrivalAt ||
    note.departureAt ||
    note.acknowledgements.length ||
    note.evidenceRefs.length ||
    exceptions.length,
  );

  if (!hasStarted) return "not_started";

  const hasReceiverAcknowledgement = note.acknowledgements.some((item) => item.role === "receiver");
  const hasEvidence = note.evidenceRefs.length > 0;
  const hasOpenException = exceptions.some((item) => item.status === "open");
  const complete = Boolean(
    delivery?.arrivalAt &&
      delivery.departureAt &&
      hasReceiverAcknowledgement &&
      hasEvidence &&
      !hasOpenException,
  );

  return complete ? "complete" : "incomplete";
}

export function isDeliveryInvoiceReady(
  note: DeliveryNote,
  delivery: Delivery | null,
  exceptions: DeliveryException[],
): boolean {
  return Boolean(
    delivery?.status === "delivered" &&
      deriveDeliveryPodState(note, delivery, exceptions) === "complete" &&
      note.materialLines.length > 0 &&
      note.materialLines.every((line) => line.description.trim() && line.unit.trim() && line.quantity >= 0) &&
      !exceptions.some((item) => item.status === "open"),
  );
}
