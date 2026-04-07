export type RequestHeaderValue = string | string[] | undefined;

export type RequestHeaders = Record<string, RequestHeaderValue>;

export function hasConfiguredApiKey(apiKey: string | undefined): apiKey is string {
  return typeof apiKey === 'string' && apiKey.trim() !== '';
}

export function extractApiKeyToken(headers: RequestHeaders): string | null {
  const authorizationHeader = readHeaderValue(headers['authorization']);
  if (authorizationHeader) {
    const [scheme, token, ...rest] = authorizationHeader.trim().split(/\s+/);
    if (rest.length === 0 && token && scheme?.toLowerCase() === 'bearer') {
      return token;
    }
  }

  const xApiKeyHeader = readHeaderValue(headers['x-api-key']);
  if (xApiKeyHeader) {
    return xApiKeyHeader;
  }

  const xGoogApiKeyHeader = readHeaderValue(headers['x-goog-api-key']);
  if (xGoogApiKeyHeader) {
    return xGoogApiKeyHeader;
  }

  return null;
}

function readHeaderValue(headerValue: RequestHeaderValue): string | null {
  if (typeof headerValue === 'string') {
    const trimmedValue = headerValue.trim();
    return trimmedValue !== '' ? trimmedValue : null;
  }

  if (Array.isArray(headerValue)) {
    for (const value of headerValue) {
      if (typeof value === 'string') {
        const trimmedValue = value.trim();
        if (trimmedValue !== '') {
          return trimmedValue;
        }
      }
    }
  }

  return null;
}
