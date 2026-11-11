"use client";

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { longitudeCorrection, PLACES, resolveBirth, slotName, SOLAR_ADVICE_MINUTES } from "@/lib/birthtime";
import {
  LUNAR_DAYS,
  LUNAR_MONTHS,
  MAX_YEAR,
  MIN_YEAR,
  TIME_SLOTS,
  daysInMonth,
  leapMonthOf,
  rocYear,
  timeIndexFromClock,
  type BirthInput,
  type CalendarType,
  type Gender,
} from "@/lib/ziwei";

const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
/** 農曆閏月在月份選單裡的值：月份 + 100 */
const LEAP_OFFSET = 100;

/** unknown：不知道出生時辰，送出後由使用者從各時辰的命盤特徵中挑選 */
export type TimeMode = "clock" | "slot" | "unknown";

/** 表單的完整狀態，送出時會記在使用者自己的瀏覽器，下次直接帶入 */
export type SavedBirth = {
  input: BirthInput;
  timeMode: TimeMode;
  clock: string;
  place: string;
  trueSolar: boolean;
};

/** 尚未填完的表單：性別可以還沒選 */
export type BirthDraft = Omit<SavedBirth, "input"> & { input: Omit<BirthInput, "gender"> & { gender: Gender | null } };

/**
 * 空白表單。性別與出生時間刻意不給預設值：性別決定大限順逆、時間決定命宮，
 * 使用者沒注意就送出會排出錯的命盤。
 */
export const EMPTY_BIRTH: BirthDraft = {
  input: {
    name: "",
    gender: null,
    calendar: "solar",
    year: 1990,
    month: 1,
    day: 1,
    isLeapMonth: false,
    timeIndex: 6,
  },
  timeMode: "clock",
  clock: "",
  place: "taipei",
  trueSolar: false,
};

type Props = {
  loading: boolean;
  initial: SavedBirth | BirthDraft;
  remembered?: boolean;
  onForget?: () => void;
  onSubmit: (saved: SavedBirth) => void;
  title?: string;
  submitLabel?: string;
  /** 表單標題的層級，放在其他區塊裡時要跟著降級 */
  headingLevel?: "h2" | "h3" | "h4";
  /** 排盤結果是否提供相鄰時辰的切換比對（合盤沒有） */
  canCompare?: boolean;
  /** 是否提供「不知道時辰」選項（合盤沒有，兩張盤都要先確定時辰） */
  allowUnknownTime?: boolean;
  /** 標題下方的資料說明 */
  note?: string;
};

