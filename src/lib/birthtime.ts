import { lunarToSolar, TIME_SLOTS, timeIndexFromClock, type BirthInput } from "@/lib/ziwei";

/**
 * 出生時間校正。
 *
 * 1. 時鐘撥快：依 IANA 時區資料（瀏覽器內建）判斷出生當下的 UTC 偏移，扣回當地標準時間。
 *    台灣可同時處理日治時期的東京時間（1937–1945）與 1945–1979 年間的日光節約時間，
 *    逐年邊界已對照中央氣象署年表與省府公文驗證。
 * 2. 真太陽時（選用）：經度差每度 4 分鐘，加上均時差（NOAA 演算法，誤差在數秒內）。
 * 3. 晚子時：23:00 後出生以隔日子時排盤，送進 iztro 的時辰只有 0–11。iztro 2.6.4 起收到 12 也會自行換日
 *    （修正 #314 月底晚子時只進日不進月），但本站不會送 12，兩邊不會重複換日。
 * 4. 時辰交界：校正後的時間離時辰交界 15 分鐘內，提供相鄰時辰的命盤供比對。
 * 5. 夏令時間切換當天：撥快時跳過的鐘點不存在、撥回時的鐘點出現兩次，兩種解釋排出不同命盤時一併提供比對。
 */

/**
 * std：當地標準時間的 UTC 偏移（分鐘）。有填的地點以它為準，
 * 沒填的（標準時間曾經改過的地方，例如新加坡 1982 年前是 UTC+7:30）取當年一月與七月偏移較小者。
 * 南半球一月是夏令時間、美國二戰時全年撥快，所以這些地點一定要填 std。
 */
export type Place = { id: string; name: string; group: string; tz: string; lon: number; std?: number };

const tw = (id: string, name: string, lon: number): Place => ({ id, name, group: "台灣", tz: "Asia/Taipei", lon, std: 480 });

