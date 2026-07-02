function getStartOfDayVN(date = new Date()) {
  const d = new Date(date.getTime());
  d.setUTCHours(d.getUTCHours() + 7);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCHours(d.getUTCHours() - 7);
  return d;
}

const now = new Date(); // 2026-07-02T14:03:16+07:00
console.log("now UTC:", now.toISOString());
const start = getStartOfDayVN(now);
console.log("start UTC:", start.toISOString());

const tomorrow = new Date(start);
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
console.log("tomorrow UTC:", tomorrow.toISOString());
