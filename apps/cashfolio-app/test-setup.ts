import { beforeEach } from "vitest";
import { redis } from "~/redis.server";

beforeEach(async () => {
  // clean up
  await redis.flushAll();
});