export default function BirthForm({
  loading,
  initial,
  remembered = false,
  onForget,
  onSubmit,
  title = "輸入生辰資料",
  submitLabel = "開始排盤",
  headingLevel: Heading = "h2",
  canCompare = true,
  allowUnknownTime = false,
  note = "資料只在你的瀏覽器中計算與保存，不會上傳。",
}: Props) {
  const [form, setForm] = useState<BirthDraft["input"]>(initial.input);
  const [timeMode, setTimeMode] = useState<TimeMode>(
    initial.timeMode === "unknown" && !allowUnknownTime ? "slot" : initial.timeMode,
  );
  /** 按過送出才顯示必填錯誤，避免一打開表單就滿是紅字 */
  const [attempted, setAttempted] = useState(false);
  const genderRef = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState(initial.clock);
  const [place, setPlace] = useState(initial.place);
  const [trueSolar, setTrueSolar] = useState(initial.trueSolar);
  const id = useId();
  const clockRef = useRef<HTMLInputElement>(null);

  const isLunar = form.calendar === "lunar";
  const leapMonth = isLunar ? leapMonthOf(form.year) : null;
  // 換年份後原本選的閏月可能不存在，一律以當年實際的閏月為準
  const isLeap = isLunar && form.isLeapMonth && leapMonth === form.month;
  const maxDay = daysInMonth({ ...form, isLeapMonth: isLeap });
  const day = Math.min(form.day, maxDay);

  // 時間欄可以被清空；空白時不能默默當成 00:00 排盤
  const clockValid = /^([01]\d|2[0-3]):[0-5]\d/.test(clock);
  const clockMissing = timeMode === "clock" && !clockValid;
  const genderMissing = form.gender === null;
  const clockIndex = clockValid ? timeIndexFromClock(Number(clock.slice(0, 2))) : form.timeIndex;
  const timeIndex = timeMode === "clock" ? clockIndex : form.timeIndex;
  // 預覽校正結果時性別不影響，先以任一性別代入
  const finalInput: BirthInput = { ...form, gender: form.gender ?? "女", name: form.name.trim(), day, isLeapMonth: isLeap, timeIndex };
  const options = { timeMode, clock, place, trueSolar };
  let preview: ReturnType<typeof resolveBirth> | null = null;
  try {
    preview = clockMissing || timeMode === "unknown" ? null : resolveBirth(finalInput, options);
  } catch {
    preview = null;
  }
  const solarGap = timeMode === "clock" ? longitudeCorrection(place, form.year) : null;
  const adviseSolar = !trueSolar && solarGap !== null && Math.abs(solarGap) >= SOLAR_ADVICE_MINUTES;

  function update<K extends keyof BirthDraft["input"]>(key: K, value: BirthDraft["input"][K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (genderMissing) {
      genderRef.current?.querySelector("input")?.focus();
      return;
    }
    if (clockMissing) {
      clockRef.current?.focus();
      return;
    }
    onSubmit({ input: finalInput, ...options });
  }

  const monthOptions = MONTHS.flatMap((m) => {
    const base = { value: m, label: isLunar ? `${LUNAR_MONTHS[m - 1]}月` : `${m} 月` };
    return isLunar && leapMonth === m ? [base, { value: m + LEAP_OFFSET, label: `閏${LUNAR_MONTHS[m - 1]}月` }] : [base];
  });

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-line bg-surface/90 p-5 shadow-[0_1px_0_var(--line),0_20px_50px_-30px_rgba(40,20,60,0.35)] backdrop-blur sm:p-7"
    >
      <Heading className="font-serif text-xl font-bold tracking-wide">{title}</Heading>
      <p className="mt-1 text-sm text-muted">{note}</p>
      {remembered && (
        <p className="mt-3 flex flex-wrap items-center justify-between gap-x-3 rounded-lg bg-accent-soft px-3 text-sm text-ink-soft">
          <span className="py-2">已帶入之前輸入的資料</span>
          <button type="button" onClick={onForget} className="min-h-11 px-3 text-accent underline underline-offset-4">
            清空表單
          </button>
        </p>
      )}

      <div className="mt-6 space-y-5">
        <Field label="姓名" htmlFor={`${id}-name`} hint="選填">
          <input
            id={`${id}-name`}
            type="text"
            maxLength={20}
            autoComplete="off"
            placeholder="例如：王小明"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="性別" as="fieldset">
            <div ref={genderRef}>
              <Segmented<Gender>
                name={`${id}-gender`}
                value={form.gender}
                invalid={attempted && genderMissing}
                describedBy={attempted && genderMissing ? `${id}-gender-error` : undefined}
                onChange={(v) => update("gender", v)}
                options={[
                  { value: "女", label: "女" },
                  { value: "男", label: "男" },
                ]}
              />
            </div>
          </Field>
          <Field label="曆法" as="fieldset">
            <Segmented<CalendarType>
              name={`${id}-calendar`}
              value={form.calendar}
              onChange={(v) => update("calendar", v)}
              options={[
                { value: "solar", label: "國曆" },
                { value: "lunar", label: "農曆" },
              ]}
            />
          </Field>
        </div>

        {attempted && genderMissing && (
          <p id={`${id}-gender-error`} role="alert" className="-mt-2 text-sm text-ji">
            請選擇性別：男女的大限方向相反，會排出不同的運勢。
          </p>
        )}

        <Field
          label="出生日期"
          as="fieldset"
          hint={isLunar ? (leapMonth ? `${form.year} 年有閏${LUNAR_MONTHS[leapMonth - 1]}月` : `${form.year} 年沒有閏月`) : undefined}
        >
          <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-[1.7fr_1fr_1fr]">
            <Select
              className="col-span-2 min-[400px]:col-span-1"
              aria-label="出生年"
              value={form.year}
              onChange={(v) => update("year", v)}
              options={YEARS.map((y) => ({ value: y, label: `${y}（${rocYear(y)}）` }))}
            />
            <Select
              aria-label="出生月"
              value={isLeap ? form.month + LEAP_OFFSET : form.month}
              onChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  month: v > LEAP_OFFSET ? v - LEAP_OFFSET : v,
                  isLeapMonth: v > LEAP_OFFSET,
                }))
              }
              options={monthOptions}
            />
            <Select
              aria-label="出生日"
              value={day}
              onChange={(v) => update("day", v)}
              options={Array.from({ length: maxDay }, (_, i) => ({
                value: i + 1,
                label: isLunar ? LUNAR_DAYS[i] : `${i + 1} 日`,
              }))}
            />
          </div>
        </Field>

        <Field label="出生時間" as="fieldset">
          <Segmented<TimeMode>
            name={`${id}-timemode`}
            value={timeMode}
            onChange={setTimeMode}
            options={[
              { value: "clock", label: "知道幾點" },
              { value: "slot", label: allowUnknownTime ? "知道時辰" : "只知道時辰" },
              ...(allowUnknownTime ? [{ value: "unknown" as const, label: "不知道" }] : []),
            ]}
          />
          <div className="mt-2">
            {timeMode === "clock" ? (
              <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <input
                  ref={clockRef}
                  id={`${id}-clock`}
                  type="time"
                  aria-label="出生時間（時：分）"
                  aria-invalid={attempted && clockMissing}
                  aria-describedby={attempted && clockMissing ? `${id}-clock-error` : undefined}
                  value={clock}
                  onChange={(e) => setClock(e.target.value)}
                  className={`${inputClass} tabular-nums`}
                />
                <span className="text-sm whitespace-nowrap text-ink-soft" aria-live="polite">
                  屬<strong className="mx-0.5 font-serif text-base text-accent">{clockMissing ? "—" : TIME_SLOTS[clockIndex].label}</strong>
                </span>
                {attempted && clockMissing && (
                  <p id={`${id}-clock-error`} role="alert" className="col-span-2 text-sm text-ji">
                    {allowUnknownTime
                      ? "請輸入出生時間；只記得大概的時辰可改選「知道時辰」，完全不知道就選「不知道」。"
                      : "請輸入出生時間；不知道幾點的話，可以改選「只知道時辰」。"}
                  </p>
                )}
              </div>
            ) : timeMode === "unknown" ? (
              <p className="rounded-lg bg-surface-2/60 px-3.5 py-3 text-sm leading-relaxed text-ink-soft">
                時辰決定命宮，沒有時辰就排不出命盤。送出後會列出每個時辰的命宮主星與個性，挑最像你的那一個；之後也可以再請家人確認出生時間。
              </p>
            ) : (
              <Select
                aria-label="出生時辰"
                value={form.timeIndex}
                onChange={(v) => update("timeIndex", v)}
                options={TIME_SLOTS.map((t) => ({ value: t.index, label: `${t.label}（${t.range}）` }))}
              />
            )}
            {!clockMissing && timeMode !== "unknown" && !preview?.notes.length && (
              <p className="mt-2 text-xs text-muted">時辰範圍 {TIME_SLOTS[timeIndex].range}。</p>
            )}
          </div>
        </Field>

        <Field label="出生地" htmlFor={`${id}-place`} hint="用來校正夏令時間與時差">
          <div className="relative">
            <select
              id={`${id}-place`}
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className={`${inputClass} appearance-none pr-8`}
            >
              {[...new Set(PLACES.map((p) => p.group))].map((group) => (
                <optgroup key={group} label={group}>
                  {PLACES.filter((p) => p.group === group).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown />
          </div>
          {timeMode === "clock" && place !== "other" && (
            <label className="mt-2 flex min-h-11 cursor-pointer items-start gap-2.5 py-1 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={trueSolar}
                onChange={(e) => setTrueSolar(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-accent"
              />
              <span>
                以真太陽時校正
                {adviseSolar ? (
                  <span className="block text-xs text-ink-soft">
                    此地的鐘錶時間比太陽時{solarGap! > 0 ? "慢" : "快"}約 {Math.round(Math.abs(solarGap!))} 分鐘，
                    <strong className="font-medium text-accent">建議勾選</strong>，時辰才不會排錯。
                  </span>
                ) : (
                  <span className="block text-xs text-muted">依出生地經度與季節修正幾分鐘，部分流派採用；不確定可以不勾。</span>
                )}
              </span>
            </label>
          )}
        </Field>

        {preview && (preview.notes.length > 0 || preview.alt) && (
          <div role="status" className="rounded-lg border border-gold/40 bg-gold/10 px-3.5 py-3 text-sm leading-relaxed text-ink-soft">
            {preview.notes.length > 0 && (
              <>
                <p className="font-medium text-ink">排盤前的校正</p>
                <ul className="mt-1 mb-1.5 space-y-1">
                  {preview.notes.map((n) => (
                    <li key={n}>・{n}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="text-ink">
              將以 {preview.usedClock ? `${preview.usedClock}（${slotName(preview.timeIndex)}）` : slotName(preview.timeIndex)}排盤。
            </p>
            {preview.alt?.reason === "boundary" && (
              <p className="mt-1.5">
                這個時間離{slotName(preview.alt.timeIndex)}只差 {Math.max(1, preview.alt.minutes)} 分鐘。
                {canCompare
                  ? `出生時間若是估的，排盤後可以切換到${slotName(preview.alt.timeIndex)}的命盤比對看看。`
                  : `出生時間若是估的，請先確認時辰，${slotName(preview.alt.timeIndex)}的合盤結果會不一樣。`}
              </p>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-serif text-base font-bold tracking-[0.3em] text-surface transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
      >
        {loading ? "排盤中…" : timeMode === "unknown" ? "列出各時辰命盤" : submitLabel}
      </button>
    </form>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-line bg-paper/60 px-3 text-base text-ink placeholder:text-muted transition focus:border-accent focus:bg-surface focus:outline-none";

function Field({
  label,
  hint,
  htmlFor,
  as = "div",
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  as?: "div" | "fieldset";
  children: ReactNode;
}) {
  const labelContent = (
    <span className="flex items-baseline justify-between gap-2">
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </span>
  );
  if (as === "fieldset") {
    return (
      <fieldset>
        <legend className="mb-2 w-full">{labelContent}</legend>
        {children}
      </fieldset>
    );
  }
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block">
        {labelContent}
      </label>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
  invalid = false,
  describedBy,
}: {
  name: string;
  value: T | null;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`grid h-11 rounded-lg border bg-paper/60 p-1 ${invalid ? "border-ji" : "border-line"}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <label
          key={o.value}
          className="relative flex cursor-pointer items-center justify-center rounded-md text-[15px] text-ink-soft transition has-[:checked]:bg-surface has-[:checked]:font-bold has-[:checked]:text-accent has-[:checked]:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  ...rest
}: {
  value: number;
  onChange: (v: number) => void;
  options: { value: number; label: string }[];
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const { className, ...attrs } = rest;
  return (
    <div className={`relative ${className ?? ""}`}>
      <select
        {...attrs}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${inputClass} appearance-none pr-8`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown />
    </div>
  );
}

function ChevronDown() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted"
    >
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
