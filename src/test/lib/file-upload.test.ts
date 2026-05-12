import { describe, it, expect } from "vitest";
import { isImageFile, getFileIcon } from "@/lib/file-upload";

describe("File Upload Utilities", () => {
  describe("isImageFile", () => {
    it("should identify JPEG as image", () => {
      expect(isImageFile("image/jpeg")).toBe(true);
    });

    it("should identify PNG as image", () => {
      expect(isImageFile("image/png")).toBe(true);
    });

    it("should identify GIF as image", () => {
      expect(isImageFile("image/gif")).toBe(true);
    });

    it("should identify WEBP as image", () => {
      expect(isImageFile("image/webp")).toBe(true);
    });

    it("should not identify PDF as image", () => {
      expect(isImageFile("application/pdf")).toBe(false);
    });

    it("should not identify text as image", () => {
      expect(isImageFile("text/plain")).toBe(false);
    });
  });

  describe("getFileIcon", () => {
    it("should return image emoji for image types", () => {
      expect(getFileIcon("image/jpeg")).toBe("📷");
      expect(getFileIcon("image/png")).toBe("📷");
    });

    it("should return PDF emoji for PDF files", () => {
      expect(getFileIcon("application/pdf")).toBe("📄");
    });

    it("should return document emoji for word files", () => {
      expect(getFileIcon("application/msword")).toBe("📝");
    });

    it("should return generic file emoji for unknown types", () => {
      expect(getFileIcon("unknown/type")).toBe("📎");
    });
  });
});
