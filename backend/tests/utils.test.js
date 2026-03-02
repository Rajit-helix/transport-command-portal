import { getPagination } from "../src/utils/pagination.js";
import { parseSort } from "../src/utils/sort.js";

describe("utility helpers", () => {
  describe("parseSort", () => {
    const allowedColumns = ["created_at", "price", "status"];

    it("returns fallback when sortBy is missing", () => {
      expect(parseSort(undefined, allowedColumns, "created_at")).toBe("created_at");
    });

    it("returns fallback when sortBy is not allowed", () => {
      expect(parseSort("unknown", allowedColumns, "created_at")).toBe("created_at");
    });

    it("returns sortBy when it is in the allowed list", () => {
      expect(parseSort("price", allowedColumns, "created_at")).toBe("price");
    });
  });

  describe("getPagination", () => {
    it("returns defaults and computed offset when query is empty", () => {
      expect(getPagination({})).toEqual({ page: 1, limit: 20, offset: 0 });
    });

    it("parses query values and computes offset", () => {
      expect(getPagination({ page: "3", limit: "10" })).toEqual({
        page: 3,
        limit: 10,
        offset: 20
      });
    });
  });
});
