-- English is the UI default; Korean remains available in the admin console.
-- Insert English before rows that reference it, including on a fresh database.
INSERT INTO locales (code, native_name, display_name, enabled, fallback_code, sort_order)
VALUES ('en', 'English', 'English', true, NULL, 0)
ON CONFLICT (code) DO UPDATE SET enabled = true, fallback_code = NULL,
  sort_order = 0, version = locales.version + 1, updated_at = now();
--> statement-breakpoint
INSERT INTO locales (code, native_name, display_name, enabled, fallback_code, sort_order)
VALUES ('ja', '日本語', 'Japanese', true, 'en', 1),
       ('ko', '한국어', 'Korean', true, 'en', 2)
ON CONFLICT (code) DO UPDATE SET enabled = true, fallback_code = 'en',
  sort_order = EXCLUDED.sort_order, version = locales.version + 1, updated_at = now();
