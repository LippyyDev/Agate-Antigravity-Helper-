
import typer
import sys
import psutil
from cli.core import get_accounts, switch_account
from rich.console import Console
from rich.table import Table

app = typer.Typer()
console = Console()

try:
    import questionary
    HAS_QUESTIONARY = True
except ImportError:
    HAS_QUESTIONARY = False

@app.callback(invoke_without_command=True)
def main_callback(ctx: typer.Context):
    """Interactive mode when no command is specified."""
    if ctx.invoked_subcommand is not None:
        return
    
    if not HAS_QUESTIONARY:
        console.print("[yellow]Run 'pip install questionary' for interactive mode[/yellow]")
        console.print("\nOr use: agm --help")
        return
    
    interactive_mode()

def interactive_mode():
    """Show interactive menu for selecting actions."""
    try:
        console.print("\n[bold cyan]Antigravity Manager - Interactive Mode[/bold cyan]\n")
        
        choices = [
            "List all accounts",
            "Switch account",
            "Refresh quotas",
            "Validate tokens",
            "Show status",
            "Sync status",
            "Auto-switch to best account",
            "Manage aliases",
            "Export/Import",
            "Run diagnostics",
            "Setup PATH",
            "Exit",
        ]
        
        action = questionary.select(
            "What would you like to do?",
            choices=choices
        ).ask()
        
        if not action or action == "Exit":
            console.print("[yellow]Goodbye![/yellow]")
            return
        
        # Execute based on selection with error handling
        try:
            if "List" in action:
                list()
            elif "Switch" in action:
                interactive_switch()
            elif "Refresh" in action:
                interactive_refresh()
            elif "Validate" in action:
                validate()
            elif "status" in action.lower():
                status()
            elif "Sync" in action:
                sync()
            elif "Auto-switch" in action:
                interactive_auto_switch()
            elif "aliases" in action:
                interactive_aliases()
            elif "Export/Import" in action:
                interactive_export_import()
            elif "diagnostics" in action:
                doctor()
            elif "PATH" in action:
                setup_path()
        except Exception as e:
            console.print(f"[red]An error occurred: {e}[/red]")
            console.print("[yellow]Please try again or report this issue.[/yellow]")
        
        # Ask to continue
        if questionary.confirm("\nContinue?", default=True).ask():
            interactive_mode()
    except KeyboardInterrupt:
        console.print("\n[yellow]Goodbye![/yellow]")
    except Exception as e:
        console.print(f"[red]Fatal error in interactive mode: {e}[/red]")

def interactive_switch():
    """Interactive account switching."""
    accounts = get_accounts()
    if not accounts:
        console.print("[red]No accounts found[/red]")
        return
    
    choices = [f"{acc['email']}" for acc in accounts]
    
    selected = questionary.select(
        "Select account to switch to:",
        choices=choices
    ).ask()
    
    if selected:
        switch(selected)

def interactive_refresh():
    """Interactive quota refresh."""
    choices = [
        "Refresh all accounts",
        "Refresh specific account",
    ]
    
    action = questionary.select(
        "Refresh options:",
        choices=choices
    ).ask()
    
    if "all" in action.lower():
        refresh_all()
    else:
        accounts = get_accounts()
        if not accounts:
            console.print("[red]No accounts found[/red]")
            return
        
        selected = questionary.select(
            "Select account:",
            choices=[acc['email'] for acc in accounts]
        ).ask()
        
        if selected:
            refresh(selected)

def interactive_auto_switch():
    """Interactive auto-switch configuration."""
    min_quota = questionary.text(
        "Minimum quota percentage?",
        default="50"
    ).ask()
    
    model_choices = ["Any model", "Gemini", "Claude"]
    model_pref = questionary.select(
        "Prefer specific model?",
        choices=model_choices
    ).ask()
    
    model = None if model_pref == "Any model" else model_pref.lower()
    
    auto_switch(int(min_quota), model)

def interactive_aliases():
    """Interactive alias management."""
    from cli.core import get_aliases, set_alias, remove_alias
    
    choices = [
        "View all aliases",
        "Add new alias",
        "Remove alias",
    ]
    
    action = questionary.select(
        "Alias management:",
        choices=choices
    ).ask()
    
    if "View" in action:
        alias(None)
    elif "Add" in action:
        alias_name = questionary.text("Alias name:").ask()
        accounts = get_accounts()
        email = questionary.select(
            "Select account:",
            choices=[acc['email'] for acc in accounts]
        ).ask()
        if alias_name and email:
            alias(alias_name, email)
    elif "Remove" in action:
        aliases = get_aliases()
        if not aliases:
            console.print("[yellow]No aliases to remove[/yellow]")
            return
        alias_name = questionary.select(
            "Select alias to remove:",
            choices=list(aliases.keys())
        ).ask()
        if alias_name:
            unalias(alias_name)

