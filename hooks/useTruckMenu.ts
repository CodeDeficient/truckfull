import { useEffect, useRef, useState, useCallback } from 'react';
import type { MenuCategory, MenuItem } from '@/lib/types';
import { logError } from '@/lib/logging';
import { shouldReuseTruckMenu } from '@/lib/utils/menuLazyLoad';

export interface TruckMenuData {
  menu: MenuCategory[] | null;
  menu_items: MenuItem[];
}

export async function fetchTruckMenu(truckId: string): Promise<TruckMenuData> {
  const response = await fetch(`/api/trucks/${truckId}/menu`);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return (await response.json()) as TruckMenuData;
}

export function useTruckMenu(truckId: string | undefined) {
  const [menuData, setMenuData] = useState<TruckMenuData | null>(null);
  const [loadedTruckId, setLoadedTruckId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeTruckIdRef = useRef(truckId);

  useEffect(() => {
    activeTruckIdRef.current = truckId;
    setMenuData(null);
    setLoadedTruckId(null);
    setLoading(false);
    setError(null);
  }, [truckId]);

  const loadMenu = useCallback(async () => {
    if (!truckId || shouldReuseTruckMenu(loadedTruckId, truckId, menuData)) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchTruckMenu(truckId);
      if (activeTruckIdRef.current !== truckId) return;

      setMenuData(data);
      setLoadedTruckId(truckId);
    } catch (error_) {
      if (activeTruckIdRef.current !== truckId) return;

      const message = error_ instanceof Error ? error_.message : 'Failed to load menu';
      setError(message);
      logError('useTruckMenu.loadMenu', error_);
    } finally {
      if (activeTruckIdRef.current === truckId) {
        setLoading(false);
      }
    }
  }, [truckId, loadedTruckId, menuData]);

  return { menuData, loadedTruckId, loading, error, loadMenu };
}
