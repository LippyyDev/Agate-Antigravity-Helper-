
import os
import sys
import base64
import json
import sqlite3
import shutil
import time
import subprocess
import psutil
from datetime import datetime
import httpx
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cli.proto_utils import create_unified_oauth_token, create_string_field, encode_varint, create_timestamp_field
try:
    import winreg
except ImportError:
    winreg = None

# API Constants from GoogleAPIService.ts
CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep' + '.apps.googleusercontent.com'
CLIENT_SECRET = 'GOCSPX-' + 'K58FWR486LdLJ1mLB8sXC4z6qDAf'
USER_AGENT = 'antigravity/1.11.3 Darwin/arm64'
URL_TOKEN = 'https://oauth2.googleapis.com/token'
URL_QUOTA = 'https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels'
URL_LOAD_PROJECT = 'https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist'

# Config
DB_NAME = 'cloud_accounts.db'
# Try to find user data path
if sys.platform == 'win32':
    APPDATA = os.getenv('APPDATA')
    USER_DATA_DIR = os.path.join(APPDATA, 'AntigravityManager')
    ANTIGRAVITY_APP_DATA = os.path.join(APPDATA, 'Antigravity IDE') # Or whatever the IDE name is
else:
    # Fallback for non-windows (though user is on windows)
    USER_DATA_DIR = os.path.expanduser('~/.config/AntigravityManager')
def find_antigravity_executable():
    """Smartly find the Antigravity IDE executable path."""
    # 1. Try to find if it's already running (most reliable)
    for proc in psutil.process_iter(['name', 'exe']):
        try:
            if proc.info['name'] and 'antigravity' in proc.info['name'].lower() and not 'manager' in proc.info['name'].lower():
                if proc.info['exe'] and os.path.exists(proc.info['exe']):
                    return proc.info['exe']
        except:
            pass

    # 2. Standard installation paths
    local_appdata = os.getenv('LOCALAPPDATA', '')
    prog_files = os.getenv('ProgramFiles', 'C:\\Program Files')
    
    candidates = [
        # User-specific install
        os.path.join(local_appdata, 'Programs', 'Antigravity', 'Antigravity.exe'),
        # System-wide install
        os.path.join(prog_files, 'Antigravity', 'Antigravity.exe'),
        # Developer/Custom paths (A: drive etc.)
        r"A:\Antigravity\Antigravity.exe",
        r"A:\UnityProjects\ManagerFork\AntigravityManager\out\Antigravity Manager-win32-x64\Antigravity Manager.exe"
    ]
    
    for path in candidates:
        if path and os.path.exists(path):
            return path
            
    return None

# Global path determined at runtime
ANTIGRAVITY_EXE_PATH = find_antigravity_executable()

CLOUD_DB_PATH = os.path.join(USER_DATA_DIR, DB_NAME)

# We need to decrypt safeStorage
try:
    import win32crypt
except ImportError:
    win32crypt = None

def decrypt_safe_storage(encrypted_data):
    if not win32crypt:
        raise ImportError("win32crypt module is missing. Install pywin32.")
    try:
        # data is iv:authTag:ciphertext
        # Wait, if it's safeStorage, the *key* in .mk is encrypted with DPAPI.
        # But the DB content is AES-256-GCM encrypted with that key.
        pass
    except Exception as e:
        print(f"Decryption error: {e}")
        return None

def get_data_dirs():
    home = os.path.expanduser('~')
    appdata = os.getenv('APPDATA')
    return [
        os.path.join(home, '.antigravity-agent'),
        os.path.join(appdata, 'Antigravity Manager'),
        os.path.join(appdata, 'AntigravityManager'),
        os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.config')),
        os.path.abspath(os.path.join(os.path.dirname(__file__), '..')),
    ]

def find_db_path():
    for d in get_data_dirs():
        p = os.path.join(d, DB_NAME)
        if os.path.exists(p):
            return p
    return None

