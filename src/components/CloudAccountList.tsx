import {
  useCloudAccounts,
  useRefreshQuota,
  useDeleteCloudAccount,
  useAddGoogleAccount,
  useSwitchCloudAccount,
  useAutoSwitchEnabled,
  useSetAutoSwitchEnabled,
  useForcePollCloudMonitor,
  useSyncLocalAccount,
  startAuthFlow,
  useUpdateCloudAccountLabel,
  useExportAccounts,
  useImportAccounts,
} from '@/hooks/useCloudAccounts';
import { useCategories, useUpdateAccountCategory } from '@/hooks/useCategories';
import { CloudAccountCard } from '@/components/CloudAccountCard';
import { IdentityProfileDialog } from '@/components/IdentityProfileDialog';
import { CloudAccount } from '@/types/cloudAccount';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

import {
  Plus,
  Loader2,
  Cloud,
  Zap,
  RefreshCcw,
  Download,
  CheckSquare,
  Trash2,
  X,
  RefreshCw,
  LayoutGrid,
  List,
  Columns2,
  Columns3,
  Search,
  Filter,
  Upload,
  FolderOpen,
  Lock,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalizedErrorMessage } from '@/utils/errorMessages';
import { useAppConfig } from '@/hooks/useAppConfig';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ... (existing code: imports and comments)

export type GridLayout = 'auto' | '2-col' | '3-col' | 'list';

const GRID_LAYOUT_CLASSES: Record<GridLayout, string> = {
  auto: 'grid gap-4 md:grid-cols-2 xl:grid-cols-3',
  '2-col': 'grid gap-4 grid-cols-2',
  '3-col': 'grid gap-4 grid-cols-3',
  list: 'grid gap-4 grid-cols-1',
};