export const PLACES: Place[] = [
  tw("taipei", "臺北市", 121.56),
  tw("newtaipei", "新北市", 121.47),
  tw("keelung", "基隆市", 121.74),
  tw("taoyuan", "桃園市", 121.3),
  tw("hsinchu", "新竹市", 120.97),
  tw("hsinchucounty", "新竹縣", 121.02),
  tw("miaoli", "苗栗縣", 120.82),
  tw("taichung", "臺中市", 120.68),
  tw("changhua", "彰化縣", 120.54),
  tw("nantou", "南投縣", 120.69),
  tw("yunlin", "雲林縣", 120.53),
  tw("chiayi", "嘉義市", 120.45),
  tw("chiayicounty", "嘉義縣", 120.47),
  tw("tainan", "臺南市", 120.21),
  tw("kaohsiung", "高雄市", 120.31),
  tw("pingtung", "屏東縣", 120.49),
  tw("yilan", "宜蘭縣", 121.75),
  tw("hualien", "花蓮縣", 121.6),
  tw("taitung", "臺東縣", 121.15),
  tw("penghu", "澎湖縣", 119.57),
  tw("kinmen", "金門縣", 118.32),
  tw("matsu", "連江縣（馬祖）", 119.95),
  { id: "hongkong", name: "香港", group: "港澳", tz: "Asia/Hong_Kong", lon: 114.17, std: 480 },
  { id: "macau", name: "澳門", group: "港澳", tz: "Asia/Macau", lon: 113.54, std: 480 },
  { id: "beijing", name: "北京", group: "中國大陸", tz: "Asia/Shanghai", lon: 116.4, std: 480 },
  { id: "tianjin", name: "天津", group: "中國大陸", tz: "Asia/Shanghai", lon: 117.2, std: 480 },
  { id: "harbin", name: "哈爾濱", group: "中國大陸", tz: "Asia/Shanghai", lon: 126.63, std: 480 },
  { id: "shanghai", name: "上海", group: "中國大陸", tz: "Asia/Shanghai", lon: 121.47, std: 480 },
  { id: "nanjing", name: "南京", group: "中國大陸", tz: "Asia/Shanghai", lon: 118.8, std: 480 },
  { id: "hangzhou", name: "杭州", group: "中國大陸", tz: "Asia/Shanghai", lon: 120.15, std: 480 },
  { id: "fuzhou", name: "福州", group: "中國大陸", tz: "Asia/Shanghai", lon: 119.3, std: 480 },
  { id: "xiamen", name: "廈門", group: "中國大陸", tz: "Asia/Shanghai", lon: 118.09, std: 480 },
  { id: "guangzhou", name: "廣州", group: "中國大陸", tz: "Asia/Shanghai", lon: 113.26, std: 480 },
  { id: "shenzhen", name: "深圳", group: "中國大陸", tz: "Asia/Shanghai", lon: 114.06, std: 480 },
  { id: "wuhan", name: "武漢", group: "中國大陸", tz: "Asia/Shanghai", lon: 114.3, std: 480 },
  { id: "xian", name: "西安", group: "中國大陸", tz: "Asia/Shanghai", lon: 108.94, std: 480 },
  { id: "chongqing", name: "重慶", group: "中國大陸", tz: "Asia/Shanghai", lon: 106.55, std: 480 },
  { id: "chengdu", name: "成都", group: "中國大陸", tz: "Asia/Shanghai", lon: 104.07, std: 480 },
  { id: "kunming", name: "昆明", group: "中國大陸", tz: "Asia/Shanghai", lon: 102.83, std: 480 },
  { id: "urumqi", name: "烏魯木齊（北京時間）", group: "中國大陸", tz: "Asia/Shanghai", lon: 87.62, std: 480 },
  { id: "tokyo", name: "東京", group: "日韓", tz: "Asia/Tokyo", lon: 139.69, std: 540 },
  { id: "osaka", name: "大阪", group: "日韓", tz: "Asia/Tokyo", lon: 135.5, std: 540 },
  { id: "seoul", name: "首爾", group: "日韓", tz: "Asia/Seoul", lon: 126.98 },
  { id: "singapore", name: "新加坡", group: "東南亞", tz: "Asia/Singapore", lon: 103.82 },
  { id: "kualalumpur", name: "吉隆坡", group: "東南亞", tz: "Asia/Kuala_Lumpur", lon: 101.69 },
  { id: "penang", name: "檳城", group: "東南亞", tz: "Asia/Kuala_Lumpur", lon: 100.33 },
  { id: "bangkok", name: "曼谷", group: "東南亞", tz: "Asia/Bangkok", lon: 100.5, std: 420 },
  { id: "manila", name: "馬尼拉", group: "東南亞", tz: "Asia/Manila", lon: 120.98, std: 480 },
  { id: "jakarta", name: "雅加達", group: "東南亞", tz: "Asia/Jakarta", lon: 106.85 },
  { id: "hochiminh", name: "胡志明市", group: "東南亞", tz: "Asia/Ho_Chi_Minh", lon: 106.7 },
  { id: "sydney", name: "雪梨", group: "澳洲紐西蘭", tz: "Australia/Sydney", lon: 151.21, std: 600 },
  { id: "melbourne", name: "墨爾本", group: "澳洲紐西蘭", tz: "Australia/Melbourne", lon: 144.96, std: 600 },
  { id: "brisbane", name: "布里斯本", group: "澳洲紐西蘭", tz: "Australia/Brisbane", lon: 153.03, std: 600 },
  { id: "auckland", name: "奧克蘭", group: "澳洲紐西蘭", tz: "Pacific/Auckland", lon: 174.76, std: 720 },
  { id: "vancouver", name: "溫哥華", group: "北美", tz: "America/Vancouver", lon: -123.12, std: -480 },
  { id: "seattle", name: "西雅圖", group: "北美", tz: "America/Los_Angeles", lon: -122.33, std: -480 },
  { id: "sanfrancisco", name: "舊金山", group: "北美", tz: "America/Los_Angeles", lon: -122.42, std: -480 },
  { id: "losangeles", name: "洛杉磯", group: "北美", tz: "America/Los_Angeles", lon: -118.24, std: -480 },
  { id: "houston", name: "休士頓", group: "北美", tz: "America/Chicago", lon: -95.37, std: -360 },
  { id: "chicago", name: "芝加哥", group: "北美", tz: "America/Chicago", lon: -87.63, std: -360 },
  { id: "toronto", name: "多倫多", group: "北美", tz: "America/Toronto", lon: -79.38, std: -300 },
  { id: "newyork", name: "紐約", group: "北美", tz: "America/New_York", lon: -74.01, std: -300 },
  { id: "london", name: "倫敦", group: "歐洲", tz: "Europe/London", lon: -0.13, std: 0 },
  { id: "paris", name: "巴黎", group: "歐洲", tz: "Europe/Paris", lon: 2.35, std: 60 },
  { id: "berlin", name: "柏林", group: "歐洲", tz: "Europe/Berlin", lon: 13.4, std: 60 },
  { id: "other", name: "其他地區（不校正）", group: "其他", tz: "", lon: 0 },
];

