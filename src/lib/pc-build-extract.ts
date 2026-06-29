export interface ExtractedPcBuild {
  cpu: string;
  mainboard: string;
  ram: string;
  vga: string;
  ssd_hdd: string;
  psu: string;
  case: string;
  cooling: string;
  monitor: string;
  keyboard: string;
  mouse: string;
  headphone: string;
  furniture: string;
  total_price: number;
}

export const EMPTY_EXTRACT: ExtractedPcBuild = {
  cpu: "",
  mainboard: "",
  ram: "",
  vga: "",
  ssd_hdd: "",
  psu: "",
  case: "",
  cooling: "",
  monitor: "",
  keyboard: "",
  mouse: "",
  headphone: "",
  furniture: "",
  total_price: 0,
};

export function normalizeExtracted(raw: unknown): ExtractedPcBuild {
  if (!raw || typeof raw !== "object") return EMPTY_EXTRACT;
  const data = raw as Record<string, unknown>;
  const str = (key: keyof ExtractedPcBuild) =>
    typeof data[key] === "string" ? (data[key] as string).trim() : "";

  const totalRaw = data.total_price;
  let total_price = 0;
  if (typeof totalRaw === "number" && Number.isFinite(totalRaw)) {
    total_price = Math.round(totalRaw);
  } else if (typeof totalRaw === "string") {
    const digits = totalRaw.replace(/\D/g, "");
    total_price = digits ? Number.parseInt(digits, 10) : 0;
  }

  return {
    cpu: str("cpu"),
    mainboard: str("mainboard"),
    ram: str("ram"),
    vga: str("vga"),
    ssd_hdd: str("ssd_hdd"),
    psu: str("psu"),
    case: str("case"),
    cooling: str("cooling"),
    monitor: str("monitor"),
    keyboard: str("keyboard"),
    mouse: str("mouse"),
    headphone: str("headphone"),
    furniture: str("furniture"),
    total_price,
  };
}
