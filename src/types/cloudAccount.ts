import { z } from 'zod';
import {
  DeviceProfileSchema,
  DeviceProfileVersionSchema,
  type DeviceProfile,
  type DeviceProfileVersion,
} from './account';

export interface CloudTokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expiry_timestamp: number;
  token_type: string;
  email?: string;
  project_id?: string;
  session_id?: string;
  upstream_proxy_url?: string;
}

export interface CloudQuotaData {
  models: Record<
    string,
    {
      percentage: number;
      resetTime: string;
    }
  >;
  /** Subscription tier name from Google's loadCodeAssist API (e.g. "Google AI Pro", "Google AI Ultra") */
  subscription_tier?: string | null;
}

export interface CloudAccount {
  id: string; // UUID
  provider: 'google' | 'anthropic';
  email: string;
  name?: string | null;
  label?: string | null;
  category_id?: string | null;
  avatar_url?: string | null;
  token: CloudTokenData;
  quota?: CloudQuotaData;
  device_profile?: DeviceProfile;
  device_history?: DeviceProfileVersion[];
  created_at: number;
  last_used: number; // Unix timestamp
  status?: 'active' | 'rate_limited' | 'expired' | 'decryption_error';
  is_active?: boolean;
}

// Zod Schemas
export const CloudTokenDataSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  expiry_timestamp: z.number(),
  token_type: z.string(),
  email: z.string().optional(),
  project_id: z.string().optional(),
  session_id: z.string().optional(),
  upstream_proxy_url: z.string().optional(),
});

export const CloudQuotaDataSchema = z.object({
  models: z.record(
    z.string(),
    z.object({
      percentage: z.number(),
      resetTime: z.string(),
    }),
  ),
  subscription_tier: z.string().optional().nullable(),
});

/** Single account entry inside an export bundle (tokens are decrypted). */
export interface CloudAccountExportEntry {
  id: string;
  provider: 'google' | 'anthropic';
  email: string;
  name?: string | null;
  label?: string | null;
  avatar_url?: string | null;
  token: CloudTokenData;
  quota?: CloudQuotaData;
  device_profile?: DeviceProfile;
  device_history?: DeviceProfileVersion[];
  created_at: number;
  last_used: number;
}

/** Top-level structure of an AGATE export file. */
export interface CloudAccountExportBundle {
  /** Format version — current: "1.0" */
  version: string;
  exported_at: string;
  /** Whether the bundle payload is AES-256-GCM encrypted with a user password. */
  encrypted: boolean;
  /**
   * When `encrypted` is false: raw JSON string of `CloudAccountExportEntry[]`.
   * When `encrypted` is true: AES-256-GCM ciphertext in "iv:authTag:ciphertext" hex format.
   */
  payload: string;
}

export const CloudAccountExportEntrySchema = z.object({
  id: z.string(),
  provider: z.enum(['google', 'anthropic']),
  email: z.string(),
  name: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  token: CloudTokenDataSchema,
  quota: CloudQuotaDataSchema.optional(),
  device_profile: z
    .object({
      machineId: z.string(),
      macMachineId: z.string(),
      devDeviceId: z.string(),
      sqmId: z.string(),
    })
    .optional(),
  device_history: z.array(z.any()).optional(),
  created_at: z.number(),
  last_used: z.number(),
});

export const CloudAccountExportBundleSchema = z.object({
  version: z.string(),
  exported_at: z.string(),
  encrypted: z.boolean(),
  payload: z.string(),
});

export const CloudAccountSchema = z.object({
  id: z.string(),
  provider: z.enum(['google', 'anthropic']),
  email: z.string(), // Relaxed: was z.string().email() but caused validation issues with some formats
  name: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  token: CloudTokenDataSchema,
  quota: CloudQuotaDataSchema.optional(),
  device_profile: DeviceProfileSchema.optional(),
  device_history: z.array(DeviceProfileVersionSchema).optional(),
  created_at: z.number(),
  last_used: z.number(),
  status: z.enum(['active', 'rate_limited', 'expired', 'decryption_error']).optional(),
  is_active: z.boolean().optional(),
});
