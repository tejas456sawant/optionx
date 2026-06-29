export function money(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value > 100 ? 0 : 2,
  }).format(value);
}

export function percent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

export function signedMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  const formatted = money(Math.abs(value));
  return value >= 0 ? `+ ${formatted}` : `- ${formatted}`;
}

export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function dateTimeLabel(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
