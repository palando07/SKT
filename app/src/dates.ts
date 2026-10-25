const DAY = 864e5;

export function today0(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Yerel saatle YYYY-AA-GG
export function iso(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
}

export function addDays(n: number, from: Date = today0()): string {
  return iso(new Date(from.getTime() + n * DAY));
}

export function parseIso(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function daysLeft(expires: string): number {
  return Math.round((parseIso(expires).getTime() - today0().getTime()) / DAY);
}

export function daysLabel(d: number): string {
  if (d < 0) return `${-d} gün geçti`;
  if (d === 0) return "bugün son";
  if (d === 1) return "yarın son";
  return `${d} gün`;
}

export function shortDate(s: string): string {
  return parseIso(s).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}
