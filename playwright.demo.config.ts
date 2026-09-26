import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({ ...base, testDir: "./tests/demo", use: { ...base.use, baseURL: process.env.DEMO_BASE_URL || "http://127.0.0.1:3193" } });
