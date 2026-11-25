import { currentIdToken } from "@/lib/account";

export async function memberFetch(url: string, init?: RequestInit) {
  const send = async (refresh: boolean) => {
    const headers = new Headers(init?.headers);
    const token = await currentIdToken(refresh);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers, cache: "no-store" });
  };
  const result = await send(false);
  return result.status === 401 ? send(true) : result;
}

/**
 * 給使用者看的錯誤說明。伺服器回的中文訊息照用；瀏覽器的網路錯誤（Chrome「Failed to fetch」、
 * Safari「Load failed」、Firefox「NetworkError」）與無法解讀的回應（例如主機逾時回傳的 HTML）改成中文。
 */
export function userMessage(error: unknown, fallback = "發生錯誤，請稍後再試。") {
  const name = (error as Error)?.name;
  const message = (error as Error)?.message ?? "";
  if (name === "TypeError" && /fetch|load failed|network/i.test(message)) return "連線中斷了，請確認網路後再按一次。";
  if (name === "SyntaxError") return "伺服器暫時沒有回應，請稍後再按一次。";
  if (name === "AbortError" || name === "TimeoutError") return "等候太久了，請再按一次。";
  return message || fallback;
}
