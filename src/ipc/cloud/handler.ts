import crypto from 'crypto';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { CloudAccountRepo } from '../../ipc/database/cloudHandler';
import { GoogleAPIService } from '../../services/GoogleAPIService';
import {
  CloudAccount,
  CloudAccountExportBundle,
  CloudAccountExportEntry,
  CloudAccountExportBundleSchema,
  CloudAccountExportEntrySchema,
} from '../../types/cloudAccount';
import { logger } from '../../utils/logger';

import { shell } from 'electron';
import fs from 'fs';
import { updateTrayMenu } from '../../ipc/tray/handler';
import {
  ensureGlobalOriginalFromCurrentStorage,
  generateDeviceProfile,
  getStorageDirectoryPath,
  isIdentityProfileApplyEnabled,
  loadGlobalOriginalProfile,
  readCurrentDeviceProfile,
  saveGlobalOriginalProfile,
} from '../../ipc/device/handler';
import { getAntigravityDbPaths } from '../../utils/paths';
import { runWithSwitchGuard } from '../../ipc/switchGuard';
import { executeSwitchFlow } from '../../ipc/switchFlow';
import type { DeviceProfile, DeviceProfilesSnapshot } from '../../types/account';

// Fallback constants if service constants are not available or for direct usage
const CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';
const REDIRECT_URI = 'http://localhost:8888/oauth-callback';
const SCOPE = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/cclog',
  'https://www.googleapis.com/auth/experimentsandconfigs',
].join(' ');

// Helper to update tray
function notifyTrayUpdate(account: CloudAccount) {
  try {
    // Fetch language setting. Default to 'en' if not set.

    const lang = CloudAccountRepo.getSetting<string>('language', 'en');
    updateTrayMenu(account, lang);
  } catch (e) {
    logger.warn('Failed to update tray', e);
  }
}

export async function addGoogleAccount(authCode: string): Promise<CloudAccount> {
  try {
    // 1. Exchange code for tokens
    const tokenResp = await GoogleAPIService.exchangeCode(authCode);

    // 2. Get User Info
    const userInfo = await GoogleAPIService.getUserInfo(tokenResp.access_token);

    // 3. Construct CloudAccount Object
    const now = Math.floor(Date.now() / 1000);
    const account: CloudAccount = {
      id: uuidv4(),
      provider: 'google',
      email: userInfo.email,
      name: userInfo.name || userInfo.email,
      avatar_url: userInfo.picture,
      token: {
        access_token: tokenResp.access_token,
        refresh_token: tokenResp.refresh_token || '', // prompt=consent guarantees this, but we fallback safely
        expires_in: tokenResp.expires_in,
        expiry_timestamp: now + tokenResp.expires_in,
        token_type: tokenResp.token_type,
        email: userInfo.email,
      },
      created_at: now,
      last_used: now,
    };

    if (!account.token.refresh_token) {
      logger.warn(`No refresh token received for ${account.email}. Account will expire in 1 hour.`);
    }

    // 4. Save to DB
    await CloudAccountRepo.addAccount(account);

    // 5. Initial Quota Check (Async, best effort)
    try {
      const quota = await GoogleAPIService.fetchQuota(account.token.access_token);
      account.quota = quota;
      await CloudAccountRepo.updateQuota(account.id, quota);
      notifyTrayUpdate(account);
    } catch (e) {
      logger.warn('Failed to fetch initial quota', e);
    }

    return account;
  } catch (error) {
    logger.error('Failed to add Google account', error);
    throw error;
  }
}

export async function listCloudAccounts(): Promise<CloudAccount[]> {
  return CloudAccountRepo.getAccounts();
}

export async function deleteCloudAccount(accountId: string): Promise<void> {
  await CloudAccountRepo.removeAccount(accountId);
}

export async function updateCloudAccountLabel(accountId: string, label: string): Promise<void> {
  await CloudAccountRepo.updateLabel(accountId, label);
}

