# Security Policy

## Security Features

AGATE (Antigravity Helper) takes security and data privacy as a fundamental priority. The following security measures govern the architecture of the application:

### Encryption Standard

- **AES-256-GCM** encryption is enforced for all sensitive serialized data payloads (`token_json`, `quota_json`).
- Cryptographically secure initialization vectors (IV) are generated for every distinct encryption operation.
- Authenticated encryption is strictly maintained to prevent cipher tampering and verify data integrity.

### Credential Management

AGATE interfaces exclusively with native operating system credential managers to store master cryptographic keys. Master keys are never persisted in plain text configuration files.

- **Windows**: Integrated with Windows Credential Manager
- **macOS**: Integrated with macOS Keychain
- **Linux**: Integrated with Secret Service API / libsecret

### Data Protection

- Sensitive session tokens are encrypted before being committed to the internal SQLite database.
- An automatic migration protocol translates legacy plaintext storage into encrypted records upon application initialization.
- No sensitive user data, telemetry, or API logs are transmitted to external services. The proxy server runs entirely locally.

## Supported Versions

| Version  | Security Support Status |
| -------- | ----------------------- |
| Latest   | Supported               |
| < Latest | Unsupported             |

Security patches and updates are exclusive to the latest stable release. It is strongly recommended to continuously update AGATE to maintain proper security hygiene.

## Reporting a Vulnerability

We prioritize the rapid remediation of any security vulnerabilities discovered within AGATE.

### Reporting Methodology

**Please do not report security vulnerabilities through public channels.** 

Any identified exploits, vulnerabilities, or bypass mechanisms should be confidentially emailed to the project maintainers. Reach out directly using the contact information provided in the repository author's profile.

### Recommended Report Information

To expedite our investigation, please include the following diagnostic data in your report:

- Classification of vulnerability (e.g., buffer overflow, SQL injection, XSS, insecure storage).
- Full paths of the affected source files and modules.
- Relevant commit hashes or branches demonstrating the flaw.
- Step-by-step reproduction instructions.
- Proof-of-concept (PoC) or exploit code, if available.
- Theoretical or proven impact of the vulnerability.

### Response Timeline

- **Initial Response**: Within 48 hours bounds.
- **Status Update**: Within 5 business days bounds.
- **Resolution Timeline**: Remediation timing depends on architectural complexity, though typically resolved within 30 days.

### Resolution Workflow

1. **Acknowledgment**: Confirmation of receipt and triaging of the report.
2. **Investigation**: Internal validation and scope analysis of the vulnerability.
3. **Remediation**: Development, resting, and review of the corresponding patch.
4. **Coordination**: Alignment on disclosure timing and mitigation releases.
5. **Credit**: Proper attribution within the release notes upon your authorization.

## Security Best Practices for End Users

To maximize data security while operating AGATE, adhere to these guidelines:

1. **Strict Upkeep**: Always run the latest verified release of AGATE.
2. **OS Hardening**: Ensure your base operating system is updated and secure.
3. **Environment Isolation**: Deploy the application only on trusted and authorized hardware.
4. **Data Redundancy**: Conduct periodic, encrypted backups using the native snapshot feature.
5. **Least Privilege**: Only authorize strictly necessary OAuth scopes when binding cloud accounts.

## Disclosure Strategy

Upon verification of a reported vulnerability, our maintenance protocol is as follows:

1. Confirm the exploit chain and list all affected application versions.
2. Conduct a deep architectural audit to identify parallel or cascading vulnerabilities.
3. Architect and validate fixes scoped for the supported distribution line.
4. Issue immediate rolling security patches.

We appreciate the continued dedication of the community in safeguarding AGATE and its users.
