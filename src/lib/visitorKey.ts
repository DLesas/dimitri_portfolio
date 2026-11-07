/**
 * Who a request is from, for the API routes' limits: their IP, or for IPv6 its /64,
 * which one device can roam within
 */
export function visitorKey(ip: string | undefined) {
  if (!ip) return "unknown";
  if (ip.includes(".")) return ip.slice(ip.lastIndexOf(":") + 1); // IPv4, or IPv4-mapped IPv6
  const [head, tail = ""] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = [...left, ...Array(8 - left.length - right.length).fill("0"), ...right];
  return `${groups.slice(0, 4).map((group) => group.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}