export async function refreshAccountQuota(accountId: string): Promise<CloudAccount> {
  const account = await CloudAccountRepo.getAccount(accountId);
  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  // Check if token needs refresh
  let now = Math.floor(Date.now() / 1000);
  if (account.token.expiry_timestamp < now + 300) {
    // 5 minutes buffer
    logger.info(`Token for ${account.email} near expiry, refreshing...`);
    try {
      const newTokenData = await GoogleAPIService.refreshAccessToken(account.token.refresh_token);

      // Update token in memory object
      account.token.access_token = newTokenData.access_token;
      account.token.expires_in = newTokenData.expires_in;
      account.token.expiry_timestamp = now + newTokenData.expires_in;

      // Save to DB
      await CloudAccountRepo.updateToken(account.id, account.token);
    } catch (e) {
      logger.error(`Failed to refresh token during time-check for ${account.email}`, e);
    }
  }

  try {
    const quota = await GoogleAPIService.fetchQuota(account.token.access_token);
    account.quota = quota;
    await CloudAccountRepo.updateQuota(account.id, quota);
    await CloudAccountRepo.updateLastUsed(account.id);
    account.last_used = Math.floor(Date.now() / 1000); // Sync memory object
    notifyTrayUpdate(account);
    return account;
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      logger.warn(`Got 401 Unauthorized for ${account.email}, forcing token refresh...`);
      try {
        // Force Refresh
        const newTokenData = await GoogleAPIService.refreshAccessToken(account.token.refresh_token);
        now = Math.floor(Date.now() / 1000);

        account.token.access_token = newTokenData.access_token;
        account.token.expires_in = newTokenData.expires_in;
        account.token.expiry_timestamp = now + newTokenData.expires_in;

        await CloudAccountRepo.updateToken(account.id, account.token);

        // Retry Quota
        const quota = await GoogleAPIService.fetchQuota(account.token.access_token);
        account.quota = quota;
        await CloudAccountRepo.updateQuota(account.id, quota);
        await CloudAccountRepo.updateLastUsed(account.id);
        account.last_used = Math.floor(Date.now() / 1000); // Sync memory object
        return account;
      } catch (refreshError) {
        logger.error(
          `Failed to force refresh token or retry quota for ${account.email}`,
          refreshError,
        );
        throw refreshError;
      }
    } else if (error.message === 'FORBIDDEN') {
      logger.warn(
        `Got 403 Forbidden for ${account.email}, marking as rate limited (if implemented) or just ignoring.`,
      );
      // Return existing account to avoid crash
      return account;
    }

    logger.error(`Failed to refresh quota for ${account.email}`, error);
    throw error;
  }
}

export async function switchCloudAccount(accountId: string): Promise<void> {
  await runWithSwitchGuard('cloud-account-switch', async () => {
    try {
      const account = await CloudAccountRepo.getAccount(accountId);
      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      logger.info(`Switching to cloud account: ${account.email} (${account.id})`);

      ensureGlobalOriginalFromCurrentStorage();
      if (!account.device_profile) {
        const generated = generateDeviceProfile();
        CloudAccountRepo.setDeviceBinding(account.id, generated, 'auto_generated');
        saveGlobalOriginalProfile(generated);
        account.device_profile = generated;
      }

      // 1. Prepare token refresh promise (start it in parallel with process exit)
      const tokenRefreshPromise = (async () => {
        const now = Math.floor(Date.now() / 1000);
        if (account.token.expiry_timestamp < now + 1200) { // Increased buffer to 20m
          logger.info(`Token for ${account.email} near expiry, refreshing in parallel...`);
          try {
            const newTokenData = await GoogleAPIService.refreshAccessToken(
              account.token.refresh_token,
            );
            account.token.access_token = newTokenData.access_token;
            account.token.expires_in = newTokenData.expires_in;
            account.token.expiry_timestamp = now + newTokenData.expires_in;
            await CloudAccountRepo.updateToken(account.id, account.token);
            logger.info(`Token refreshed for ${account.email}`);
          } catch (e) {
            logger.warn('Failed to refresh token in parallel, will try to use existing', e);
          }
        }
      })();

      await executeSwitchFlow({
        scope: 'cloud',
        targetProfile: account.device_profile || null,
        applyFingerprint: isIdentityProfileApplyEnabled(),
        processExitTimeoutMs: 10000,
        performSwitch: async () => {
          // Wait for token refresh to complete before injection if it was started
          await tokenRefreshPromise;

          // 3. Backup Database (Optimized to avoid race conditions)
          const dbPaths = getAntigravityDbPaths();
          for (const dbPath of dbPaths) {
            try {
              const backupPath = `${dbPath}.backup`;
              await fs.promises.copyFile(dbPath, backupPath);
              logger.info(`Backed up database to ${backupPath}`);
              break; // Success, stop trying other paths
            } catch (e: any) {
              // If file not found, just try the next path
              if (e.code === 'ENOENT') continue;
              logger.error(`Failed to backup database at ${dbPath}`, e);
            }
          }

          // 4. Inject Token
          CloudAccountRepo.injectCloudToken(account);

          // 5. Update usage and active status
          CloudAccountRepo.updateLastUsed(account.id);
          CloudAccountRepo.setActive(account.id);

          logger.info(`Successfully switched to cloud account: ${account.email}`);
          notifyTrayUpdate(account);
        },
      });
    } catch (err: any) {
      logger.error('Failed to switch cloud account', err);
      throw new Error(`Switch failed: ${err.message || 'Unknown error'}`);
    }
  });
}

