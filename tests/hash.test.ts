import { describe, expect, it } from "vitest";
import { hashText } from "../src/lib/hash";

describe("hashText", () => {
  it("returns stable hashes for identical input and distinct hashes for common variants", () => {
    expect(hashText("abc")).toBe(hashText("abc"));
    expect(hashText("abc")).not.toBe(hashText("abcd"));
    expect(hashText("")).toBe("811c9dc5");
  });
});
