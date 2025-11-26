export async function googleApiFetch(
  url,
  { method = "GET", token, headers = {}, body, responseType = "json" } = {},
) {
  if (!token) {
    throw new Error("Missing Google API token");
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google API error ${res.status}: ${text}`);
  }

  if (responseType === "json") {
    return res.json();
  }

  if (responseType === "text") {
    return res.text();
  }

  return res.arrayBuffer();
}