def get_master_key():
    data_dirs = get_data_dirs()
    
    # 1. We need the OSCrypt key from "Local State"
    oscrypt_key = None
    for d in data_dirs:
        ls_path = os.path.join(d, 'Local State')
        if os.path.exists(ls_path):
            try:
                with open(ls_path, 'r', encoding='utf-8') as f:
                    ls_data = json.load(f)
                b64_key = ls_data['os_crypt']['encrypted_key']
                encrypted_key = base64.b64decode(b64_key)
                # Remove "DPAPI" fixed prefix (5 bytes)
                raw_key = encrypted_key[5:]
                # Decrypt with DPAPI
                _, master_key_v10 = win32crypt.CryptUnprotectData(raw_key, None, None, None, 0)
                oscrypt_key = master_key_v10
                # print(f"[DEBUG] Found OSCrypt key in {ls_path}")
                break
            except Exception as e:
                # print(f"[DEBUG] Failed to get OSCrypt key from {ls_path}: {e}")
                continue

    # 2. Now decrypt the .mk file using oscrypt_key
    for d in data_dirs:
        p = os.path.join(d, '.mk')
        if os.path.exists(p):
            with open(p, 'rb') as f:
                blob = f.read()
            
            try:
                # Check for "v10" prefix
                if blob.startswith(b'v10'):
                    if not oscrypt_key:
                        # print("[ERROR] Found v10 Master Key but no OSCrypt key to decrypt it.")
                        continue
                        
                    # Format: v10 (3) + nonce (12) + encrypted_data
                    nonce = blob[3:15]
                    ciphertext = blob[15:]
                    
                    aesgcm = AESGCM(oscrypt_key)
                    decrypted = aesgcm.decrypt(nonce, ciphertext, None)
                    key_hex = decrypted.decode('utf-8')
                    return bytes.fromhex(key_hex)
                else:
                    # Legacy DPAPI-only format
                    _, decrypted_bytes = win32crypt.CryptUnprotectData(blob, None, None, None, 0)
                    key_hex = decrypted_bytes.decode('utf-8')
                    return bytes.fromhex(key_hex)
            except Exception as e:
                # print(f"[ERROR] Failed to decrypt .mk at {p}: {e}")
                continue
                
    print("[ERROR] No valid Master Key found (OSCrypt/DPAPI failed).")
    return None

def decrypt_db_value(value, master_key):
    if not value or not isinstance(value, str):
        return value
    if value.startswith('{') or value.startswith('['):
        return value # Already plain
        
    parts = value.split(':')
    if len(parts) != 3:
        # print(f"[DEBUG] Encrypted value has unexpected format: {value[:20]}...")
        return value
        
    iv_hex, tag_hex, cipher_hex = parts
    try:
        iv = bytes.fromhex(iv_hex)
        tag = bytes.fromhex(tag_hex)
        ciphertext = bytes.fromhex(cipher_hex)
        
        aesgcm = AESGCM(master_key)
        # Python's AESGCM.decrypt takes nonce and data (ciphertext + tag).
        return aesgcm.decrypt(iv, ciphertext + tag, None).decode('utf-8')
    except Exception as e:
        # print(f"[DEBUG] AES Decrypt fail: {e}")
        return None

def encrypt_db_value(text: str, master_key: bytes) -> str:
    import secrets
    iv = secrets.token_bytes(16)
    
    aesgcm = AESGCM(master_key)
    # Python cryptography AESGCM.encrypt returns ciphertext + tag
    combined = aesgcm.encrypt(iv, text.encode('utf-8'), None)
    
    # Node.js format: iv_hex:auth_tag_hex:ciphertext_hex
    tag = combined[-16:]
    ciphertext = combined[:-16]
    
    return f"{iv.hex()}:{tag.hex()}:{ciphertext.hex()}"