export function CloudAccountList() {
  const { t } = useTranslation();
  const { data: accounts, isLoading, isError, error, errorUpdatedAt, refetch } = useCloudAccounts();
  const { data: categories = [] } = useCategories();
  const { config, saveConfig } = useAppConfig();
  const refreshMutation = useRefreshQuota();
  const deleteMutation = useDeleteCloudAccount();
  const addMutation = useAddGoogleAccount();
  const switchMutation = useSwitchCloudAccount();
  const syncMutation = useSyncLocalAccount();
  const updateLabelMutation = useUpdateCloudAccountLabel();
  const updateCategoryMutation = useUpdateAccountCategory();

  const { data: autoSwitchEnabled, isLoading: isSettingsLoading } = useAutoSwitchEnabled();
  const setAutoSwitchMutation = useSetAutoSwitchEnabled();
  const forcePollMutation = useForcePollCloudMonitor();
  const exportMutation = useExportAccounts();
  const importMutation = useImportAccounts();

  const { toast } = useToast();
  const lastCloudLoadErrorToastAt = useRef<number>(0);

  const gridLayout: GridLayout = (config?.grid_layout as GridLayout) || 'auto';

  const setGridLayout = async (layout: GridLayout) => {
    if (config) {
      await saveConfig({ ...config, grid_layout: layout });
    }
  };

  // Calculate global quota across all accounts
  const globalQuota = useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return null;
    }

    const visibilitySettings = config?.model_visibility ?? {};
    let totalPercentage = 0;
    let modelCount = 0;

    accounts.forEach((account) => {
      if (!account.quota?.models) {
        return;
      }
      Object.entries(account.quota.models).forEach(([modelName, info]) => {
        if (visibilitySettings[modelName] !== false) {
          totalPercentage += info.percentage;
          modelCount++;
        }
      });
    });

    if (modelCount === 0) {
      return null;
    }

    return Math.round((totalPercentage / modelCount) * 10) / 10;
  }, [accounts, config?.model_visibility]);

  const getGlobalQuotaColor = (percentage: number) => {
    if (percentage > 80) {
      return 'bg-emerald-500';
    }
    if (percentage > 20) {
      return 'bg-amber-500';
    }
    return 'bg-rose-500';
  };

  const getGlobalQuotaTextColor = (percentage: number) => {
    if (percentage > 80) {
      return 'text-emerald-600 dark:text-emerald-400';
    }
    if (percentage > 20) {
      return 'text-amber-600 dark:text-amber-400';
    }
    return 'text-rose-600 dark:text-rose-400';
  };

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [identityAccount, setIdentityAccount] = useState<CloudAccount | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Export dialog state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');

  // Import dialog state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importPassword, setImportPassword] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const totalAccounts = accounts?.length || 0;
  const activeAccounts = accounts?.filter((account) => account.is_active).length || 0;
  const rateLimitedAccounts =
    accounts?.filter((account) => account.status === 'rate_limited').length || 0;

  const handleAddAccount = (codeVal?: string) => {
    const codeToUse = codeVal || authCode;
    if (!codeToUse) {
      return;
    }
    addMutation.mutate(
      { authCode: codeToUse },
      {
        onSuccess: () => {
          setIsAddDialogOpen(false);
          setAuthCode('');
          toast({ title: t('cloud.toast.addSuccess') });
        },
        onError: (err) => {
          toast({
            title: t('cloud.toast.addFailed.title'),
            description: getLocalizedErrorMessage(err, t),
            variant: 'destructive',
          });
        },
      },
    );
  };
  // Listen for Google Auth Code
  useEffect(() => {
    if (window.electron?.onGoogleAuthCode) {
      console.log('[OAuth] Setting up auth code listener, dialog open:', isAddDialogOpen);
      const cleanup = window.electron.onGoogleAuthCode((code) => {
        console.log('[OAuth] Received auth code via IPC:', code?.substring(0, 10) + '...');
        setAuthCode(code);
        // Note: Auto-submit will be triggered by the authCode change effect below
      });
      return cleanup;
    }
  }, []);

  // Auto-submit when authCode is set and dialog is open
  useEffect(() => {
    if (authCode && isAddDialogOpen && !addMutation.isPending) {
      console.log('[OAuth] Auto-submitting auth code');
      handleAddAccount(authCode);
    }
  }, [authCode, isAddDialogOpen]);

  // Batch Operations State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isError || !errorUpdatedAt || errorUpdatedAt === lastCloudLoadErrorToastAt.current) {
      return;
    }

    toast({
      title: t('cloud.error.loadFailed'),
      description: getLocalizedErrorMessage(error, t),
      variant: 'destructive',
    });
    lastCloudLoadErrorToastAt.current = errorUpdatedAt;
  }, [error, errorUpdatedAt, isError, t, toast]);

  // ... (existing code: handleRefresh, handleSwitch, handleDelete)

  const handleRefresh = useCallback((id: string) => {
    refreshMutation.mutate(
      { accountId: id },
      {
        onSuccess: () => toast({ title: t('cloud.toast.quotaRefreshed') }),
        onError: () => toast({ title: t('cloud.toast.refreshFailed'), variant: 'destructive' }),
      },
    );
  }, [refreshMutation, toast, t]);

  const handleSwitch = useCallback((id: string) => {
    switchMutation.mutate(
      { accountId: id },
      {
        onSuccess: () =>
          toast({
            title: t('cloud.toast.switched.title'),
            description: t('cloud.toast.switched.description'),
          }),
        onError: (err) =>
          toast({
            title: t('cloud.toast.switchFailed'),
            description: getLocalizedErrorMessage(err, t),
            variant: 'destructive',
          }),
      },
    );
  }, [switchMutation, toast, t]);

  const handleDelete = useCallback((id: string) => {
    if (confirm(t('cloud.toast.deleteConfirm'))) {
      deleteMutation.mutate(
        { accountId: id },
        {
          onSuccess: () => {
            toast({ title: t('cloud.toast.deleted') });
            // Clear from selection if deleted
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          },
          onError: () => toast({ title: t('cloud.toast.deleteFailed'), variant: 'destructive' }),
        },
      );
    }
  }, [deleteMutation, toast, t]);

  const handleExport = useCallback(() => {
    const accountIds = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
    exportMutation.mutate(
      { accountIds, password: exportPassword || undefined },
      {
        onSuccess: (result) => {
          const { filePath, count } = result as { filePath: string | null; count: number };
          // User cancelled the native save dialog — do nothing
          if (filePath === null) {
            return;
          }
          toast({
            title: t('cloud.export.successTitle'),
            description: t('cloud.export.successDesc', { count }),
          });
          setIsExportDialogOpen(false);
          setExportPassword('');
        },
        onError: (err) =>
          toast({
            title: t('cloud.export.errorTitle'),
            description: getLocalizedErrorMessage(err, t),
            variant: 'destructive',
          }),
      },
    );
  }, [exportMutation, exportPassword, selectedIds, toast, t]);


  const handleImport = useCallback(() => {
    if (!importFile) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const bundleJson = event.target?.result as string;
      importMutation.mutate(
        { bundleJson, password: importPassword || undefined },
        {
          onSuccess: (result) => {
            toast({
              title: t('cloud.import.successTitle'),
              description: t('cloud.import.successDesc', {
                imported: result.imported,
                skipped: result.skipped,
              }),
            });
            setIsImportDialogOpen(false);
            setImportFile(null);
            setImportPassword('');
          },
          onError: (err) =>
            toast({
              title: t('cloud.import.errorTitle'),
              description: getLocalizedErrorMessage(err, t),
              variant: 'destructive',
            }),
        },
      );
    };
    reader.readAsText(importFile);
  }, [importFile, importMutation, importPassword, toast, t]);


  const handleManageIdentity = useCallback((id: string) => {
    const target = (accounts || []).find((item) => item.id === id) || null;
    setIdentityAccount(target);
  }, [accounts]);

  const handleEditLabel = useCallback((id: string, label: string) => {
    updateLabelMutation.mutate(
      { accountId: id, label },
      {
        onSuccess: () => toast({ title: 'Account label updated successfully' }),
        onError: (err) =>
          toast({
            title: 'Failed to update label',
            description: getLocalizedErrorMessage(err, t),
            variant: 'destructive',
          }),
      }
    );
  }, [updateLabelMutation, toast, t]);

  const handleAssignCategory = useCallback((accountId: string, categoryId: string | null) => {
    updateCategoryMutation.mutate(
      { accountId, categoryId },
      {
        onSuccess: () => toast({ title: 'Category updated' }),
        onError: (err) =>
          toast({
            title: 'Failed to update category',
            description: getLocalizedErrorMessage(err, t),
            variant: 'destructive',
          }),
      },
    );
  }, [updateCategoryMutation, toast, t]);

  const handleToggleAutoSwitch = (checked: boolean) => {
    setAutoSwitchMutation.mutate(
      { enabled: checked },
      {
        onSuccess: () =>
          toast({
            title: checked ? t('cloud.toast.autoSwitchOn') : t('cloud.toast.autoSwitchOff'),
          }),
        onError: () =>
          toast({ title: t('cloud.toast.updateSettingsFailed'), variant: 'destructive' }),
      },
    );
  };

  const handleForcePoll = () => {
    if (forcePollMutation.isPending) return;
    forcePollMutation.mutate(undefined, {
      onSuccess: () => toast({ title: t('cloud.polling') }),
      onError: (err) =>
        toast({
          title: t('cloud.toast.pollFailed'),
          description: getLocalizedErrorMessage(err, t),
          variant: 'destructive',
        }),
    });
  };

  const handleSyncLocal = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (acc: CloudAccount | null) => {
        if (acc) {
          toast({
            title: t('cloud.toast.syncSuccess.title'),
            description: t('cloud.toast.syncSuccess.description', { email: acc.email }),
          });
        } else {
          toast({
            title: t('cloud.toast.syncFailed.title'),
            description: t('cloud.toast.syncFailed.description'),
            variant: 'destructive',
          });
        }
      },
      onError: (err) => {
        toast({
          title: t('cloud.toast.syncFailed.title'),
          description: getLocalizedErrorMessage(err, t),
          variant: 'destructive',
        });
      },
    });
  };

  const openAuthUrl = async () => {
    try {
      await startAuthFlow();
    } catch (e) {
      toast({
        title: t('cloud.toast.startAuthFailed'), // Need to add this key or just use generic error
        description: String(e),
        variant: 'destructive',
      });
    }
  };

  // Batch Selection Handlers
  const toggleSelection = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.size === accounts?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(accounts?.map((a) => a.id) || []));
    }
  };

  const handleBatchRefresh = () => {
    selectedIds.forEach((id) => {
      refreshMutation.mutate({ accountId: id });
    });
    toast({
      title: t('cloud.toast.quotaRefreshed'),
      description: `triggered for ${selectedIds.size} accounts.`,
    });
    setSelectedIds(new Set());
  };

  const handleBatchDelete = () => {
    if (confirm(t('cloud.batch.confirmDelete', { count: selectedIds.size }))) {
      selectedIds.forEach((id) => {
        deleteMutation.mutate({ accountId: id });
      });
      toast({
        title: t('cloud.toast.deleted'),
        description: `${selectedIds.size} accounts deleted.`,
      });
      setSelectedIds(new Set());
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="col-span-full rounded-lg border border-dashed p-8 text-center"
        data-testid="cloud-load-error-fallback"
      >
        <Cloud className="text-muted-foreground mx-auto mb-3 h-10 w-10 opacity-40" />
        <div className="text-sm font-medium">{t('cloud.error.loadFailed')}</div>
        <div className="text-muted-foreground mt-2 text-xs">{t('action.retry')}</div>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => void refetch()}
          data-testid="cloud-load-error-retry"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('action.retry')}
        </Button>
      </div>
    );
  }

  // Filter accounts by search query and selected category
  const filteredAccounts = (accounts || []).filter((account) => {
    const matchesSearch =
      !searchQuery ||
      account.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.label?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategoryFilter || account.category_id === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-5 pb-20">
      <div className="bg-card rounded-lg border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex shrink-0 flex-col gap-1">
            <h2 className="text-2xl font-bold tracking-tight">{t('cloud.title')}</h2>
            <p className="text-muted-foreground max-w-2xl">{t('cloud.description')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="bg-muted/50 rounded-md border px-3 py-2">
              <div className="text-muted-foreground text-[11px] uppercase">
                {t('cloud.card.actions')}
              </div>
              <div className="text-base font-semibold">{totalAccounts}</div>
            </div>
            <div className="bg-muted/50 rounded-md border px-3 py-2">
              <div className="text-muted-foreground text-[11px] uppercase">
                {t('cloud.card.active')}
              </div>
              <div className="text-base font-semibold text-emerald-600">{activeAccounts}</div>
            </div>
            <div className="bg-muted/50 rounded-md border px-3 py-2">
              <div className="text-muted-foreground text-[11px] uppercase">
                {t('cloud.card.rateLimited')}
              </div>
              <div className="text-base font-semibold text-rose-600">{rateLimitedAccounts}</div>
            </div>
            {/* Global Quota */}
            {globalQuota !== null && (
              <div className="bg-muted/50 rounded-md border px-3 py-2">
                <div className="text-muted-foreground text-[11px] uppercase">
                  {t('cloud.globalQuota')}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-base font-semibold ${getGlobalQuotaTextColor(globalQuota)}`}
                  >
                    {globalQuota}%
                  </span>
                  <div className="bg-muted h-2 w-20 overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getGlobalQuotaColor(globalQuota)}`}
                      style={{ width: `${Math.max(0, Math.min(100, globalQuota))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <TooltipProvider delayDuration={0}>
        <div className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-muted/20 flex items-center gap-3 rounded-md border px-3 py-1.5 transition-colors hover:bg-muted/40">
              <div className="flex items-center gap-2">
                <Zap
                  className={`h-4 w-4 ${autoSwitchEnabled ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`}
                />
                <Label htmlFor="auto-switch" className="cursor-pointer text-sm font-medium">
                  {t('cloud.autoSwitch')}
                </Label>
              </div>
              <Switch
                id="auto-switch"
                checked={!!autoSwitchEnabled}
                onCheckedChange={handleToggleAutoSwitch}
                disabled={isSettingsLoading || setAutoSwitchMutation.isPending}
                className="data-[state=checked]:bg-yellow-500"
              />
            </div>

            <div className="flex items-center gap-1 rounded-md border bg-muted/10 p-1 shadow-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSelectAll}
                    className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <CheckSquare
                      className={`h-4 w-4 ${selectedIds.size > 0 && selectedIds.size === accounts?.length ? 'text-primary fill-primary/20' : ''}`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('cloud.batch.selectAll')}</TooltipContent>
              </Tooltip>

              <div className="mx-0.5 h-4 w-[1px] bg-border/50" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleForcePoll}
                    disabled={forcePollMutation.isPending}
                    className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCcw className={`h-4 w-4 ${forcePollMutation.isPending ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('cloud.checkQuota')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSyncLocal}
                    disabled={syncMutation.isPending}
                    className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <Download className={`h-4 w-4 ${syncMutation.isPending ? 'animate-bounce' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('cloud.syncFromIDE')}</TooltipContent>
              </Tooltip>

              <div className="mx-0.5 h-4 w-[1px] bg-border/50" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsImportDialogOpen(true)}
                    className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('cloud.import.button')}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 flex-1">
            <Button className="cursor-pointer gap-2 h-9" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('cloud.addAccount')}</span>
            </Button>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t('cloud.authDialog.title')}</DialogTitle>
              <DialogDescription>{t('cloud.authDialog.description')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Button variant="outline" className="col-span-4" onClick={openAuthUrl}>
                  <Cloud className="mr-2 h-4 w-4" />
                  {t('cloud.authDialog.openLogin')}
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">{t('cloud.authDialog.authCode')}</Label>
                <Input
                  id="code"
                  placeholder={t('cloud.authDialog.placeholder')}
                  value={authCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthCode(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">{t('cloud.authDialog.instruction')}</p>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => handleAddAccount()}
                disabled={addMutation.isPending || !authCode}
              >
                {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('cloud.authDialog.verify')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Export Dialog — opened programmatically from batch bar */}
        <Dialog
          open={isExportDialogOpen}
          onOpenChange={(open) => {
            setIsExportDialogOpen(open);
            if (!open) setExportPassword('');
          }}
        >
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{t('cloud.export.dialogTitle')}</DialogTitle>
              <DialogDescription>{t('cloud.export.dialogDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Scope info */}
              <div className="bg-muted/40 rounded-md border px-3 py-2 text-sm">
                {selectedIds.size > 0
                  ? t('cloud.export.selectInfo', { count: selectedIds.size })
                  : t('cloud.export.selectAll', { count: accounts?.length ?? 0 })}
              </div>
              {/* Security warning */}
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                {t('cloud.export.warning')}
              </div>
              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="export-password" className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  {t('cloud.export.passwordLabel')}
                </Label>
                <Input
                  id="export-password"
                  type="password"
                  placeholder={t('cloud.export.passwordPlaceholder')}
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">{t('cloud.export.passwordHint')}</p>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleExport}
                disabled={exportMutation.isPending}
              >
                {exportMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Upload className="mr-2 h-4 w-4" />
                {t('cloud.export.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog
          open={isImportDialogOpen}
          onOpenChange={(open) => {
            setIsImportDialogOpen(open);
            if (!open) {
              setImportFile(null);
              setImportPassword('');
            }
          }}
        >
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{t('cloud.import.dialogTitle')}</DialogTitle>
              <DialogDescription>{t('cloud.import.dialogDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* File picker */}
              <div className="space-y-1.5">
                <Label htmlFor="import-file">{t('cloud.import.selectFile')}</Label>
                <div className="flex items-center gap-2">
                  <Button
                    id="import-file"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => importFileInputRef.current?.click()}
                    type="button"
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    {t('cloud.import.selectFile')}
                  </Button>
                  {importFile && (
                    <span className="text-muted-foreground max-w-[200px] truncate text-xs">
                      {t('cloud.import.fileSelected', { name: importFile.name })}
                    </span>
                  )}
                </div>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="import-password" className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  {t('cloud.import.passwordLabel')}
                </Label>
                <Input
                  id="import-password"
                  type="password"
                  placeholder={t('cloud.import.passwordPlaceholder')}
                  value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending || !importFile}
              >
                {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <FolderOpen className="mr-2 h-4 w-4" />
                {t('cloud.import.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

            <div className="hidden h-6 w-[1px] bg-border sm:block"></div>
            {/* Layout Selector */}
            <div className="hidden items-center gap-1 rounded-md border bg-muted/10 p-1 shadow-sm sm:flex">
              <Tooltip>
                <TooltipTrigger asChild>
                <Button
                  variant={gridLayout === 'auto' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7 cursor-pointer"
                  onClick={() => setGridLayout('auto')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('cloud.layout.auto')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={gridLayout === '2-col' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7 cursor-pointer"
                  onClick={() => setGridLayout('2-col')}
                >
                  <Columns2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('cloud.layout.twoCol')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={gridLayout === '3-col' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7 cursor-pointer"
                  onClick={() => setGridLayout('3-col')}
                >
                  <Columns3 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('cloud.layout.threeCol')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={gridLayout === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7 cursor-pointer"
                  onClick={() => setGridLayout('list')}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('cloud.layout.list')}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </TooltipProvider>

      {/* Search & Category Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1" style={{ minWidth: '200px' }}>
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            id="account-search"
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-full rounded-md border py-1 pr-3 pl-9 text-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="text-muted-foreground text-sm font-medium px-2">
          {filteredAccounts.length} {filteredAccounts.length === 1 ? 'account' : 'accounts'} {searchQuery || selectedCategoryFilter ? 'found' : 'total'}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Filter className="h-3 w-3" />
            </span>
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter(null)}
              className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedCategoryFilter === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setSelectedCategoryFilter(selectedCategoryFilter === cat.id ? null : cat.id)
                }
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor:
                    selectedCategoryFilter === cat.id ? `${cat.color}30` : `${cat.color}15`,
                  color: cat.color,
                  outline: selectedCategoryFilter === cat.id ? `2px solid ${cat.color}` : 'none',
                  outlineOffset: '1px',
                }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={GRID_LAYOUT_CLASSES[gridLayout]}>
        {filteredAccounts.map((account) => (
          <CloudAccountCard
            key={account.id}
            account={account}
            categories={categories}
            onRefresh={handleRefresh}
            onDelete={handleDelete}
            onSwitch={handleSwitch}
            onManageIdentity={handleManageIdentity}
            onEditLabel={handleEditLabel}
            onAssignCategory={handleAssignCategory}
            isSelected={selectedIds.has(account.id)}
            onToggleSelection={toggleSelection}
            isRefreshing={
              refreshMutation.isPending && refreshMutation.variables?.accountId === account.id
            }
            isDeleting={
              deleteMutation.isPending && deleteMutation.variables?.accountId === account.id
            }
            isSwitching={
              switchMutation.isPending && switchMutation.variables?.accountId === account.id
            }
          />
        ))}

        {filteredAccounts.length === 0 && (
          <div className="text-muted-foreground bg-muted/20 col-span-full rounded-lg border border-dashed py-14 text-center">
            <Cloud className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <div className="text-sm">
              {accounts?.length === 0
                ? t('cloud.list.noAccounts')
                : 'No accounts match the current filter.'}
            </div>
          </div>
        )}
      </div>

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-card animate-in fade-in slide-in-from-bottom-4 fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border px-6 py-2 shadow-lg">
          <div className="flex items-center gap-2 border-r pr-4">
            <span className="text-sm font-semibold">
              {t('cloud.batch.selected', { count: selectedIds.size })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleBatchRefresh}>
              <RefreshCw className="mr-2 h-3 w-3" />
              {t('cloud.batch.refresh')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportDialogOpen(true)}
              title={t('cloud.export.button')}
            >
              <Upload className="mr-2 h-3 w-3" />
              {t('cloud.export.button')} ({selectedIds.size})
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
              <Trash2 className="mr-2 h-3 w-3" />
              {t('cloud.batch.delete')}
            </Button>
          </div>
        </div>
      )}

      <IdentityProfileDialog
        account={identityAccount}
        open={Boolean(identityAccount)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setIdentityAccount(null);
          }
        }}
      />
    </div>
  );
}
