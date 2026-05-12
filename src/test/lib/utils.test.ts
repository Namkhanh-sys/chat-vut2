import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility function", () => {
  it("should merge class names", () => {
    const result = cn("px-2", "py-1");
    expect(result).toContain("px-2");
    expect(result).toContain("py-1");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toContain("base");
    expect(result).toContain("active");
  });

  it("should resolve tailwind conflicts", () => {
    const result = cn("px-2", "px-4");
    expect(result).toContain("px-4"); // Later value should win
  });

  it("should handle empty input", () => {
    const result = cn("");
    expect(typeof result).toBe("string");
  });
});
