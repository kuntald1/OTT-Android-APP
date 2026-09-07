// Manual query-string parsing — avoids relying on the WHATWG URL API,
// which isn't guaranteed to be polyfilled in RN without an extra package.
export function parseQueryParams(url: string): Record<string, string> {
  const queryStart = url.indexOf("?");
  if (queryStart === -1) return {};
  const queryString = url.slice(queryStart + 1);
  const params: Record<string, string> = {};
  for (const pair of queryString.split("&")) {
    if (!pair) continue;
    const [key, value = ""] = pair.split("=");
    params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, " "));
  }
  return params;
}
