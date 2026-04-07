# Proposal: App Localization (Automatic System Language Detection)

**Change ID:** `localize-app-auto-detect`

## Summary

Add multilingual support to Antigravity Manager and automatically set the default UI language based on the user's OS language. If the OS language is unsupported, fall back to English. This includes updating i18n configuration, adding Chinese translation resources, and integrating a language detection plugin.

## Motivation

To provide a better user experience, the app should adapt to users' preferred language environment. Automatically detecting system language reduces setup effort and improves first-run experience.

## Proposed Changes

1. **Integrate language detection:** Install and configure `i18next-browser-languagedetector` to auto-detect user language.
2. **Update i18n config:** Modify `src/localization/i18n.ts` to enable language detection and define a fallback language (English).
3. **Add Chinese resources:** Create `zh-CN` translation resources covering all app strings.
4. **Update language actions:** Ensure `src/actions/language.ts` correctly handles auto-detection and manual override.
5. **UI updates:** Ensure all UI components use translation keys instead of hardcoded text.

## Alternatives Considered

* **Force default Chinese:** Rejected, to support a broader international user base and respect system settings.
* **Force default English:** Rejected, same reason.

## Risks

* **Detection failure:** In certain environments (for example, some Linux distros), language detection may be inaccurate. Fallback behavior must remain reliable.

## Acceptance Criteria

1. **Automatic detection:**
   * When OS language is Simplified Chinese, app defaults to Chinese on first launch.
   * When OS language is English or another non-Chinese language, app defaults to English on first launch.
2. **Manual switching:**
   * Users can switch from Chinese to English in Settings, and UI updates immediately without restart.
   * Users can switch from English to Chinese in Settings, and UI updates immediately without restart.
3. **Persistence:**
   * After users manually change language, app restart preserves the selected language instead of re-detecting.
4. **Completeness:**
   * All visible strings (home page, settings page, status bar, popups) render correctly in the selected language with no leftover hardcoded text.
