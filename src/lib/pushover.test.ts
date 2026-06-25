import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { validateUserKey, sendPushover } from "./pushover";

function mockFetchOnce(json: unknown) {
  const fn = vi.fn().mockResolvedValue({ json: async () => json } as Response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe("validateUserKey", () => {
  it("returns ok with devices on status 1", async () => {
    mockFetchOnce({ status: 1, devices: ["iphone"] });
    const res = await validateUserKey("u-key");
    expect(res).toEqual({ ok: true, devices: ["iphone"] });
  });

  it("returns the API error on status 0", async () => {
    mockFetchOnce({ status: 0, errors: ["user key is invalid"] });
    const res = await validateUserKey("bad");
    expect(res).toEqual({ ok: false, error: "user key is invalid" });
  });

  it("sends token + user in the request body", async () => {
    const fn = mockFetchOnce({ status: 1 });
    await validateUserKey("u-key", "iphone");
    const [, init] = fn.mock.calls[0];
    const body = (init!.body as URLSearchParams);
    expect(body.get("token")).toBe("test-app-token");
    expect(body.get("user")).toBe("u-key");
    expect(body.get("device")).toBe("iphone");
  });
});

describe("sendPushover", () => {
  it("posts title and message and returns receipt", async () => {
    const fn = mockFetchOnce({ status: 1, receipt: "r123" });
    const res = await sendPushover({
      userKey: "u-key",
      title: "Hi",
      message: "Body",
    });
    expect(res).toEqual({ ok: true, receipt: "r123", request: undefined });
    const body = (fn.mock.calls[0][1]!.body as URLSearchParams);
    expect(body.get("title")).toBe("Hi");
    expect(body.get("message")).toBe("Body");
  });

  it("surfaces API errors", async () => {
    mockFetchOnce({ status: 0, errors: ["application token is invalid"] });
    const res = await sendPushover({ userKey: "u", title: "t", message: "m" });
    expect(res).toEqual({ ok: false, error: "application token is invalid" });
  });
});
