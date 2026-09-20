/**
 * Reads a JSON response from one of this app's own API routes.
 *
 * Calling `res.json()` directly is what produces
 *   Unexpected token '<', "<!DOCTYPE "... is not valid JSON
 * whenever something upstream of the route answers instead of the route itself —
 * a proxy timeout page, a platform 502, a 404 from a deployment missing the
 * route. The body is HTML, the parse fails, and the real failure (a status code
 * and often a plain description of it) is thrown away.
 *
 * So: read the body once as text, parse it only if it is actually JSON, and
 * otherwise raise an error that names the status.
 */
export async function readJsonResponse<T>(res: Response, action: string): Promise<T> {
  const text = await res.text();

  let parsed: unknown = null;
  let isJson = false;
  try {
    parsed = JSON.parse(text);
    isJson = true;
  } catch {
    isJson = false;
  }

  if (isJson) {
    const body = parsed as { error?: string };
    if (!res.ok) throw new Error(body?.error || `${action} failed (${res.status}).`);
    return parsed as T;
  }

  // Not JSON. Say what came back instead, so the cause is visible rather than
  // surfacing as a parse error about a character.
  throw new Error(describeNonJson(res, text, action));
}

function describeNonJson(res: Response, text: string, action: string): string {
  const looksLikeHtml = /^\s*<(?:!doctype|html)/i.test(text);
  const status = `${res.status}${res.statusText ? ` ${res.statusText}` : ''}`;

  if (res.status === 413) {
    return `${action} failed: the file is too large for the server to accept (${status}).`;
  }
  if (res.status === 504 || res.status === 524) {
    return `${action} timed out on the server (${status}). Large images can exceed the hosting timeout — try a smaller file.`;
  }
  if (res.status === 502 || res.status === 503) {
    return `${action} failed: the server did not complete the request (${status}). It may have run out of memory or restarted.`;
  }
  if (res.status === 404) {
    return `${action} failed: the API route was not found (${status}). The deployment may be out of date.`;
  }
  if (looksLikeHtml) {
    return `${action} failed: the server returned a web page instead of data (${status}).`;
  }

  const snippet = text.trim().slice(0, 120);
  return `${action} failed (${status})${snippet ? `: ${snippet}` : '.'}`;
}
