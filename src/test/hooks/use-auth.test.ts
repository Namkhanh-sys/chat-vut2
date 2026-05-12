import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback) => {
        callback("INITIAL_SESSION", null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() =>
        Promise.resolve({ data: null, error: null })
      ),
    })),
  },
}));

describe("useAuth Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with null session", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it("should have signIn method", () => {
    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.signIn).toBe("function");
  });

  it("should have signUp method", () => {
    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.signUp).toBe("function");
  });

  it("should have signOut method", () => {
    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.signOut).toBe("function");
  });

  it("should have resetPassword method", () => {
    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.resetPassword).toBe("function");
  });
});
