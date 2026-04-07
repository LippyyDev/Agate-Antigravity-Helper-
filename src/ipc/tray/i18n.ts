export type TrayTexts = {
  current: string;
  quota: string;
  switch_next: string;
  refresh_current: string;
  show_window: string;
  quit: string;
  no_account: string;
  unknown_quota: string;
  forbidden: string;
};

const en: TrayTexts = {
  current: 'Current',
  quota: 'Quota',
  switch_next: 'Switch to Next Account',
  refresh_current: 'Refresh Current Quota',
  show_window: 'Show Main Window',
  quit: 'Quit Application',
  no_account: 'No Account',
  unknown_quota: 'Unknown',
  forbidden: 'Account Forbidden',
};

const zh: TrayTexts = {
  current: '当前账号',
  quota: '当前额度',
  switch_next: '切换下一个账号',
  refresh_current: '刷新当前额度',
  show_window: '显示主窗口',
  quit: '退出程序',
  no_account: '无账号',
  unknown_quota: '未知',
  forbidden: '账号无权限',
};

export function getTrayTexts(lang: string = 'en'): TrayTexts {
  if (lang.startsWith('zh')) {
    return zh;
  }
  return en;
}
