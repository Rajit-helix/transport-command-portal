import xss from "xss";

function sanitizeValue(value) {
  if (typeof value === "string") {
    return xss(value.trim());
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    const clean = {};
    for (const [key, inner] of Object.entries(value)) {
      clean[key] = sanitizeValue(inner);
    }
    return clean;
  }
  return value;
}

export function sanitizeInput(req, _res, next) {
  req.body = sanitizeValue(req.body || {});
  req.query = sanitizeValue(req.query || {});
  req.params = sanitizeValue(req.params || {});
  next();
}