def interactive_export_import():
    """Interactive export/import."""
    action = questionary.select(
        "Export or Import?",
        choices=["Export accounts", "Import from backup"]
    ).ask()
    
    if "Export" in action:
        filename = questionary.text(
            "Output filename:",
            default="accounts_backup.json"
        ).ask()
        if filename:
            export(filename)
    else:
        filename = questionary.text(
            "Input filename:",
            default="accounts_backup.json"
        ).ask()
        if filename:
            import_backup(filename)

@app.command()
def list():
    """List all accounts with summarized quotas."""
    accounts = get_accounts()
    
    table = Table(title="Antigravity Accounts")
    table.add_column("Account (Email)", style="cyan", no_wrap=True)
    table.add_column("Status", style="bold green", justify="center")
    table.add_column("Gemini Pro", style="magenta", justify="right")
    table.add_column("Gemini Flash", style="yellow", justify="right")
    table.add_column("Claude (All)", style="blue", justify="right")
    
    for acc in accounts:
        status = "● [Active]" if acc.get('is_active') else ""
        quota = acc.get('quota', {}).get('models', {})
        
        # Check token expiry
        from cli.core import is_token_expired
        token_expired = is_token_expired(acc.get('token'))
        if token_expired:
            status += " [red]⚠ Token Expired[/red]"
        
        # Gemini Pro Group
        gp_vals = [m['percentage'] for n, m in quota.items() if 'gemini' in n.lower() and 'pro' in n.lower()]
        gp_str = f"{min(gp_vals)}%" if gp_vals else "-"
        
        # Gemini Flash
        gf_vals = [m['percentage'] for n, m in quota.items() if 'gemini' in n.lower() and 'flash' in n.lower()]
        gf_str = f"{min(gf_vals)}%" if gf_vals else "-"
        
        # Claude Group
        c_vals = [m['percentage'] for n, m in quota.items() if 'claude' in n.lower()]
        c_str = f"{min(c_vals)}%" if c_vals else "-"
        
        # Highlight low quotas
        if gp_vals and min(gp_vals) < 20:
            gp_str = f"[red]{gp_str}[/red]"
        if gf_vals and min(gf_vals) < 20:
            gf_str = f"[red]{gf_str}[/red]"
        if c_vals and min(c_vals) < 20:
            c_str = f"[red]{c_str}[/red]"
        
        table.add_row(acc['email'], status, gp_str, gf_str, c_str)
        
    console.print(table)

@app.command()
def info(email: str):
    """Show detailed quota information for a specific account."""
    from cli.core import resolve_email_or_alias
    email = resolve_email_or_alias(email)
    
    accounts = get_accounts()
    target = None
    for acc in accounts:
        if email in acc['email']:
            target = acc
            break
            
    if not target:
        console.print(f"[red]Account '{email}' not found.[/red]")
        return

    console.print(f"\n[bold cyan]Account details: {target['email']}[/bold cyan]")
    
    quota_data = target.get('quota', {}).get('models', {})
    if not quota_data:
        console.print("[yellow]No quota data available for this account. Refresh in UI first.[/yellow]")
        return

    table = Table(title="Model Quotas", show_header=True, header_style="bold")
    table.add_column("Provider", style="dim", width=12)
    table.add_column("Model Name", style="white")
    table.add_column("Score", style="bold", justify="right")
    table.add_column("Reset Time", style="dim")

    # Sort and group
    sorted_models = sorted(quota_data.items(), key=lambda x: x[1].get('percentage', 0), reverse=True)
    for name, info in sorted_models:
        pct = info.get('percentage', 0)
        reset = info.get('resetTime', 'N/A')
        color = "green" if pct > 50 else "yellow" if pct > 20 else "red"
        
        display_name = name.replace('cloudaicompanion.googleapis.com/', '')
        provider = "GOOGLE" if "gemini" in name.lower() else "ANTHROPIC" if "claude" in name.lower() else "OTHER"
        
        table.add_row(provider, display_name, f"[{color}]{pct}%[/{color}]", reset)

    console.print(table)

@app.command()
def switch(email: str):
    """Switch to an account by email/pattern/alias."""
    from cli.core import resolve_email_or_alias
    email = resolve_email_or_alias(email)
    
    if switch_account(email):
        console.print(f"[bold green]Switch completed successfully.[/bold green]")
    else:
        console.print("[bold red]Switch failed.[/bold red]")
        raise typer.Exit(code=1)

