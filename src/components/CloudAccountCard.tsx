import { CloudAccount } from '@/types/cloudAccount';
import { type Category } from '@/types/category';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';

import { MoreVertical, Trash, RefreshCw, Box, Power, Fingerprint, Tag, AlertTriangle, FolderOpen, X } from 'lucide-react';
import { formatDistanceToNow, differenceInMinutes, differenceInHours, isBefore } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useProviderGrouping } from '@/hooks/useProviderGrouping';
import { ProviderGroup } from '@/components/ProviderGroup';
import { detectGooglePlanTier } from '@/utils/googlePlanDetector';

interface ModelQuotaInfo {
  percentage: number;
  resetTime: string;
}
interface CloudAccountCardProps {
  account: CloudAccount;
  onRefresh: (id: string) => void;
  onDelete: (id: string) => void;
  onSwitch: (id: string) => void;
  onManageIdentity: (id: string) => void;
  onEditLabel: (id: string, label: string) => void;
  onAssignCategory?: (accountId: string, categoryId: string | null) => void;
  categories?: Category[];
  isSelected?: boolean;
  onToggleSelection?: (id: string, selected: boolean) => void;
  isRefreshing?: boolean;
  isDeleting?: boolean;
  isSwitching?: boolean;
}

export function CloudAccountCard({
  account,
  onRefresh,
  onDelete,
  onSwitch,
  onManageIdentity,
  onEditLabel,
  onAssignCategory,
  categories = [],
  isSelected = false,
  onToggleSelection,
  isRefreshing,
  isDeleting,
  isSwitching,
}: CloudAccountCardProps) {
  const { t } = useTranslation();
  const [isEditLabelOpen, setIsEditLabelOpen] = useState(false);
  const [editLabelValue, setEditLabelValue] = useState('');
  const { config } = useAppConfig();
  const {
    enabled: providerGroupingsEnabled,
    getAccountStats,
    isProviderCollapsed,
    toggleProviderCollapse,
  } = useProviderGrouping();

  // Detect Google subscription plan from quota data
  const planInfo = account.provider === 'google'
    ? detectGooglePlanTier(account.quota?.subscription_tier)
    : null;

  // Helpers to get quota color
  const getQuotaColor = (percentage: number) => {
    if (percentage > 80) return 'text-green-500';
    if (percentage > 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getQuotaBarColor = (percentage: number) => {
    if (percentage > 80) return 'bg-emerald-500';
    if (percentage > 20) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getQuotaLabel = (percentage: number) => {
    if (percentage === 0) {
      return t('cloud.card.rateLimitedQuota');
    }
    return `${percentage}%`;
  };

  const formatTimeRemaining = (dateStr: string) => {
    const targetDate = new Date(dateStr);
    if (Number.isNaN(targetDate.getTime())) return null;

    const now = new Date();
    if (isBefore(targetDate, now)) return '0h 0m';

    const diffHrs = Math.max(0, differenceInHours(targetDate, now));
    const diffMins = Math.max(0, differenceInMinutes(targetDate, now) - diffHrs * 60);
    if (diffHrs >= 24) {
      const diffDays = Math.floor(diffHrs / 24);
      const remainingHrs = diffHrs % 24;
      return `${diffDays}d ${remainingHrs}h`;
    }
    return `${diffHrs}h ${diffMins}m`;
  };

  const getResetTimeLabel = (resetTime?: string) => {
    if (!resetTime) return t('cloud.card.resetUnknown');
    const remaining = formatTimeRemaining(resetTime);
    if (!remaining) return t('cloud.card.resetUnknown');
    return `${t('cloud.card.resetPrefix')}: ${remaining}`;
  };

  const getResetTimeTitle = (resetTime?: string) => {
    if (!resetTime) return undefined;
    const resetDate = new Date(resetTime);
    if (Number.isNaN(resetDate.getTime())) return undefined;
    return `${t('cloud.card.resetTime')}: ${resetDate.toLocaleString()}`;
  };

  // --- Logic for model groups ---
  const rawModels = Object.entries(account.quota?.models || {}).filter(
    ([modelName]) => config?.model_visibility?.[modelName] !== false,
  );

  // Group Gemini 3 Pro Low/High if both exist
  const processedModels: Record<string, ModelQuotaInfo> = {};
  const hasLow = rawModels.some(([name]) => name.includes('gemini-3-pro-low'));
  const hasHigh = rawModels.some(([name]) => name.includes('gemini-3-pro-high'));

  for (const [name, info] of rawModels) {
    if (name.includes('gemini-3-pro-low') && hasHigh) continue;
    if (name.includes('gemini-3-pro-high') && hasLow) {
      // Use the lower percentage if both exist, to be safe
      const lowInfo = rawModels.find(([n]) => n.includes('gemini-3-pro-low'))?.[1];
      const mergedPercentage = lowInfo
        ? Math.min(info.percentage, lowInfo.percentage)
        : info.percentage;
      processedModels['gemini-3-pro-low/high'] = { ...info, percentage: mergedPercentage };
      continue;
    }
    processedModels[name] = info;
  }

  const geminiModels = Object.entries(processedModels)
    .filter(([name]) => name.includes('gemini') && !/gemini-[12](\.|$|-)/i.test(name))
    .sort((a, b) => b[1].percentage - a[1].percentage);

  const claudeModels = Object.entries(processedModels)
    .filter(([name]) => name.includes('claude'))
    .sort((a, b) => b[1].percentage - a[1].percentage);

  const hasHighTier = geminiModels.some(
    ([name, info]) => name.includes('gemini-3-pro') && info.percentage > 50,
  );
  const hasRenderableModels = geminiModels.length > 0 || claudeModels.length > 0;

  const formatModelName = (name: string) => {
    return name
      .replace('models/', '')
      .replace('gemini-3-pro-low/high', 'Gemini 3 Pro (Low/High)')
      .replace('gemini-3-pro-preview', 'Gemini 3 Pro Preview')
      .replace('gemini-3-pro-image', 'Gemini 3 Pro Image')
      .replace('gemini-3-pro', 'Gemini 3 Pro')
      .replace('gemini-3-flash', 'Gemini 3 Flash')
      .replace('claude-sonnet-4-5-thinking', 'Claude 4.5 Sonnet (Thinking)')
      .replace('claude-sonnet-4-5', 'Claude 4.5 Sonnet')
      .replace('claude-opus-4-6-thinking', 'Claude 4.6 Opus (Thinking)')
      .replace('claude-opus-4-5-thinking', 'Claude 4.5 Opus (Thinking)')
      .replace('claude-3-5-sonnet', 'Claude 3.5 Sonnet')
      .replace(/-/g, ' ')
      .split(' ')
      .map((word) => (word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
      .join(' ');
  };

  const renderModelGroup = (models: [string, ModelQuotaInfo][]) => {
    if (models.length === 0) return null;
    return (
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {models.map(([modelName, info]) => (
          <div
            key={modelName}
            className="group/item flex flex-col gap-1 transition-all"
          >
            <span
              className="text-muted-foreground group-hover/item:text-foreground w-full truncate text-[11px] font-semibold"
              title={modelName}
            >
              {formatModelName(modelName)}
            </span>
            <div className="relative h-5 w-full overflow-hidden rounded bg-muted/40">
              <div
                className={`absolute left-0 top-0 h-full transition-all duration-300 ${getQuotaBarColor(info.percentage)} opacity-25`}
                style={{ width: `${Math.max(0, Math.min(100, info.percentage))}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-1.5">
                <span className={`font-mono text-[10px] font-bold ${getQuotaColor(info.percentage)}`}>
                  {info.percentage}%
                </span>
                <span
                  className="text-foreground/70 text-[9px] font-medium"
                  title={getResetTimeTitle(info.resetTime)}
                >
                  {getResetTimeLabel(info.resetTime)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Accounts with irrecoverable token decryption failures are shown in a locked state
    if (account.status === 'decryption_error') {
    return (
      <Card className="bg-background/90 dark:bg-card/80 transform-gpu will-change-transform border border-amber-500/40 flex h-full flex-col overflow-hidden opacity-80">
        <CardHeader className="relative flex flex-row items-center gap-4 space-y-0 pb-2">
          {account.avatar_url ? (
            <img
              src={account.avatar_url}
              alt={account.name || ''}
              className="bg-muted h-10 w-10 rounded-full border opacity-50 grayscale"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded-full border opacity-50">
              {account.name?.[0]?.toUpperCase() || 'A'}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <CardTitle className="text-muted-foreground truncate text-base font-semibold">
              {account.name || t('cloud.card.unknown')}
            </CardTitle>
            <CardDescription className="truncate text-xs">{account.email}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer rounded-full">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('cloud.card.actions')}</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onDelete(account.id)}
                className="text-destructive focus:text-destructive"
                disabled={isDeleting}
              >
                <Trash className="mr-2 h-4 w-4" />
                {t('cloud.card.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="flex-1 pb-2">
          <div className="flex flex-col items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-center">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                Re-login Required
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                This account's token is encrypted with an old key and can no longer be read.
                Delete this account and add it again to restore access.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(account.id)}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              <Trash className="mr-1 h-3 w-3" />
              {t('cloud.card.delete')}
            </Button>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/20 text-muted-foreground justify-between border-t p-2 px-4 text-xs">
          <span>
            {t('cloud.card.used')}{' '}
            {formatDistanceToNow(account.last_used * 1000, { addSuffix: true })}
          </span>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card
      className={`group bg-background/90 dark:bg-card/80 transform-gpu will-change-transform border flex h-full flex-col overflow-hidden transition-all duration-300 ${
        isSelected
          ? 'ring-primary border-primary/50 ring-2'
          : account.is_active
          ? 'border-green-500 shadow-[0_0_15px_-3px_rgba(34,197,94,0.4)] ring-1 ring-green-500/50 dark:shadow-[0_0_15px_-3px_rgba(34,197,94,0.2)]'
          : 'border-border hover:border-primary/50'
      }`}
    >
      <CardHeader className="relative flex flex-row items-center gap-4 space-y-0 pb-2">
        {onToggleSelection && (
          <div
            className={`absolute top-2 left-2 z-10 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} bg-background/90 rounded-full p-2 transition-opacity`}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onToggleSelection(account.id, checked as boolean)}
              className="h-5 w-5 border-2"
            />
          </div>
        )}

        {account.avatar_url ? (
          <img
            src={account.avatar_url}
            alt={account.name || ''}
            className="bg-muted h-10 w-10 rounded-full border"
          />
        ) : (
          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full border">
            {account.name?.[0]?.toUpperCase() || 'A'}
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <CardTitle className="truncate text-base font-semibold">
              {account.name || t('cloud.card.unknown')}
            </CardTitle>
            {account.label && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary border-primary/20">
                {account.label}
              </Badge>
            )}
            {account.status === 'rate_limited' && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {t('cloud.card.rateLimited')}
              </Badge>
            )}
            {/* Google subscription plan badge — shown only for Pro/Ultra */}
            {planInfo?.tier === 'ultra' && (
              <Badge
                className="h-5 px-1.5 text-[10px] bg-violet-500/15 text-violet-500 border border-violet-500/30 font-semibold shadow-none"
                title={planInfo.displayName ?? 'Google AI Ultra'}
              >
                Ultra
              </Badge>
            )}
            {planInfo?.tier === 'pro' && (
              <Badge
                className="h-5 px-1.5 text-[10px] bg-blue-500/15 text-blue-500 border border-blue-500/30 font-semibold shadow-none"
                title={planInfo.displayName ?? 'Google AI Pro'}
              >
                Pro
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <CardDescription className="truncate text-xs">{account.email}</CardDescription>
            {account.category_id && categories.length > 0 && (() => {
              const cat = categories.find((c) => c.id === account.category_id);
              if (!cat) return null;
              return (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none"
                  style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </span>
              );
            })()}
          </div>
        </div>
        
        <div className="flex items-center">
          {account.is_active ? (
            <Button variant="ghost" size="icon" disabled className="text-green-600 opacity-100 h-8 w-8 rounded-full">
              <Power className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSwitch(account.id)}
              disabled={isSwitching}
              className="cursor-pointer h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              title={t('cloud.card.use')}
            >
              {isSwitching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Power className="h-4 w-4" />
              )}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer rounded-full">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Menu</span>
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('cloud.card.actions')}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onSwitch(account.id)} disabled={isSwitching}>
              <Power className="mr-2 h-4 w-4" />
              {t('cloud.card.useAccount')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onRefresh(account.id)} disabled={isRefreshing}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('cloud.card.refresh')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onManageIdentity(account.id)}>
              <Fingerprint className="mr-2 h-4 w-4" />
              {t('cloud.card.identityProfile')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              setEditLabelValue(account.label || '');
              setIsEditLabelOpen(true);
            }}>
              <Tag className="mr-2 h-4 w-4" />
              Change Label
            </DropdownMenuItem>
            {/* Category sub-menu */}
            {onAssignCategory && (
              <>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Set Category
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {account.category_id && (
                      <>
                        <DropdownMenuItem
                          onClick={() => onAssignCategory(account.id, null)}
                          className="text-muted-foreground"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Remove category
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {categories.length === 0 && (
                      <DropdownMenuItem disabled>
                        <span className="text-muted-foreground text-xs">No categories yet</span>
                      </DropdownMenuItem>
                    )}
                    {categories.map((cat) => (
                      <DropdownMenuItem
                        key={cat.id}
                        onClick={() => onAssignCategory(account.id, cat.id)}
                        className={account.category_id === cat.id ? 'font-semibold' : ''}
                      >
                        <span
                          className="mr-2 inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(account.id)}
              className="text-destructive focus:text-destructive"
              disabled={isDeleting}
            >
              <Trash className="mr-2 h-4 w-4" />
              {t('cloud.card.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-2">
        <div className="space-y-2">
          {providerGroupingsEnabled ? (
            (() => {
              const accountStats = getAccountStats(account);
              if (accountStats.visibleModels === 0) {
                return (
                  <div className="text-muted-foreground flex flex-col items-center justify-center py-4">
                    <Box className="mb-2 h-8 w-8 opacity-20" />
                    <span className="text-xs">{t('cloud.card.noQuota')}</span>
                  </div>
                );
              }
              return (
                <>
                  <div className="bg-muted/40 flex items-center justify-between rounded-lg px-3 py-1.5 text-xs">
                    <span className="font-medium">{t('settings.providerGroupings.overall')}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-bold ${getQuotaColor(accountStats.overallPercentage)}`}
                      >
                        {getQuotaLabel(accountStats.overallPercentage)}
                      </span>
                      <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getQuotaBarColor(accountStats.overallPercentage)}`}
                          style={{
                            width: `${Math.max(0, Math.min(100, accountStats.overallPercentage))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {accountStats.providers.map((providerStats) => (
                    <ProviderGroup
                      key={providerStats.providerKey}
                      stats={providerStats}
                      isCollapsed={isProviderCollapsed(account.id, providerStats.providerKey)}
                      onToggleCollapse={() =>
                        toggleProviderCollapse(account.id, providerStats.providerKey)
                      }
                      getQuotaColor={getQuotaColor}
                      getQuotaBarColor={getQuotaBarColor}
                      getQuotaLabel={getQuotaLabel}
                      getResetTimeLabel={getResetTimeLabel}
                      getResetTimeTitle={getResetTimeTitle}
                      leftLabel={t('cloud.card.left')}
                    />
                  ))}
                </>
              );
            })()
          ) : hasRenderableModels ? (
            <div className="pt-1">
              {renderModelGroup([...geminiModels, ...claudeModels])}
            </div>
          ) : (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-4">
              <Box className="mb-2 h-8 w-8 opacity-20" />
              <span className="text-xs">{t('cloud.card.noQuota')}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="bg-muted/20 text-muted-foreground justify-between border-t p-2 px-4 text-xs">
        <span>
          {t('cloud.card.used')}{' '}
          {formatDistanceToNow(account.last_used * 1000, { addSuffix: true })}
        </span>
      </CardFooter>

      <Dialog open={isEditLabelOpen} onOpenChange={setIsEditLabelOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Account Label</DialogTitle>
            <DialogDescription>
              Set a custom label to easily identify this account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={editLabelValue}
                onChange={(e) => setEditLabelValue(e.target.value)}
                placeholder="e.g. Work, Personal, Main"
                maxLength={30}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                onEditLabel(account.id, editLabelValue);
                setIsEditLabelOpen(false);
              }}
            >
              Save Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
