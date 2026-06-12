export function getApiHeaders(): HeadersInit {
  const key = typeof window !== "undefined" ? localStorage.getItem("anthropic_api_key") : null;
  return {
    "Content-Type": "application/json",
    ...(key ? { "x-anthropic-key": key } : {}),
  };
}
