# Antigravity Manager CLI

A powerful command-line interface for managing multiple Google Cloud AI accounts in Antigravity IDE. Supports account switching, quota monitoring, token validation, and more.

## Features

- 📊 **Quota Management**: Real-time quota tracking for Gemini and Claude models
- 🔄 **Account Switching**: Seamless switching between multiple Google accounts
- ✅ **Token Validation**: Automatic token refresh and expiry detection
- 🎯 **Smart Auto-Switch**: Automatically select the best account based on quotas
- 🏷️ **Aliases**: Create shortcuts for your accounts (e.g., `work`, `personal`)
- 💾 **Backup/Restore**: Export and import account configurations
- 🔍 **Database Sync**: View sync status between CLI and IDE
- 🩺 **Diagnostics**: System health checks and troubleshooting
- 🎮 **Interactive Mode**: Beautiful keyboard-navigated menus

## Installation

1. **Install Python dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

2. **(Optional) Add to PATH:**
   ```powershell
   .\agm.bat setup-path
   ```
   Restart your terminal after this.

## Quick Start

### Interactive Mode (Recommended for Beginners)
Simply run without arguments to get a menu:
```powershell
.\agm.bat
```

### Command Line (For Power Users)

**List all accounts:**
```powershell
agm list
```

**Switch accounts:**
```powershell
agm switch alekstwin63@gmail.com
# or use partial match
agm switch aleks
```

**Refresh quotas:**
```powershell
agm refresh-all
# or single account
agm refresh alekstwin63@gmail.com
```

**Validate tokens:**
```powershell
agm validate
```

**Quick status:**
```powershell
agm status
```

## Advanced Features

### Aliases
Create shortcuts for frequently used accounts:
```powershell
# Set alias
agm alias work alekstwin63@gmail.com

# Use alias
agm switch work
agm refresh work

# View all aliases
agm alias

# Remove alias
agm unalias work
```

### Auto-Switch
Automatically switch to the account with the best quota:
```powershell
# Any model with at least 50% quota
agm auto-switch

# Prefer Claude models
agm auto-switch --model claude --min-quota 30

# Prefer Gemini models
agm auto-switch --model gemini --min-quota 60
```

### Backup & Restore
```powershell
# Export accounts
agm export my_accounts.json

# Import accounts
agm import-backup my_accounts.json
```

### Live Monitoring
Watch quota changes in real-time:
```powershell
# Refresh every 10 seconds (default)
agm watch

# Custom interval
agm watch --interval 30
```

### Diagnostics
Run system health checks:
```powershell
agm doctor
```

## All Commands

| Command | Description |
|---------|-------------|
| `agm list` | List all accounts with quota summary |
| `agm info <email>` | Show detailed quota for specific account |
| `agm switch <email>` | Switch to an account |
| `agm status` | Show active account and quotas |
| `agm refresh <email>` | Refresh quotas for one account |
| `agm refresh-all` | Refresh quotas for all accounts |
| `agm validate` | Check and refresh expired tokens |
| `agm sync` | Show CLI ↔ IDE sync status |
| `agm remove <email>` | Delete an account from database |
| `agm alias [name] [email]` | Manage account aliases |
| `agm unalias <name>` | Remove an alias |
| `agm export [file]` | Export accounts to JSON |
| `agm import-backup <file>` | Import accounts from backup |
| `agm auto-switch` | Switch to best account automatically |
| `agm watch [--interval N]` | Live quota monitoring |
| `agm doctor` | Run system diagnostics |
| `agm setup-path` | Add CLI to Windows PATH |

## How It Works

The CLI interacts directly with the Antigravity Manager's encrypted database:

1. **Database Location**: Auto-discovers the database in `%APPDATA%\AntigravityManager` or IDE installation directory
2. **Encryption**: Uses Windows DPAPI + AES-256-GCM to decrypt account tokens (same as the IDE)
3. **Quota API**: Fetches live quota data from Google Cloud AI REST API
4. **Process Control**: Can start/stop the IDE executable automatically

## Troubleshooting

**"Database not found" error:**
- Ensure Antigravity Manager has been run at least once
- Check if accounts exist in the GUI first

**"Failed to decrypt" error:**
- Run `agm doctor` to diagnose
- Ensure you're on the same Windows user account

**"Token expired" warnings:**
- Run `agm validate` to auto-refresh all tokens

**Quota not updating:**
- Run `agm refresh-all` to force update
- Check network connection

## Requirements

- Windows 10/11
- Python 3.8+
- Antigravity Manager (for database access)

## Development

The CLI is split into two main modules:

- **`core.py`**: Core functionality (database access, API calls, encryption)
- **`main.py`**: Command definitions and interactive UI
- **`proto_utils.py`**: Protobuf encoding helpers

## License

Same as parent project.

## Contributing

Pull requests welcome! Please ensure:
- Code follows existing style
- All commands have help text
- No hardcoded paths or credentials
