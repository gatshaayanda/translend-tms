export type TaxMode = "exclusive" | "inclusive";

export type TaxSettings = {
  enabled: boolean;
  standardRate: number;
  mode: TaxMode;
  taxCode: string;
  registrationNumber: string;
  legalName: string;
};

export type TaxBreakdown = {
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
  rate: number;
  taxCode: string;
  mode: TaxMode;
  enabled: boolean;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateTax(amount: number, settings: TaxSettings): TaxBreakdown {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Taxable amount must be a non-negative number.");
  const rate = Number(settings.standardRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error("Tax rate must be between 0 and 100%.");

  if (!settings.enabled || rate === 0) {
    const rounded = roundMoney(amount);
    return { netAmount: rounded, taxAmount: 0, grossAmount: rounded, rate: 0, taxCode: settings.taxCode || "VAT", mode: settings.mode, enabled: false };
  }

  const multiplier = 1 + rate / 100;
  const netAmount = settings.mode === "inclusive" ? roundMoney(amount / multiplier) : roundMoney(amount);
  const taxAmount = settings.mode === "inclusive" ? roundMoney(amount - netAmount) : roundMoney(netAmount * rate / 100);
  const grossAmount = settings.mode === "inclusive" ? roundMoney(amount) : roundMoney(netAmount + taxAmount);

  return { netAmount, taxAmount, grossAmount, rate, taxCode: settings.taxCode || "VAT", mode: settings.mode, enabled: true };
}