export type BirthTimeOptions = {
  /** unknown（不知道時辰）在這裡與 slot 相同，以 input.timeIndex 排盤 */
  timeMode: "clock" | "slot" | "unknown";
  clock: string;
  place: string;
  trueSolar: boolean;
};

type ChartTime = {
  /** 送進排盤的國曆日期 YYYY-M-D（已含所有校正） */
  dateStr: string;
  /** 時辰 0（子）…11（亥） */
  timeIndex: number;
};

export type ResolvedBirth = ChartTime & {
  /** 排盤實際採用的時間，例如 09:30；只知道時辰時為 null */
  usedClock: string | null;
  /** 給使用者看的校正說明 */
  notes: string[];
  /**
   * 另一種可能的命盤：boundary 為離時辰交界很近（minutes：離交界幾分鐘），
   * dst 為夏令時間切換當天的鐘點有兩種解釋
   */
  alt: (ChartTime & { minutes: number; reason: "boundary" | "dst" }) | null;
};

/** 離時辰交界幾分鐘以內要提醒 */
export const BOUNDARY_MINUTES = 15;
/** 出生地經度與標準時區中央經線相差超過這麼多分鐘，就建議用真太陽時 */
export const SOLAR_ADVICE_MINUTES = 30;

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

/** 某時區在某一刻（UTC 毫秒）的偏移分鐘數 */
function zoneOffset(timeZone: string, utcMs: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    })
      .formatToParts(new Date(utcMs))
      .map((p) => [p.type, p.value]),
  );
  return (Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute) - utcMs) / 60000;
}

/** 當地時鐘時間（以 UTC 欄位表示的「牆上時間」）對應的偏移分鐘數 */
function wallOffset(timeZone: string, wallMs: number) {
  const first = zoneOffset(timeZone, wallMs - 8 * 3600e3);
  return zoneOffset(timeZone, wallMs - first * 60000);
}

/**
 * 瀏覽器的時區資料是否含歷史紀錄。極舊的瀏覽器可能只有現行規則，
 * 那樣就判斷不出當年的夏令時間，要提醒使用者。
 */
export function hasHistoricalTimeZoneData() {
  try {
    return zoneOffset("Asia/Taipei", Date.UTC(1979, 6, 15, 4)) === 540;
  } catch {
    return false;
  }
}

/**
 * 某個當地鐘點可能對應的 UTC 偏移，依時間先後排列。
 * 平常只有一個；夏令時間開始時被跳過的鐘點一個都沒有；結束時重複的鐘點有兩個。
 */
function wallOffsets(timeZone: string, wallMs: number) {
  const nearby = new Set([zoneOffset(timeZone, wallMs - 86400000), zoneOffset(timeZone, wallMs + 86400000), wallOffset(timeZone, wallMs)]);
  return [...nearby].filter((o) => zoneOffset(timeZone, wallMs - o * 60000) === o).sort((a, b) => b - a);
}