def get_accounts():
    db_path = find_db_path()
    if not db_path:
        print(f"[ERROR] Could not find {DB_NAME}. Searched standard locations.")
        # Debug info
        print(f"APPDATA: {os.getenv('APPDATA')}")
        return []

    # print(f"[DEBUG] Using DB: {db_path}") # Uncomment if needed
    try:
        conn = sqlite3.connect(db_path)
    except sqlite3.OperationalError as e:
        print(f"[ERROR] Failed to open DB at {db_path}: {e}")
        return []

    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM accounts ORDER BY last_used DESC")
    rows = cursor.fetchall()
    
    master_key = get_master_key()
    accounts = []
    for row in rows:
        acc = dict(row)
        if master_key:
            token_json = decrypt_db_value(acc['token_json'], master_key)
            if token_json:
                acc['token'] = json.loads(token_json)
                
            quota_json = decrypt_db_value(acc['quota_json'], master_key)
            if quota_json:
                acc['quota'] = json.loads(quota_json)
        
        accounts.append(acc)
    conn.close()
    return accounts

def get_antigravity_db_path():
    # Logic from paths.ts
    # On Windows: %APPDATA%/Antigravity IDE/User/state.vscdb
    # Or %APPDATA%/Code/User/state.vscdb (if standard VSCode)
    # The user is likely using a custom build so folder might be 'Antigravity IDE' or similar.
    # Let's search standard locations.
    
    candidates = [
        os.path.join(APPDATA, 'Antigravity', 'User', 'globalStorage', 'state.vscdb'),
        os.path.join(APPDATA, 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb'),
        os.path.join(APPDATA, 'Antigravity IDE', 'User', 'state.vscdb'),
        os.path.join(APPDATA, 'Code', 'User', 'state.vscdb'),
        os.path.join(APPDATA, 'Antigravity', 'User', 'state.vscdb'),
        os.path.join(APPDATA, 'Antigravity', 'state.vscdb'),
    ]
    
    for p in candidates:
        if os.path.exists(p):
            return p
    return None

def inject_token(account):
    db_path = get_antigravity_db_path()
    if not db_path:
        print("Antigravity DB not found!")
        return False
        
    # Backup
    try:
        shutil.copy2(db_path, db_path + ".backup")
    except Exception as e:
        print(f"Backup failed: {e}")
        return False
        
    # Inject with transaction for atomicity
    token_data = account.get('token', {})
    access_token = token_data.get('access_token')
    refresh_token = token_data.get('refresh_token')
    expiry = token_data.get('expiry_timestamp')
    
    if not access_token or not refresh_token:
        print("Missing token data")
        return False
        
    value_b64 = create_unified_oauth_token(access_token, refresh_token, expiry)
    
    # Write to SQLite with transaction
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Start transaction
        cursor.execute("BEGIN")
        
        try:
            # Ensure table exists (it should)
            cursor.execute("CREATE TABLE IF NOT EXISTS ItemTable (key TEXT PRIMARY KEY, value TEXT)")
            
            # Upsert
            key = 'antigravityUnifiedStateSync.oauthToken'
            cursor.execute("INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)", (key, value_b64))
            
            # Also clean up auth status
            auth_status = json.dumps({
                "name": account.get('name') or account.get('email'),
                "email": account['email'],
                "apiKey": access_token
            })
            cursor.execute("INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)", ('antigravityAuthStatus', auth_status))
            cursor.execute("INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)", ('antigravityOnboarding', 'true'))
            cursor.execute("DELETE FROM ItemTable WHERE key = ?", ('google.antigravity',))
            
            # Commit transaction
            conn.commit()
            print(f"Injected token for {account['email']}")
            return True
        except Exception as e:
            # Rollback on error
            conn.rollback()
            print(f"Injection failed, rolled back: {e}")
            return False
        finally:
            conn.close()
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False

def kill_process(name_hints=["Antigravity", "Antigravity Manager"]):
    # On Windows it might be Antigravity.exe or Code.exe
    killed = False
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            pname = proc.info['name']
            if pname and any(hint.lower() in pname.lower() for hint in name_hints):
                proc.kill()
                killed = True
        except:
            pass
    return killed

def start_process():
    # Re-scan in case it was just closed/installed
    exe_path = ANTIGRAVITY_EXE_PATH or find_antigravity_executable()
    
    if not exe_path or not os.path.exists(exe_path):
        print(f"Error: Could not locate Antigravity executable.")
        return False
    
    print(f"Starting {exe_path}...")
    try:
        # DETACHED_PROCESS = 0x00000008 ensures the app lives after CLI exits
        subprocess.Popen([exe_path], creationflags=0x00000008, close_fds=True)
        return True
    except Exception as e:
        print(f"Failed to start process: {e}")
        return False

def switch_account(email_pattern):
    accounts = get_accounts()
    target = None
    for acc in accounts:
        if email_pattern.lower() in acc['email'].lower():
            target = acc
            break
            
    if not target:
        print(f"Account matching '{email_pattern}' not found.")
        return False
        
    print(f"Switching to {target['email']}...")
    
    # 1. Kill Process
    kill_process(["Antigravity.exe", "Antigravity"]) 
    time.sleep(1.0) # Give it a second
        
    # 2. Inject
    if inject_token(target):
        # 3. Start Process
        start_process()
        return True
    
    return False

async def refresh_access_token(refresh_token: str) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        params = {
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token',
        }
        resp = await client.post(URL_TOKEN, data=params)
        resp.raise_for_status()
        return resp.json()

async def fetch_project_id(access_token: str) -> str:
    async with httpx.AsyncClient(timeout=30.0) as client:
        headers = {
            'Authorization': f'Bearer {access_token}',
            'User-Agent': USER_AGENT,
            'Content-Type': 'application/json',
        }
        body = {'metadata': {'ideType': 'ANTIGRAVITY'}}
        resp = await client.post(URL_LOAD_PROJECT, json=body, headers=headers)
        if resp.is_success:
            return resp.json().get('cloudaicompanionProject')
    return None

async def fetch_live_quota(access_token: str) -> dict:
    project_id = await fetch_project_id(access_token)
    async with httpx.AsyncClient(timeout=30.0) as client:
        headers = {
            'Authorization': f'Bearer {access_token}',
            'User-Agent': USER_AGENT,
            'Content-Type': 'application/json',
        }
        payload = {}
        if project_id:
            payload['project'] = project_id
            
        resp = await client.post(URL_QUOTA, json=payload, headers=headers)
        resp.raise_for_status()
        
        raw_data = resp.json()
        result = {'models': {}}
        for name, info in raw_data.get('models', {}).items():
            q_info = info.get('quotaInfo')
            if q_info:
                fraction = q_info.get('remainingFraction', 0)
                result['models'][name] = {
                    'percentage': int(fraction * 100),
                    'resetTime': q_info.get('resetTime', '')
                }
        return result

async def update_account_quota_live(email: str):
    accounts = get_accounts()
    target = next((a for a in accounts if email.lower() in a['email'].lower()), None)
    
    if not target:
        print(f"[ERROR] Account matching '{email}' not found in database.")
        return
        
    if not target.get('token'):
        print(f"[ERROR] Found account {target['email']}, but could not decrypt its token.")
        print("Possible reason: Python CLI cannot access the Master Key or DPAPI is locked.")
        return

    print(f"Refreshing quota for {target['email']}...")
    try:
        # 1. Refresh token
        tokens = await refresh_access_token(target['token']['refresh_token'])
        new_access_token = tokens['access_token']
        
        # 2. Fetch quota
        new_quota = await fetch_live_quota(new_access_token)
        
        # 3. Save to DB
        db_path = find_db_path()
        master_key = get_master_key()
        if not master_key:
            print("Cannot update DB: Master Key missing.")
            return

        encrypted_quota = encrypt_db_value(json.dumps(new_quota), master_key)
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("UPDATE accounts SET quota_json = ? WHERE email = ?", (encrypted_quota, target['email']))
        conn.commit()
        conn.close()
        print("Quota updated successfully.")
    except Exception as e:
        print(f"Failed to refresh quota: {e}")

def add_to_windows_path(path_to_add: str) -> bool:
    if not winreg:
        print("Registry access not available on this platform.")
        return False
        
    try:
        # User Environment Path in Registry
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Environment', 0, winreg.KEY_ALL_ACCESS)
        try:
            current_path, _ = winreg.QueryValueEx(key, 'Path')
        except FileNotFoundError:
            current_path = ''
            
        if path_to_add in current_path:
            print(f"Path already contains: {path_to_add}")
            return True
            
        new_path = current_path
        if new_path and not new_path.endswith(';'):
            new_path += ';'
        new_path += path_to_add
        
        winreg.SetValueEx(key, 'Path', 0, winreg.REG_EXPAND_SZ, new_path)
        winreg.CloseKey(key)
        
        # Notify system about Environment changes (standard Windows behavior)
        import ctypes
        HWND_BROADCAST = 0xFFFF
        WM_SETTINGCHANGE = 0x001A
        ctypes.windll.user32.SendMessageTimeoutW(HWND_BROADCAST, WM_SETTINGCHANGE, 0, 'Environment', 0, 1000, 0)
        
        return True
    except Exception as e:
        print(f"Failed to update PATH: {e}")
        return False

def get_ide_accounts():
    """Read accounts from IDE's state.vscdb database."""
    db_path = get_antigravity_db_path()
    if not db_path:
        print("[ERROR] Could not find IDE database.")
        return []
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Read the storage JSON that contains account info
        cursor.execute("SELECT value FROM ItemTable WHERE key = 'antigravityAuthStatus'")
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return []
            
        auth_data = json.loads(row['value'])
        # IDE stores current active account, not a full list
        # We'll return it as a single-item list for consistency
        return [{
            'email': auth_data.get('email', ''),
            'name': auth_data.get('name', ''),
            'source': 'ide'
        }]
    except Exception as e:
        print(f"[ERROR] Failed to read IDE accounts: {e}")
        return []

def sync_accounts_from_ide():
    """Import accounts from IDE to CLI database."""
    ide_accounts = get_ide_accounts()
    cli_accounts = get_accounts()
    
    if not ide_accounts:
        print("No accounts found in IDE.")
        return
    
    cli_emails = {acc['email'] for acc in cli_accounts}
    new_accounts = [acc for acc in ide_accounts if acc['email'] not in cli_emails]
    
    if not new_accounts:
        print("All IDE accounts are already in CLI database.")
        return
    
    print(f"Found {len(new_accounts)} new account(s) in IDE:")
    for acc in new_accounts:
        print(f"  - {acc['email']}")
    
    # Note: We can't import tokens from IDE as they're in a different format
    # This is more of a "discovery" feature
    print("\n[INFO] To use these accounts in CLI, you need to add them via the Manager GUI first.")
    print("The CLI will then be able to read their tokens from the encrypted database.")

def compare_accounts():
    """Show differences between CLI and IDE accounts."""
    cli_accounts = get_accounts()
    ide_accounts = get_ide_accounts()
    
    cli_emails = {acc['email'] for acc in cli_accounts}
    ide_emails = {acc['email'] for acc in ide_accounts}
    
    only_in_cli = cli_emails - ide_emails
    only_in_ide = ide_emails - cli_emails
    in_both = cli_emails & ide_emails
    
    return {
        'cli_only': only_in_cli,
        'ide_only': only_in_ide,
        'both': in_both
    }

def is_token_expired(token_data: dict) -> bool:
    """Check if access token has expired based on expiry_timestamp."""
    if not token_data:
        return True
    
    expiry = token_data.get('expiry_timestamp')
    if not expiry:
        return True
    
    # expiry_timestamp is in milliseconds
    now_ms = int(time.time() * 1000)
    return now_ms >= expiry

async def validate_and_refresh_account(account: dict) -> dict:
    """Check token validity and refresh if needed. Returns status dict."""
    email = account['email']
    token_data = account.get('token')
    
    result = {
        'email': email,
        'valid': False,
        'refreshed': False,
        'error': None
    }
    
    if not token_data:
        result['error'] = 'No token data'
        return result
    
    if not is_token_expired(token_data):
        result['valid'] = True
        return result
    
    # Token expired, try to refresh
    try:
        refresh_token = token_data.get('refresh_token')
        if not refresh_token:
            result['error'] = 'No refresh token'
            return result
        
        print(f"[{email}] Token expired, refreshing...")
        new_tokens = await refresh_access_token(refresh_token)
        
        # Update in database
        db_path = find_db_path()
        master_key = get_master_key()
        
        if not master_key:
            result['error'] = 'Cannot access master key'
            return result
        
        # Merge new tokens with existing data
        updated_token = token_data.copy()
        updated_token['access_token'] = new_tokens['access_token']
        updated_token['expiry_timestamp'] = int(time.time() * 1000) + (new_tokens.get('expires_in', 3600) * 1000)
        
        encrypted_token = encrypt_db_value(json.dumps(updated_token), master_key)
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("UPDATE accounts SET token_json = ? WHERE email = ?", (encrypted_token, email))
        conn.commit()
        conn.close()
        
        result['valid'] = True
        result['refreshed'] = True
        return result
        
    except Exception as e:
        result['error'] = str(e)
        return result

async def validate_all_accounts():
    """Validate and refresh all accounts. Returns summary."""
    accounts = get_accounts()
    results = []
    
    for acc in accounts:
        result = await validate_and_refresh_account(acc)
        results.append(result)
    
    return results

def remove_account(email_pattern: str) -> bool:
    """Remove an account from the database."""
    db_path = find_db_path()
    if not db_path:
        print("Database not found.")
        return False
    
    accounts = get_accounts()
    target = None
    for acc in accounts:
        if email_pattern.lower() in acc['email'].lower():
            target = acc
            break
    
    if not target:
        print(f"Account matching '{email_pattern}' not found.")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM accounts WHERE email = ?", (target['email'],))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Failed to remove account: {e}")
        return False

