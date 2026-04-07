import { ProxyConfig } from '../types/config';

let serverConfig: ProxyConfig | null = null;

export function setServerConfig(config: ProxyConfig) {
  serverConfig = config;
}

export function getServerConfig(): ProxyConfig | null {
  return serverConfig;
}
