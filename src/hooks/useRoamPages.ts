import * as React from 'react';
import { getAllPages } from '~/lib/roam';

export function useRoamPages() {
  const [pages, setPages] = React.useState<RoamPage[]>([]);

  const load = React.useCallback(() => {
    setPages(getAllPages());
  }, []);

  return { pages, load };
}