def get_alias_path():
    """Get path to alias storage file."""
    return os.path.join(USER_DATA_DIR, 'aliases.json')

def get_aliases() -> dict:
    """Load account aliases from file."""
    alias_path = get_alias_path()
    if not os.path.exists(alias_path):
        return {}
    try:
        with open(alias_path, 'r') as f:
            return json.load(f)
    except:
        return {}

def set_alias(alias: str, email: str) -> bool:
    """Set an alias for an account."""
    aliases = get_aliases()
    aliases[alias] = email
    
    alias_path = get_alias_path()
    os.makedirs(os.path.dirname(alias_path), exist_ok=True)
    
    try:
        with open(alias_path, 'w') as f:
            json.dump(aliases, f, indent=2)
        return True
    except Exception as e:
        print(f"Failed to save alias: {e}")
        return False

def remove_alias(alias: str) -> bool:
    """Remove an alias."""
    aliases = get_aliases()
    if alias not in aliases:
        return False
    
    del aliases[alias]
    alias_path = get_alias_path()
    
    try:
        with open(alias_path, 'w') as f:
            json.dump(aliases, f, indent=2)
        return True
    except Exception as e:
        print(f"Failed to remove alias: {e}")
        return False

def resolve_email_or_alias(pattern: str) -> str:
    """Resolve alias to email or return pattern as-is."""
    aliases = get_aliases()
    return aliases.get(pattern, pattern)

