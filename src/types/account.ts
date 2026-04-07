import { z } from 'zod';

export interface DeviceProfile {
  machineId: string;
  macMachineId: string;
  devDeviceId: string;
  sqmId: string;
}

export interface DeviceProfileVersion {
  id: string;
  createdAt: number;
  label: string;
  profile: DeviceProfile;
  isCurrent: boolean;
}

export interface DeviceProfilesSnapshot {
  currentStorage?: DeviceProfile;
  boundProfile?: DeviceProfile;
  history: DeviceProfileVersion[];
  baseline?: DeviceProfile;
}

export interface Account {
  id: string; // UUID
  name: string;
  email: string;
  label?: string;
  backup_file?: string;
  avatar_url?: string;
  deviceProfile?: DeviceProfile;
  deviceHistory?: DeviceProfileVersion[];
  created_at: string;
  last_used: string;
}

export interface AccountBackupData {
  version: string; // Backup format version
  account: Account;
  data: {
    // Key-value pairs from Antigravity database
    antigravityAuthStatus?: string;
    'jetskiStateSync.agentManagerInitState'?: string;
    'antigravityUnifiedStateSync.oauthToken'?: string;
    [key: string]: unknown;
  };
}

export interface AccountInfo {
  email: string;
  name?: string;
  isAuthenticated: boolean;
}

// Zod Schemas for validation

export const DeviceProfileSchema = z.object({
  machineId: z.string(),
  macMachineId: z.string(),
  devDeviceId: z.string(),
  sqmId: z.string(),
});

export const DeviceProfileVersionSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  label: z.string(),
  profile: DeviceProfileSchema,
  isCurrent: z.boolean(),
});

export const DeviceProfilesSnapshotSchema = z.object({
  currentStorage: DeviceProfileSchema.optional(),
  boundProfile: DeviceProfileSchema.optional(),
  history: z.array(DeviceProfileVersionSchema),
  baseline: DeviceProfileSchema.optional(),
});

export const AccountSchema = z.object({
  id: z.string(), // Relaxed from .uuid()
  name: z.string(), // Relaxed from .min(1)
  email: z.string(), // Relaxed from .email()
  label: z.string().optional(),
  backup_file: z.string().optional(),
  avatar_url: z.string().optional(),
  deviceProfile: DeviceProfileSchema.optional(),
  deviceHistory: z.array(DeviceProfileVersionSchema).optional(),
  created_at: z.string(),
  last_used: z.string(),
});

export const AccountBackupDataSchema = z.object({
  version: z.string(),
  account: AccountSchema,
  data: z.record(z.string(), z.any()),
});

export const AccountInfoSchema = z.object({
  email: z.string(), // Allow empty string for unauthenticated state
  name: z.string().optional(),
  isAuthenticated: z.boolean(),
});