export async function getCloudIdentityProfiles(accountId: string): Promise<DeviceProfilesSnapshot> {
  const account = await CloudAccountRepo.getAccount(accountId);
  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  let currentStorage: DeviceProfile | undefined;
  try {
    currentStorage = readCurrentDeviceProfile();
  } catch (error) {
    logger.warn('Failed to read current storage device profile', error);
  }

  return {
    currentStorage,
    boundProfile: account.device_profile,
    history: account.device_history || [],
    baseline: loadGlobalOriginalProfile() || undefined,
  };
}

export async function previewGenerateCloudIdentityProfile(): Promise<DeviceProfile> {
  return generateDeviceProfile();
}

export async function bindCloudIdentityProfile(
  accountId: string,
  mode: 'capture' | 'generate',
): Promise<DeviceProfile> {
  const account = await CloudAccountRepo.getAccount(accountId);
  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  let profile: DeviceProfile;
  if (mode === 'capture') {
    profile = readCurrentDeviceProfile();
  } else {
    profile = generateDeviceProfile();
  }

  ensureGlobalOriginalFromCurrentStorage();
  saveGlobalOriginalProfile(profile);
  CloudAccountRepo.setDeviceBinding(account.id, profile, mode);

  return profile;
}

export async function bindCloudIdentityProfileWithPayload(
  accountId: string,
  profile: DeviceProfile,
): Promise<DeviceProfile> {
  const account = await CloudAccountRepo.getAccount(accountId);
  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  ensureGlobalOriginalFromCurrentStorage();
  saveGlobalOriginalProfile(profile);
  CloudAccountRepo.setDeviceBinding(account.id, profile, 'generated');

  return profile;
}

export async function restoreCloudIdentityProfileRevision(
  accountId: string,
  versionId: string,
): Promise<DeviceProfile> {
  const baseline = loadGlobalOriginalProfile();
  return CloudAccountRepo.restoreDeviceVersion(accountId, versionId, baseline);
}

export async function restoreCloudBaselineProfile(accountId: string): Promise<DeviceProfile> {
  const baseline = loadGlobalOriginalProfile();
  if (!baseline) {
    throw new Error('Global original profile not found');
  }
  return CloudAccountRepo.restoreDeviceVersion(accountId, 'baseline', baseline);
}

export async function deleteCloudIdentityProfileRevision(
  accountId: string,
  versionId: string,
): Promise<void> {
  CloudAccountRepo.deleteDeviceVersion(accountId, versionId);
}

export async function openCloudIdentityStorageFolder(): Promise<void> {
  const directory = getStorageDirectoryPath();
  const result = await shell.openPath(directory);
  if (result) {
    throw new Error(`Failed to open identity storage: ${result}`);
  }
}

