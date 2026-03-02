import { z } from "zod";
import { badRequest } from "../utils/errors.js";

export function validate(schema) {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query
      });
      req.validated = parsed;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(
          badRequest(
            "Validation failed",
            error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message
            }))
          )
        );
      }
      return next(error);
    }
  };
}
