// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { readAfterLogin, rememberAfterLogin } from "./after-login";

beforeEach(() => sessionStorage.clear());

describe("coming back after login (no open redirect)", () => {
  it("follows a path on this site", () => {
    rememberAfterLogin("/cart");
    expect(readAfterLogin()).toBe("/cart");
  });

  it("never sends people to another site", () => {
    for (const evil of ["https://evil.tn", "//evil.tn", "/\\evil.tn", "javascript:alert(1)", "evil.tn"]) {
      rememberAfterLogin(evil);
      expect(readAfterLogin(), evil).toBe("/");
    }
  });
});
