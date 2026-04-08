/**
 * Categorizes a Google subscription tier string (from loadCodeAssist paidTier/currentTier)
 * into a simplified display tier for UI badges.
 *
 * Known values observed from Google's API:
 *   - "Google AI Ultra"
 *   - "Google AI Pro"
 *   - "Google One AI Premium" (legacy Pro)
 *   - "Free Trial"
 *   - null / undefined  → free/unknown
 */
export type GooglePlanTier = 'ultra' | 'pro' | 'free' | 'unknown';

export interface GooglePlanInfo {
  tier: GooglePlanTier;
  /** Raw display name from Google's API, e.g. "Google AI Pro" */
  displayName: string | null;
}

export function detectGooglePlanTier(subscriptionTier?: string | null): GooglePlanInfo {
  if (!subscriptionTier) {
    return { tier: 'unknown', displayName: null };
  }

  const lower = subscriptionTier.toLowerCase();

  if (lower.includes('ultra')) {
    return { tier: 'ultra', displayName: subscriptionTier };
  }

  // "Google AI Pro", "Google One AI Premium", "pro", "premium"
  if (
    lower.includes('pro') ||
    lower.includes('premium') ||
    lower.includes('one ai')
  ) {
    return { tier: 'pro', displayName: subscriptionTier };
  }

  if (lower.includes('free')) {
    return { tier: 'free', displayName: subscriptionTier };
  }

  // Anything else defined but unrecognized (e.g. "Basic (Restricted)") — treat as unknown
  return { tier: 'unknown', displayName: subscriptionTier };
}
