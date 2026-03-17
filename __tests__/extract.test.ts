import { describe, it, expect, vi } from "vitest";

vi.mock("pdf-parse", () => ({ default: vi.fn() }));

describe("prd extract route", () => {
  it("returns 400 for unsupported file type", async () => {
    const { POST } = await import("@/app/api/v1/prd/extract/route");
    const formData = new FormData();
    formData.append("file", new File(["hello"], "doc.txt", { type: "text/plain" }));
    const req = new Request("http://localhost/api/v1/prd/extract", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
