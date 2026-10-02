import { describe, it, expect, vi, afterEach } from "vitest";
import axios from "axios";
import { createClient } from "./client";
import { incidentActions, type Incident, type User } from "./types";
const user = { id: "staff", role: "STAFF" } as User;
const session = { accessToken: "access", refreshToken: "refresh", user };
afterEach(() => vi.restoreAllMocks());
describe("Session lifecycle", () => {
  it("keeps non-remembered sessions ephemeral after refresh", async () => {
    const save = vi.fn(async (_token: string | null) => undefined);
    vi.spyOn(axios, "post")
      .mockResolvedValueOnce({ data: session })
      .mockResolvedValueOnce({ data: { ...session, refreshToken: "rotated" } });
    const client = createClient({
      baseUrl: () => "http://server",
      storage: { load: async () => null, save },
    });
    await client.auth.login("staff", "password", false);
    await client.auth.rotate();
    expect(save.mock.calls.map((call) => call[0])).toEqual([null, null]);
    expect(client.session()?.refreshToken).toBe("rotated");
  });
  it("coalesces concurrent token refreshes into a single rotation", async () => {
    const post = vi.spyOn(axios, "post").mockResolvedValue({ data: session });
    const client = createClient({
      baseUrl: () => "http://server",
      storage: { load: async () => null, save: async () => undefined },
    });
    await client.auth.login("staff", "password");
    post.mockClear();
    await Promise.all([
      client.auth.rotate(),
      client.auth.rotate(),
      client.auth.rotate(),
    ]);
    expect(post).toHaveBeenCalledTimes(1);
  });
  it("clears stored tokens and account state when refresh is rejected", async () => {
    const post = vi.spyOn(axios, "post").mockResolvedValue({ data: session });
    const save = vi.fn(async () => undefined);
    const client = createClient({
      baseUrl: () => "http://server",
      storage: { load: async () => null, save },
    });
    await client.auth.login("staff", "password");
    post.mockRejectedValueOnce(new Error("revoked"));
    await expect(client.auth.rotate()).rejects.toThrow("revoked");
    expect(client.session()).toBeNull();
    expect(save).toHaveBeenLastCalledWith(null);
  });
});
describe("Incident actions", () => {
  it("hides handler actions for incidents assigned to another user", () => {
    expect(
      incidentActions(
        {
          status: "ACKNOWLEDGED",
          handledBy: { id: "someone-else" },
        } as Incident,
        user,
        true,
      ),
    ).toEqual([]);
  });
  it("honors staff false alarm permissions and terminal states", () => {
    expect(
      incidentActions(
        { status: "NEW", handledBy: null } as Incident,
        user,
        false,
      ),
    ).toEqual(["acknowledge"]);
    expect(
      incidentActions(
        { status: "IN_PROGRESS", handledBy: user } as Incident,
        user,
        true,
      ),
    ).toEqual(["resolve"]);
    expect(
      incidentActions(
        { status: "RESOLVED", handledBy: user } as Incident,
        user,
        true,
      ),
    ).toEqual([]);
  });
});
