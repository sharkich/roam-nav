const ALL_PAGES_QUERY =
  '[:find ?title ?uid :where [?p :node/title ?title] [?p :block/uid ?uid]]';

export function getAllPages(): RoamPage[] {
  const rows = window.roamAlphaAPI.data.fast.q(ALL_PAGES_QUERY) as [string, string][];
  return rows.map(([title, uid]) => ({ title, uid }));
}

export function openPage(title: string): void {
  window.roamAlphaAPI.ui.mainWindow.openPage({ title });
}