@app.command()
def refresh(email: str):
    """Fetch live quotas from Google API for an account."""
    import asyncio
    from cli.core import update_account_quota_live, resolve_email_or_alias
    email = resolve_email_or_alias(email)
    asyncio.run(update_account_quota_live(email))

@app.command()
def refresh_all():
    """Refresh quotas for ALL stored accounts at once."""
    import asyncio
    from cli.core import update_account_quota_live, get_accounts
    
    accounts = get_accounts()
    console.print(f"[bold yellow]Starting bulk refresh for {len(accounts)} accounts...[/bold yellow]\n")
    
    async def run_all():
        errors = []
        success = 0
        
        for acc in accounts:
            try:
                await update_account_quota_live(acc['email'])
                success += 1
            except Exception as e:
                errors.append((acc['email'], str(e)))
                console.print(f"[red]✗ Error refreshing {acc['email']}: {e}[/red]")
        
        return success, errors
            
    success_count, errors = asyncio.run(run_all())
    
    console.print(f"\n[bold green]Completed: {success_count} successful[/bold green]")
    if errors:
        console.print(f"[bold red]{len(errors)} failed[/bold red]")


@app.command()
def validate():
    """Check all tokens and auto-refresh expired ones."""
    import asyncio
    from cli.core import validate_all_accounts
    
    console.print("[bold yellow]Validating all account tokens...[/bold yellow]\n")
    
    results = asyncio.run(validate_all_accounts())
    
    valid_count = 0
    refreshed_count = 0
    error_count = 0
    
    for result in results:
        email = result['email']
        
        if result['error']:
            console.print(f"[red]✗[/red] {email}: {result['error']}")
            error_count += 1
        elif result['refreshed']:
            console.print(f"[green]✓[/green] {email}: Token refreshed successfully")
            refreshed_count += 1
        elif result['valid']:
            console.print(f"[green]✓[/green] {email}: Token valid")
            valid_count += 1
    
    console.print(f"\n[bold]Summary:[/bold]")
    console.print(f"  Valid: {valid_count}")
    console.print(f"  Refreshed: {refreshed_count}")
    if error_count > 0:
        console.print(f"  [red]Errors: {error_count}[/red]")

@app.command()
def sync():
    """Show sync status between CLI database and IDE."""
    from cli.core import compare_accounts
    
    console.print("\n[bold cyan]Account Sync Status[/bold cyan]\n")
    
    diff = compare_accounts()
    
    if diff['both']:
        console.print("[bold green]✓ In Both (CLI + IDE):[/bold green]")
        for email in diff['both']:
            console.print(f"  • {email}")
        console.print()
    
    if diff['cli_only']:
        console.print("[bold yellow]⚠ Only in CLI Database:[/bold yellow]")
        for email in diff['cli_only']:
            console.print(f"  • {email}")
        console.print("  [dim]These accounts won't appear in the IDE until you switch to them.[/dim]\n")
    
    if diff['ide_only']:
        console.print("[bold magenta]⚠ Only in IDE:[/bold magenta]")
        for email in diff['ide_only']:
            console.print(f"  • {email}")
        console.print("  [dim]This is the currently active account in the IDE.[/dim]\n")
    
    if not diff['cli_only'] and not diff['ide_only']:
        console.print("[bold green]Everything is in sync! ✓[/bold green]")

@app.command()
def remove(email: str):
    """Remove an account from the database."""
    from cli.core import remove_account, resolve_email_or_alias
    email = resolve_email_or_alias(email)
    
    if typer.confirm(f"Remove {email} from database?"):
        if remove_account(email):
            console.print(f"[green]Removed {email}[/green]")
        else:
            console.print("[red]Failed to remove account[/red]")
    else:
        console.print("Cancelled.")

@app.command()
def alias(name: str, email: str = None):
    """Set or view account aliases."""
    from cli.core import get_aliases, set_alias, remove_alias
    
    if email is None:
        # Show all aliases
        aliases = get_aliases()
        if not aliases:
            console.print("[yellow]No aliases set.[/yellow]")
            return
        
        table = Table(title="Account Aliases")
        table.add_column("Alias", style="cyan")
        table.add_column("Email", style="magenta")
        
        for alias_name, email_addr in aliases.items():
            table.add_row(alias_name, email_addr)
        
        console.print(table)
    else:
        # Set alias
        if set_alias(name, email):
            console.print(f"[green]Alias '{name}' → {email}[/green]")
        else:
            console.print("[red]Failed to set alias[/red]")

