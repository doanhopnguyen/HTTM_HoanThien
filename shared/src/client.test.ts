import { describe, it, expect, vi, afterEach } from "vitest";
import axios, { AxiosError } from "axios";
import { createClient } from "./client";
import { incidentActions, type Incident, type User } from "./types";
import { isNetworkError } from "./api";
const admin = { id: "admin", role: "ADMIN" } as User;
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
  it("keeps the stored session when the server cannot be reached", async () => {
    const offline = new AxiosError("Network Error", "ERR_NETWORK");
    vi.spyOn(axios, "post").mockRejectedValue(offline);
    const save = vi.fn(async () => undefined);
    const client = createClient({
      baseUrl: () => "http://server",
      storage: { load: async () => "stored-refresh", save },
    });
    const failure = await client.auth.restore().catch((error) => error);
    expect(isNetworkError(failure)).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });
  it("clears the stored session when the server answers 401", async () => {
    const rejected = new AxiosError(
      "Unauthorized",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 401,
        data: {},
      } as never,
    );
    vi.spyOn(axios, "post").mockRejectedValue(rejected);
    const save = vi.fn(async () => undefined);
    const client = createClient({
      baseUrl: () => "http://server",
      storage: { load: async () => "stored-refresh", save },
    });
    await expect(client.auth.restore()).rejects.toBe(rejected);
    expect(isNetworkError(rejected)).toBe(false);
    expect(save).toHaveBeenLastCalledWith(null);
  });
  it("ends the session after a refresh timeout, since the token may already be rotated", async () => {
    const timeout = new AxiosError(
      "timeout of 15000ms exceeded",
      "ECONNABORTED",
    );
    vi.spyOn(axios, "post").mockRejectedValue(timeout);
    const save = vi.fn(async () => undefined);
    const client = createClient({
      baseUrl: () => "http://server",
      storage: { load: async () => "stored-refresh", save },
    });
    await expect(client.auth.restore()).rejects.toBe(timeout);
    expect(isNetworkError(timeout)).toBe(false);
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
  it("lets an administrator close but not claim an incident handled by someone else", () => {
    const foreign = { id: "someone-else" } as User;
    expect(
      incidentActions(
        { status: "ACKNOWLEDGED", handledBy: foreign } as Incident,
        admin,
        false,
      ),
    ).toEqual(["resolve", "false-alarm"]);
    expect(
      incidentActions(
        { status: "IN_PROGRESS", handledBy: foreign } as Incident,
        admin,
        false,
      ),
    ).toEqual(["resolve"]);
    expect(
      incidentActions(
        { status: "RESOLVED", handledBy: foreign } as Incident,
        admin,
        false,
      ),
    ).toEqual([]);
  });
});
