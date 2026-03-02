import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export function getPagination(query) {
  const parsed = paginationQuerySchema.parse(query);
  const offset = (parsed.page - 1) * parsed.limit;
  return { ...parsed, offset };
}
