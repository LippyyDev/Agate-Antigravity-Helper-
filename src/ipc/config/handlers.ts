import { AppConfig } from '../../types/config';
import { ConfigManager } from './manager';
import { syncAutoStart } from '../../utils/autoStart';
import { logger } from '../../utils/logger';

export function loadConfig(): AppConfig {
  return ConfigManager.loadConfig();
}

export async function saveConfig(config: AppConfig): Promise<void> {
  // Logic to notify proxy server if configuration changes (hot update)
  // Logic to update Tray if language changes
  // For now just save
  const previous = ConfigManager.getCachedConfig() ?? ConfigManager.loadConfig();
  await ConfigManager.saveConfig(config);
  logger.setErrorReportingEnabled(config.error_reporting_enabled);
  if (previous.auto_startup !== config.auto_startup) {
    syncAutoStart(config);
  }
}
