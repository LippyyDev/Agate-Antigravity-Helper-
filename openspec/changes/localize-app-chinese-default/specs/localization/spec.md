# Spec: Localization

## ADDED Requirements

### Requirement: Automatic Language Detection

On first launch, the application MUST automatically detect the user's system language and set the corresponding UI language.

#### Scenario: System language is Chinese

Given the user opens the app for the first time
And the user's system language is set to Chinese (`zh-CN`)
And no language preference is saved in local storage
When the app loads
Then the UI should be displayed in Simplified Chinese (`zh-CN`)

#### Scenario: System language is non-Chinese

Given the user opens the app for the first time
And the user's system language is set to French (`fr`)
And no language preference is saved in local storage
When the app loads
Then the UI should fall back to English (`en`)

### Requirement: Language Switching

Users MUST be able to switch between supported languages, and manual selection MUST override automatic detection.

#### Scenario: Switch language

Given the user is on the settings page
When the user selects "English" from the language dropdown
Then the UI should switch to English immediately
And the preference should be saved to local storage

### Requirement: Persistence

The user's manual language preference MUST persist across sessions and take precedence over system language.

#### Scenario: Persist language preference

Given the user has manually selected "English" as preferred language
And the user's system language is Chinese
When the user restarts the app
Then the UI should display English (respecting user preference)

## MODIFIED Requirements

### Requirement: Update i18n Configuration

i18n configuration MUST be updated to support the language detection plugin.

#### Scenario: i18n configuration

`src/localization/i18n.ts` must be updated to:

1. Integrate `i18next-browser-languagedetector`.
2. Configure detection order as `['localStorage', 'navigator']`.
3. Include `zh-CN` resource objects.