export function getAutoSwitchEnabled(): boolean {
  return CloudAccountRepo.getSetting<boolean>('auto_switch_enabled', false);
}

export async function setAutoSwitchEnabled(enabled: boolean): Promise<void> {
  CloudAccountRepo.setSetting('auto_switch_enabled', enabled);
  // Trigger an immediate check if enabled
  if (enabled) {
    const { CloudMonitorService } = await import('../../services/CloudMonitorService');
    CloudMonitorService.poll().catch((err: any) =>
      logger.error('Failed to poll after enabling auto-switch', err),
    );
  }
}

export async function forcePollCloudMonitor(): Promise<void> {
  const { CloudMonitorService } = await import('../../services/CloudMonitorService');
  await CloudMonitorService.poll();
}

export async function startAuthFlow(): Promise<void> {
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPE}&access_type=offline&prompt=consent&include_granted_scopes=true`;

  logger.info(`Starting auth flow, opening URL: ${url}`);
  await shell.openExternal(url);
}

// ─── Export / Import helpers ─────────────────────────────────────────────────

const EXPORT_VERSION = '1.0';
const EXPORT_ALGORITHM = 'aes-256-gcm';
const EXPORT_IV_LENGTH = 16;
const EXPORT_KEY_SALT_LENGTH = 32;

/**
 * Derive a 256-bit key from a user-supplied password using PBKDF2.
 */
function deriveExportKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 210_000, 32, 'sha256');
}

/**
 * Encrypt a plaintext string with a password using AES-256-GCM.
 * Output format: "saltHex:ivHex:authTagHex:ciphertextHex"
 */
function encryptWithPassword(plaintext: string, password: string): string {
  const salt = crypto.randomBytes(EXPORT_KEY_SALT_LENGTH);
  const key = deriveExportKey(password, salt);
  const iv = crypto.randomBytes(EXPORT_IV_LENGTH);
  const cipher = crypto.createCipheriv(EXPORT_ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an export bundle payload that was encrypted with a password.
 * Input format: "saltHex:ivHex:authTagHex:ciphertextHex"
 */
function decryptWithPassword(ciphertext: string, password: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted payload format');
  }
  const [saltHex, ivHex, authTagHex, encryptedHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const key = deriveExportKey(password, salt);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(EXPORT_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Export one or more cloud accounts as a portable bundle.
 * Tokens are decrypted from the local master key so that they can be
 * re-encrypted on any destination device.
 *
 * @param accountIds - Optional list of specific account IDs to export.
 *                     If omitted, all accounts are exported.
 * @param password   - Optional password to encrypt the bundle payload.
 */
export async function exportCloudAccounts(
  accountIds?: string[],
  password?: string,
): Promise<CloudAccountExportBundle> {
  logger.info(`Exporting cloud accounts: ${accountIds ? accountIds.join(', ') : 'all'}`);

  const allAccounts = await CloudAccountRepo.getAccounts();
  const targets =
    accountIds && accountIds.length > 0
      ? allAccounts.filter((a) => accountIds.includes(a.id))
      : allAccounts;

  // Accounts with decryption errors cannot be exported
  const exportable = targets.filter((a) => a.status !== 'decryption_error');
  if (exportable.length === 0) {
    throw new Error('No exportable accounts found');
  }

  const entries: CloudAccountExportEntry[] = exportable.map((a) => ({
    id: a.id,
    provider: a.provider,
    email: a.email,
    name: a.name,
    label: a.label,
    avatar_url: a.avatar_url,
    token: a.token,
    quota: a.quota,
    device_profile: a.device_profile,
    device_history: a.device_history,
    created_at: a.created_at,
    last_used: a.last_used,
  }));

  const jsonPayload = JSON.stringify(entries);
  const usePassword = password && password.length > 0;

  return {
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    encrypted: Boolean(usePassword),
    payload: usePassword ? encryptWithPassword(jsonPayload, password!) : jsonPayload,
  };
}

/**
 * Import accounts from a portable bundle.
 * For each entry:
 *  - If an account with the same email already exists → skip.
 *  - Otherwise → save (tokens will be re-encrypted by CloudAccountRepo.addAccount).
 *
 * @param bundleJson - Raw JSON string of the export file.
 * @param password   - Optional decryption password (required if bundle is encrypted).
 * @returns How many accounts were imported vs skipped.
 */
export async function importCloudAccounts(
  bundleJson: string,
  password?: string,
): Promise<{ imported: number; skipped: number }> {
  logger.info('Importing cloud accounts from bundle');

  let rawBundle: unknown;
  try {
    rawBundle = JSON.parse(bundleJson);
  } catch {
    throw new Error('Invalid export file: not valid JSON');
  }

  // Accept both the legacy bundle format (payload: string) and the new
  // human-readable format (accounts: array). The flexible schema below
  // handles both so that old export files continue to work.
  const flexBundleSchema = z.object({
    version: z.string(),
    exported_at: z.string(),
    encrypted: z.boolean(),
    // New pretty format: accounts array written directly in the file
    accounts: z.array(z.unknown()).optional(),
    // Legacy / encrypted format: serialized JSON string
    payload: z.string().optional(),
  });

  const bundleResult = flexBundleSchema.safeParse(rawBundle);
  if (!bundleResult.success) {
    throw new Error('Invalid export file: unrecognised bundle schema');
  }

  const bundle = bundleResult.data;

  let rawEntries: unknown;

  if (bundle.encrypted) {
    // Encrypted bundles always use the payload string
    if (!bundle.payload) {
      throw new Error('Invalid export file: missing encrypted payload');
    }
    if (!password || password.length === 0) {
      throw new Error('This export file is password-protected. Please enter the password.');
    }
    let payloadJson: string;
    try {
      payloadJson = decryptWithPassword(bundle.payload, password);
    } catch {
      throw new Error('Incorrect password or corrupted export file.');
    }
    try {
      rawEntries = JSON.parse(payloadJson);
    } catch {
      throw new Error('Invalid export file: payload is not valid JSON');
    }
  } else if (bundle.accounts) {
    // New pretty format: accounts already parsed as an array
    rawEntries = bundle.accounts;
  } else if (bundle.payload) {
    // Legacy unencrypted format: payload is a JSON string
    try {
      rawEntries = JSON.parse(bundle.payload);
    } catch {
      throw new Error('Invalid export file: payload is not valid JSON');
    }
  } else {
    throw new Error('Invalid export file: no accounts data found');
  }

  if (!Array.isArray(rawEntries)) {
    throw new Error('Invalid export file: accounts must be an array');
  }

  const existingAccounts = await CloudAccountRepo.getAccounts();
  const existingEmails = new Set(existingAccounts.map((a) => a.email));

  let imported = 0;
  let skipped = 0;

  for (const rawEntry of rawEntries) {
    const entryResult = CloudAccountExportEntrySchema.safeParse(rawEntry);
    if (!entryResult.success) {
      logger.warn('Skipping invalid account entry during import', entryResult.error);
      skipped++;
      continue;
    }

    const entry = entryResult.data;

    if (existingEmails.has(entry.email)) {
      logger.info(`Skipping import of existing account: ${entry.email}`);
      skipped++;
      continue;
    }

    // Build a full CloudAccount — tokens will be re-encrypted by addAccount
    const accountToImport: CloudAccount = {
      id: entry.id,
      provider: entry.provider,
      email: entry.email,
      name: entry.name,
      label: entry.label,
      avatar_url: entry.avatar_url,
      token: entry.token,
      quota: entry.quota,
      device_profile: entry.device_profile,
      device_history: entry.device_history,
      created_at: entry.created_at,
      last_used: entry.last_used,
      status: 'active',
      is_active: false,
    };

    try {
      await CloudAccountRepo.addAccount(accountToImport);
      existingEmails.add(entry.email);
      imported++;
      logger.info(`Imported account: ${entry.email}`);
    } catch (error) {
      logger.error(`Failed to import account ${entry.email}`, error);
      skipped++;
    }
  }

  logger.info(`Import complete: ${imported} imported, ${skipped} skipped`);
  return { imported, skipped };
}

