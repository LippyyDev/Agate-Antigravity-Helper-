import { z } from 'zod';
import { dialog } from 'electron';
import fs from 'fs';
import { os } from '@orpc/server';
import {
  addGoogleAccount,
  bindCloudIdentityProfile,
  bindCloudIdentityProfileWithPayload,
  deleteCloudIdentityProfileRevision,
  listCloudAccounts,
  deleteCloudAccount,
  getCloudIdentityProfiles,
  openCloudIdentityStorageFolder,
  previewGenerateCloudIdentityProfile,
  refreshAccountQuota,
  restoreCloudIdentityProfileRevision,
  restoreCloudBaselineProfile,
  switchCloudAccount,
  getAutoSwitchEnabled,
  setAutoSwitchEnabled,
  forcePollCloudMonitor,
  startAuthFlow,
  updateCloudAccountLabel,
  exportCloudAccounts,
  importCloudAccounts,
} from './handler';
import { CloudAccountSchema } from '../../types/cloudAccount';
import { DeviceProfileSchema, DeviceProfilesSnapshotSchema } from '../../types/account';
import { CloudAccountRepo } from '../database/cloudHandler';
import { logger } from '../../utils/logger';
import { getSwitchMetricsSnapshot } from '../switchMetrics';
import { getSwitchGuardSnapshot } from '../switchGuard';
import { getDeviceHardeningSnapshot } from '../device/handler';

const switchOwnerSchema = z.enum(['local-account-switch', 'cloud-account-switch']);
const switchMetricBucketSchema = z.object({
  switchSuccess: z.number(),
  switchFailure: z.number(),
  rollbackAttempt: z.number(),
  rollbackSuccess: z.number(),
  rollbackFailure: z.number(),
  failureReasons: z.record(z.string(), z.number()),
  lastFailure: z
    .object({
      reason: z.string(),
      message: z.string(),
      occurredAt: z.number(),
    })
    .nullable(),
});
const switchMetricsSnapshotSchema = z.object({
  local: switchMetricBucketSchema,
  cloud: switchMetricBucketSchema,
});
const switchGuardSnapshotSchema = z.object({
  activeOwner: switchOwnerSchema.nullable(),
  pendingOwners: z.array(switchOwnerSchema),
  pendingCount: z.number(),
});
const switchStatusSnapshotSchema = z.object({
  metrics: switchMetricsSnapshotSchema,
  guard: switchGuardSnapshotSchema,
  hardening: z.object({
    consecutiveApplyFailures: z.number(),
    safeModeActive: z.boolean(),
    safeModeUntil: z.number().nullable(),
    lastFailureReason: z.string().nullable(),
    lastFailureStage: z.string().nullable(),
    lastFailureAt: z.number().nullable(),
  }),
});