/** 該地當年的標準時間偏移（分鐘） */
function standardOffset(place: Place, year: number) {
  if (place.std !== undefined) return place.std;
  return Math.min(zoneOffset(place.tz, Date.UTC(year, 0, 15, 4)), zoneOffset(place.tz, Date.UTC(year, 6, 15, 4)));
}

/** 出生地經度與標準時區中央經線的時間差（分鐘，東正西負） */
export function longitudeCorrection(placeId: string, year: number) {
  const place = PLACES.find((p) => p.id === placeId);
  if (!place?.tz) return null;
  return 4 * place.lon - standardOffset(place, year);
}

/**
 * 均時差（分鐘）：真太陽時減平太陽時。NOAA 太陽位置演算法（取自 Meeus），1900–2100 年誤差在數秒內。
 */
export function equationOfTime(utcMs: number) {
  const rad = Math.PI / 180;
  const t = (utcMs / 86400000 + 2440587.5 - 2451545) / 36525;
  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos((125.04 - 1934.136 * t) * rad);
  const y = Math.tan((eps / 2) * rad) ** 2;
  const L = l0 * rad;
  const M = m * rad;
  const value =
    y * Math.sin(2 * L) -
    2 * e * Math.sin(M) +
    4 * e * y * Math.sin(M) * Math.cos(2 * L) -
    0.5 * y * y * Math.sin(4 * L) -
    1.25 * e * e * Math.sin(2 * M);
  return (4 * value) / rad;
}

function solarDateOfInput(input: BirthInput) {
  if (input.calendar === "lunar") {
    const s = lunarToSolar(input.year, input.month, input.day, input.isLeapMonth);
    return { y: s.solarYear, m: s.solarMonth, d: s.solarDay };
  }
  return { y: input.year, m: input.month, d: input.day };
}

/** 牆上時間 → 排盤用的日期與時辰；23:00 後的晚子時換成隔日子時 */
function chartTimeOf(wallMs: number): ChartTime & { lateZi: boolean } {
  let index = timeIndexFromClock(new Date(wallMs).getUTCHours());
  let ms = wallMs;
  const lateZi = index === 12;
  if (lateZi) {
    ms += 86400000;
    index = 0;
  }
  const date = new Date(ms);
  return { dateStr: `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`, timeIndex: index, lateZi };
}

/** 時辰交界在奇數整點（23:00、01:00…21:00）。回傳與最近交界的分鐘差，正值表示已過交界 */
function boundaryDistance(wallMs: number) {
  const d = new Date(wallMs);
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  const sinceOdd = (((minutes - 60) % 120) + 120) % 120;
  return sinceOdd <= 60 ? sinceOdd : sinceOdd - 120;
}

