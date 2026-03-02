export function parseSort(sortBy, allowedColumns, fallback = "created_at") {
  if (!sortBy) {
    return fallback;
  }
  if (!allowedColumns.includes(sortBy)) {
    return fallback;
  }
  return sortBy;
}
