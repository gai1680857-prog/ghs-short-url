import { defineConfig } from "vitest/config";

// Integration tests are disabled pending vitest 4 + @cloudflare/vitest-pool-workers
// runner API alignment. Source code still typechecks and runs in `npm run dev`.
// To re-enable: follow https://developers.cloudflare.com/workers/testing/vitest-integration/
export default defineConfig({
  test: {
    include: [],
  },
});
