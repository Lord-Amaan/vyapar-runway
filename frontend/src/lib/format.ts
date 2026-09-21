const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatShortDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length < 3) return iso;
  const monthIndex = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2].slice(0, 2), 10);
  const month = MONTHS[monthIndex] ?? parts[1];
  return `${day} ${month}`;
}

/** Compact INR for chart axes: ≥1,00,000 → "₹1.5L", ≥1,000 → "₹5k", else "₹n". */
export function formatCompactINR(n: number): string {
  if (Math.abs(n) >= 100000) {
    const val = n / 100000;
    const str = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace(/\.0$/, "");
    return `₹${str}L`;
  }
  if (Math.abs(n) >= 1000) {
    const val = n / 1000;
    const str = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace(/\.0$/, "");
    return `₹${str}k`;
  }
  return `₹${Math.round(n)}`;
}