export function resolveBirth(input: BirthInput, options: BirthTimeOptions): ResolvedBirth {
  const { y, m, d } = solarDateOfInput(input);
  const place = PLACES.find((p) => p.id === options.place);
  const notes: string[] = [];
  if (place?.tz && !hasHistoricalTimeZoneData())
    notes.push("你的瀏覽器缺少歷史時區資料，無法判斷出生當年是否實施夏令時間。請更新瀏覽器；或確認當年沒有夏令時間後再排盤。");

  if (options.timeMode !== "clock") {
    let wall = Date.UTC(y, m - 1, d, 12, 0);
    if (place?.tz && wallOffset(place.tz, wall) !== standardOffset(place, y))
      notes.push("出生當時時鐘比標準時間快；若時辰是照當時鐘點推算的，建議改用「知道幾點」輸入，系統會自動校正。");
    let timeIndex = input.timeIndex;
    if (timeIndex === 12) {
      wall += 86400000;
      timeIndex = 0;
      notes.push("23:00 後出生屬晚子時，以隔日的子時排盤。");
    }
    const date = new Date(wall);
    return {
      dateStr: `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`,
      timeIndex,
      usedClock: null,
      notes,
      alt: null,
    };
  }

  const [hh, mm] = options.clock.split(":").map(Number);
  const clockWall = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  const original = hhmm(clockWall);
  let wall = clockWall;
  let otherWall: number | null = null;

  if (place?.tz) {
    const standard = standardOffset(place, y);
    const offsets = wallOffsets(place.tz, clockWall);
    // 撥快時跳過的鐘點：先當作還沒撥快；重複的鐘點：先當作第一次（夏令時間）
    const offset = offsets[0] ?? zoneOffset(place.tz, clockWall - 86400000);
    const other = offsets.length === 2 ? offsets[1] : offsets.length === 0 ? zoneOffset(place.tz, clockWall + 86400000) : null;
    const lmt = 4 * place.lon - standard;
    const correct = (o: number) => {
      const w = clockWall - (o - standard) * 60000;
      return options.trueSolar ? w + Math.round((lmt + equationOfTime(w - standard * 60000)) * 60000) : w;
    };

    if (offsets.length === 0)
      notes.push(`出生當天時鐘撥快，${original} 這個鐘點並不存在，可能是記錄有誤；先當作還沒撥快的時間計算。`);
    if (offsets.length === 2) notes.push(`出生當天夏令時間結束，${original} 這個鐘點出現了兩次；先當作第一次（夏令時間）計算。`);

    const shift = offset - standard;
    if (shift !== 0) {
      wall -= shift * 60000;
      const reason =
        place.tz === "Asia/Taipei" && offset === 540 && y >= 1937 && y <= 1945
          ? "日治時期台灣使用東京時間（UTC+9）"
          : shift === 60
            ? "出生當時實施日光節約時間，時鐘撥快了一小時"
            : `出生當時當地時鐘比標準時間${shift > 0 ? "快" : "慢"} ${Math.abs(shift)} 分鐘`;
      notes.push(`${reason}，已將 ${original} 調回標準時間 ${hhmm(wall)}。`);
    }
    if (options.trueSolar) {
      const eot = equationOfTime(wall - standard * 60000);
      const before = hhmm(wall);
      wall += Math.round((lmt + eot) * 60000);
      notes.push(`真太陽時：經度修正 ${signed(lmt)} 分、均時差 ${signed(eot)} 分，${before} → ${hhmm(wall)}。`);
    }
    if (other !== null) otherWall = correct(other);
  }

  const main = chartTimeOf(wall);
  if (main.lateZi) notes.push("23:00 後出生屬晚子時，以隔日的子時排盤。");

  let alt: ResolvedBirth["alt"] = null;
  if (otherWall !== null) {
    const second = chartTimeOf(otherWall);
    if (second.dateStr !== main.dateStr || second.timeIndex !== main.timeIndex) {
      alt = { dateStr: second.dateStr, timeIndex: second.timeIndex, minutes: 0, reason: "dst" };
      notes.push(`另一種解釋是 ${hhmm(otherWall)}（${slotName(second.timeIndex)}），兩者命盤不同。`);
    } else {
      notes.push(`兩種解釋都屬${slotName(main.timeIndex)}，不影響排盤。`);
    }
  }

  const distance = boundaryDistance(wall);
  if (!alt && Math.abs(distance) <= BOUNDARY_MINUTES) {
    const altWall = wall + (distance >= 0 ? -(distance + 1) : -distance) * 60000;
    const { dateStr, timeIndex } = chartTimeOf(altWall);
    alt = { dateStr, timeIndex, minutes: Math.abs(distance), reason: "boundary" };
  }

  return { dateStr: main.dateStr, timeIndex: main.timeIndex, usedClock: hhmm(wall), notes, alt };
}

/** 時辰名稱（不帶早晚），例如「午時」 */
export function slotName(timeIndex: number) {
  return TIME_SLOTS[timeIndex].label.replace(/^[早晚]/, "");
}

function signed(n: number) {
  const r = Math.round(n);
  return r >= 0 ? `+${r}` : `${r}`;
}
