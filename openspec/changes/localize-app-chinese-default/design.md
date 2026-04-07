# Design: Multilingual Support

## Architecture

The application uses `react-i18next` for i18n and `i18next-browser-languagedetector` for language detection. Configuration is centralized in `src/localization/i18n.ts`.

### Language Resources

Translation resources are built as JSON objects in `i18n.ts` (or split into files if they grow large).
We add a `zh-CN` key in the `resources` object.

### Default Language Strategy

We introduce the `LanguageDetector` plugin.
`i18n.use(LanguageDetector).init({...})` is configured to check `localStorage` first, then `navigator` (browser/system language).
`fallbackLng` remains `'en'` as the final fallback.

### Key Mapping

Existing English strings are mapped to semantic keys (for example, `home.title`, `settings.theme`).

## Data Flow

1. App starts.
2. `i18next` initializes and determines language via `LanguageDetector`:
   * Check whether `localStorage` has a saved preference.
   * If not, check `navigator.language`.
   * If detected language is supported (`en` or `zh-CN`), use it.
   * Otherwise, use `fallbackLng` (`en`).
3. Components use `useTranslation` to resolve strings for the active language.