@app.command()
def unalias(name: str):
    """Remove an alias."""
    from cli.core import remove_alias
    
    if remove_alias(name):
        console.print(f"[green]Removed alias '{name}'[/green]")
    else:
        console.print(f"[yellow]Alias '{name}' not found[/yellow]")

@app.command()
def export(output: str = "accounts_backup.json"):
    """Export all accounts to a backup file."""
    from cli.core import export_accounts
    
    if export_accounts(output):
        console.print(f"[green]Exported accounts to {output}[/green]")
    else:
        console.print("[red]Export failed[/red]")

@app.command()
def import_backup(input: str):
    """Import accounts from a backup file."""
    from cli.core import import_accounts
    
    if import_accounts(input):
        console.print("[green]Import completed[/green]")
    else:
        console.print("[red]Import failed[/red]")

@app.command()
def auto_switch(min_quota: int = 50, model: str = None):
    """Automatically switch to the best available account."""
    from cli.core import auto_select_best_account
    
    console.print(f"[yellow]Searching for best account (min quota: {min_quota}%)...[/yellow]")
    
    best = auto_select_best_account(min_quota, model)
    
    if not best:
        console.print(f"[red]No account found with quota >= {min_quota}%[/red]")
        return
    
    console.print(f"[green]Best account: {best['email']}[/green]")
    
    if typer.confirm("Switch to this account?"):
        if switch_account(best['email']):
            console.print("[bold green]Switch completed![/bold green]")
        else:
            console.print("[bold red]Switch failed[/bold red]")

@app.command()
def status():
    """Show quick overview of active account and quotas."""
    from cli.core import get_accounts
    
    accounts = get_accounts()
    active = next((a for a in accounts if a.get('is_active')), None)
    
    if not active:
        # Pick first account
        active = accounts[0] if accounts else None
    
    if not active:
        console.print("[red]No accounts found[/red]")
        return
    
    console.print(f"\n[bold cyan]Active Account:[/bold cyan] {active['email']}")
    
    quota = active.get('quota', {}).get('models', {})
    if quota:
        gp_vals = [m['percentage'] for n, m in quota.items() if 'gemini' in n.lower() and 'pro' in n.lower()]
        c_vals = [m['percentage'] for n, m in quota.items() if 'claude' in n.lower()]
        
        gp_min = min(gp_vals) if gp_vals else 0
        c_min = min(c_vals) if c_vals else 0
        
        console.print(f"[magenta]Gemini Pro:[/magenta] {gp_min}%")
        console.print(f"[blue]Claude:[/blue] {c_min}%")
    else:
        console.print("[yellow]No quota data available[/yellow]")
    
    console.print()

@app.command()
def doctor():
    """Run system diagnostics."""
    from cli.core import run_diagnostics
    
    console.print("\n[bold cyan]Running diagnostics...[/bold cyan]\n")
    
    results = run_diagnostics()
    
    for component, data in results.items():
        status = data['status']
        icon = "✓" if status == 'ok' else "⚠" if status == 'warning' else "✗"
        color = "green" if status == 'ok' else "yellow" if status == 'warning' else "red"
        
        console.print(f"[{color}]{icon}[/{color}] {component.upper()}: ", end="")
        
        if status == 'ok':
            if 'path' in data:
                console.print(f"[dim]{data['path']}[/dim]")
            elif 'count' in data:
                console.print(f"{data['count']} accounts")
            elif 'version' in data:
                console.print(f"{data['version'].split()[0]}")
            else:
                console.print("OK")
        else:
            console.print(f"[{color}]{status.upper()}[/{color}]")
    
    console.print()

@app.command()
def watch(interval: int = 10):
    """Live monitoring of account quotas (updates every N seconds)."""
    import time
    import os
    
    try:
        while True:
            os.system('cls' if os.name == 'nt' else 'clear')
            console.print(f"[dim]Press Ctrl+C to stop. Refreshing every {interval}s...[/dim]\n")
            list()
            time.sleep(interval)
    except KeyboardInterrupt:
        console.print("\n[yellow]Stopped monitoring.[/yellow]")

@app.command()
def setup_path():
    """Add the current directory to Windows PATH to use 'agm' command globally."""
    import os
    from cli.core import add_to_windows_path
    
    current_dir = os.getcwd()
    if typer.confirm(f"Add '{current_dir}' to your User PATH?"):
        if add_to_windows_path(current_dir):
            console.print("[bold green]Success![/bold green] Path updated.")
            console.print("[yellow]Please RESTART your terminal/IDE for changes to take effect.[/yellow]")
        else:
            console.print("[bold red]Failed to update PATH.[/bold red]")
    else:
        console.print("Operation cancelled.")

if __name__ == "__main__":
    app()
