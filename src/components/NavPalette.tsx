import * as React from 'react';
import { MenuItem } from '@blueprintjs/core';
import { Omnibar, ItemRenderer, ItemListPredicate } from '@blueprintjs/select';
import { openPage } from '~/lib/roam';
import { useRoamPages } from '~/hooks/useRoamPages';

const PageOmnibar = Omnibar.ofType<RoamPage>();

const renderPage: ItemRenderer<RoamPage> = (page, { handleClick, modifiers }) => {
  if (!modifiers.matchesPredicate) return null;
  return (
    <MenuItem
      key={page.uid}
      text={page.title}
      onClick={handleClick}
      active={modifiers.active}
    />
  );
};

const filterPages: ItemListPredicate<RoamPage> = (query, pages) => {
  if (!query) return pages.slice(0, 50);
  const q = query.toLowerCase();
  const starts: RoamPage[] = [];
  const contains: RoamPage[] = [];
  for (const page of pages) {
    const t = page.title.toLowerCase();
    if (t.startsWith(q)) starts.push(page);
    else if (t.includes(q)) contains.push(page);
    if (starts.length + contains.length >= 50) break;
  }
  return [...starts, ...contains];
};

interface NavPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NavPalette({ isOpen, onClose }: NavPaletteProps) {
  const { pages, load } = useRoamPages();

  React.useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const handleSelect = React.useCallback(
    (page: RoamPage) => {
      openPage(page.title);
      onClose();
    },
    [onClose],
  );

  return (
    <PageOmnibar
      isOpen={isOpen}
      items={pages}
      itemRenderer={renderPage}
      itemListPredicate={filterPages}
      onItemSelect={handleSelect}
      onClose={onClose}
      noResults={<MenuItem disabled text="No pages found" />}
      resetOnSelect
    />
  );
}
