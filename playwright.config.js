var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 30000,
    use: {
        baseURL: "http://127.0.0.1:4173",
        trace: "on-first-retry",
    },
    webServer: {
        command: "npm run build && npm run preview -- --host 127.0.0.1",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
    },
    projects: [
        {
            name: "chromium",
            use: __assign(__assign({}, devices["Desktop Chrome"]), { viewport: { width: 1440, height: 950 } }),
        },
    ],
});