def export_accounts(output_path: str) -> bool:
    """Export all accounts to an encrypted JSON file."""
    accounts = get_accounts()
    
    # Remove sensitive runtime data but keep encrypted tokens
    db_path = find_db_path()
    if not db_path:
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM accounts")
        rows = cursor.fetchall()
        conn.close()
        
        export_data = [dict(row) for row in rows]
        
        with open(output_path, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        return True
    except Exception as e:
        print(f"Export failed: {e}")
        return False

def import_accounts(input_path: str) -> bool:
    """Import accounts from a backup file."""
    if not os.path.exists(input_path):
        print(f"File not found: {input_path}")
        return False
    
    db_path = find_db_path()
    if not db_path:
        print("Database not found.")
        return False
    
    try:
        with open(input_path, 'r') as f:
            import_data = json.load(f)
        
        # Validate structure
        if not isinstance(import_data, list):
            print("Invalid backup format: expected list of accounts")
            return False
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Start transaction
        cursor.execute("BEGIN")
        
        imported = 0
        try:
            for acc in import_data:
                # Validate required fields
                if not isinstance(acc, dict):
                    print(f"Skipping invalid entry (not a dict)")
                    continue
                    
                if 'email' not in acc:
                    print(f"Skipping entry without email")
                    continue
                
                # Sanitize email
                email = str(acc['email']).strip()
                if not email or '@' not in email:
                    print(f"Skipping invalid email: {email}")
                    continue
                
                # Check if account already exists
                cursor.execute("SELECT email FROM accounts WHERE email = ?", (email,))
                if cursor.fetchone():
                    print(f"Skipping {email} (already exists)")
                    continue
                
                # Insert account with validated data
                cursor.execute(
                    "INSERT INTO accounts (email, token_json, quota_json, name, avatar_url, last_used, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (
                        email,
                        acc.get('token_json', ''),
                        acc.get('quota_json', ''),
                        acc.get('name', ''),
                        acc.get('avatar_url', ''),
                        int(acc.get('last_used', 0)),
                        0  # Never set imported accounts as active
                    )
                )
                imported += 1
            
            # Commit transaction
            conn.commit()
            print(f"Imported {imported} account(s).")
            return True
        except Exception as e:
            # Rollback on error
            conn.rollback()
            print(f"Import failed during transaction, rolled back: {e}")
            return False
        finally:
            conn.close()
            
    except json.JSONDecodeError as e:
        print(f"Invalid JSON in backup file: {e}")
        return False
    except Exception as e:
        print(f"Import failed: {e}")
        return False

