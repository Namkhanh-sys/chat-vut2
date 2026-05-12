import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useI18n } from "@/lib/i18n";

describe("useI18n Hook", () => {
  it("should provide translation function", () => {
    const { result } = renderHook(() => useI18n());

    expect(typeof result.current.t).toBe("function");
  });

  it("should provide language state", () => {
    const { result } = renderHook(() => useI18n());

    expect(result.current.lang).toBeDefined();
    expect(["vi", "en"]).toContain(result.current.lang);
  });

  it("should provide setLang function", () => {
    const { result } = renderHook(() => useI18n());

    expect(typeof result.current.setLang).toBe("function");
  });

  it("should change language", () => {
    const { result } = renderHook(() => useI18n());

    const initialLang = result.current.lang;

    act(() => {
      result.current.setLang(initialLang === "vi" ? "en" : "vi");
    });

    expect(result.current.lang).not.toBe(initialLang);
  });

  it("should translate keys", () => {
    const { result } = renderHook(() => useI18n());

    const translation = result.current.t("chat.today");
    expect(typeof translation).toBe("string");
    expect(translation.length).toBeGreaterThan(0);
  });
});