export const cloudRouter = os.router({
  addGoogleAccount: os
    .input(z.object({ authCode: z.string() }))
    .output(CloudAccountSchema)
    .handler(async ({ input }) => {
      return addGoogleAccount(input.authCode);
    }),

  listCloudAccounts: os.output(z.array(CloudAccountSchema)).handler(async () => {
    return listCloudAccounts();
  }),

  deleteCloudAccount: os
    .input(z.object({ accountId: z.string() }))
    .output(z.void())
    .handler(async ({ input }) => {
      await deleteCloudAccount(input.accountId);
    }),

  updateCloudAccountLabel: os
    .input(z.object({ accountId: z.string(), label: z.string() }))
    .output(z.void())
    .handler(async ({ input }) => {
      await updateCloudAccountLabel(input.accountId, input.label);
    }),

  refreshAccountQuota: os
    .input(z.object({ accountId: z.string() }))
    .output(CloudAccountSchema)
    .handler(async ({ input }) => {
      return refreshAccountQuota(input.accountId);
    }),

  switchCloudAccount: os
    .input(z.object({ accountId: z.string() }))
    .output(z.void())
    .handler(async ({ input }) => {
      await switchCloudAccount(input.accountId);
    }),

  getAutoSwitchEnabled: os.output(z.boolean()).handler(async () => {
    return getAutoSwitchEnabled();
  }),

  setAutoSwitchEnabled: os
    .input(z.object({ enabled: z.boolean() }))
    .output(z.void())
    .handler(async ({ input }) => {
      await setAutoSwitchEnabled(input.enabled);
    }),

  forcePollCloudMonitor: os.output(z.void()).handler(async () => {
    await forcePollCloudMonitor();
  }),

  startAuthFlow: os.output(z.void()).handler(async () => {
    await startAuthFlow();
  }),

  syncLocalAccount: os.output(CloudAccountSchema.nullable()).handler(async () => {
    try {
      const result = await CloudAccountRepo.syncFromIDE();

      return result;
    } catch (error: any) {
      logger.error('[ORPC] syncLocalAccount error:', error.message, error.stack);
      throw error;
    }
  }),

  getSwitchStatus: os.output(switchStatusSnapshotSchema).handler(async () => {
    return {
      metrics: getSwitchMetricsSnapshot(),
      guard: getSwitchGuardSnapshot(),
      hardening: getDeviceHardeningSnapshot(),
    };
  }),

  getIdentityProfiles: os
    .input(z.object({ accountId: z.string() }))
    .output(DeviceProfilesSnapshotSchema)
    .handler(async ({ input }) => {
      return getCloudIdentityProfiles(input.accountId);
    }),

  previewIdentityProfile: os.output(DeviceProfileSchema).handler(async () => {
    return previewGenerateCloudIdentityProfile();
  }),

  bindIdentityProfile: os
    .input(z.object({ accountId: z.string(), mode: z.enum(['capture', 'generate']) }))
    .output(DeviceProfileSchema)
    .handler(async ({ input }) => {
      return bindCloudIdentityProfile(input.accountId, input.mode);
    }),

  bindIdentityProfileWithPayload: os
    .input(z.object({ accountId: z.string(), profile: DeviceProfileSchema }))
    .output(DeviceProfileSchema)
    .handler(async ({ input }) => {
      return bindCloudIdentityProfileWithPayload(input.accountId, input.profile);
    }),

  restoreIdentityProfileRevision: os
    .input(z.object({ accountId: z.string(), versionId: z.string() }))
    .output(DeviceProfileSchema)
    .handler(async ({ input }) => {
      return restoreCloudIdentityProfileRevision(input.accountId, input.versionId);
    }),

  restoreBaselineProfile: os
    .input(z.object({ accountId: z.string() }))
    .output(DeviceProfileSchema)
    .handler(async ({ input }) => {
      return restoreCloudBaselineProfile(input.accountId);
    }),

  deleteIdentityProfileRevision: os
    .input(z.object({ accountId: z.string(), versionId: z.string() }))
    .output(z.void())
    .handler(async ({ input }) => {
      await deleteCloudIdentityProfileRevision(input.accountId, input.versionId);
    }),

  openIdentityStorageFolder: os.output(z.void()).handler(async () => {
    await openCloudIdentityStorageFolder();
  }),

  exportAccounts: os
    .input(
      z.object({
        accountIds: z.array(z.string()).optional(),
        password: z.string().optional(),
      }),
    )
    .output(
      z.object({
        // null means the user cancelled the native save dialog
        filePath: z.string().nullable(),
        count: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const bundle = await exportCloudAccounts(input.accountIds, input.password);

      // Count actual accounts in payload to surface in the success toast
      let count = 0;
      try {
        const rawEntries = bundle.encrypted ? [] : (JSON.parse(bundle.payload) as unknown[]);
        count = Array.isArray(rawEntries) ? rawEntries.length : 0;
      } catch {
        count = 0;
      }

      const date = new Date().toISOString().slice(0, 10);
      const label = input.accountIds?.length ?? 'all';
      const defaultFileName = `agate-accounts-${label}-${date}.json`;

      // Open native Windows Save-As dialog in the main process
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save Export File',
        defaultPath: defaultFileName,
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });

      if (canceled || !filePath) {
        return { filePath: null, count };
      }

      /**
       * For unencrypted bundles, payload is a JSON string of CloudAccountExportEntry[].
       * We parse it back to a real array so that JSON.stringify produces a fully
       * indented, human-readable file instead of a single escaped string on one line.
       * Encrypted bundles keep the payload as an opaque ciphertext string.
       */
      let fileContent: string;
      if (!bundle.encrypted) {
        const prettyBundle = {
          version: bundle.version,
          exported_at: bundle.exported_at,
          encrypted: bundle.encrypted,
          accounts: JSON.parse(bundle.payload) as unknown[],
        };
        fileContent = JSON.stringify(prettyBundle, null, 2);
      } else {
        fileContent = JSON.stringify(bundle, null, 2);
      }

      fs.writeFileSync(filePath, fileContent, 'utf-8');

      return { filePath, count };

    }),

  importAccounts: os
    .input(
      z.object({
        bundleJson: z.string(),
        password: z.string().optional(),
      }),
    )
    .output(z.object({ imported: z.number(), skipped: z.number() }))
    .handler(async ({ input }) => {
      return importCloudAccounts(input.bundleJson, input.password);
    }),
});