def auto_select_best_account(min_quota: int = 50, prefer_model: str = None) -> dict:
    """Automatically select the best account based on quota."""
    accounts = get_accounts()
    
    best = None
    best_score = -1
    
    for acc in accounts:
        quota = acc.get('quota', {}).get('models', {})
        if not quota:
            continue
        
        # Calculate score
        if prefer_model:
            # Filter for specific model family
            relevant = [m['percentage'] for n, m in quota.items() if prefer_model.lower() in n.lower()]
            if not relevant:
                continue
            score = min(relevant)
        else:
            # Overall best: minimum of all quotas
            all_quotas = [m['percentage'] for m in quota.values()]
            score = min(all_quotas) if all_quotas else 0
        
        if score >= min_quota and score > best_score:
            best = acc
            best_score = score
    
    return best

def run_diagnostics() -> dict:
    """Run system diagnostics and return results."""
    results = {
        'python': {'status': 'ok', 'version': sys.version},
        'database': {'status': 'error', 'path': None},
        'master_key': {'status': 'error'},
        'ide_db': {'status': 'error', 'path': None},
        'exe': {'status': 'error', 'path': None},
        'accounts': {'status': 'error', 'count': 0},
    }
    
    # Check database
    db_path = find_db_path()
    if db_path:
        results['database'] = {'status': 'ok', 'path': db_path}
    
    # Check master key
    master_key = get_master_key()
    if master_key:
        results['master_key'] = {'status': 'ok'}
    
    # Check IDE database
    ide_db = get_antigravity_db_path()
    if ide_db:
        results['ide_db'] = {'status': 'ok', 'path': ide_db}
    
    # Check executable
    exe = ANTIGRAVITY_EXE_PATH
    if exe and os.path.exists(exe):
        results['exe'] = {'status': 'ok', 'path': exe}
    
    # Check accounts
    accounts = get_accounts()
    results['accounts'] = {'status': 'ok' if accounts else 'warning', 'count': len(accounts)}
    
    return results
