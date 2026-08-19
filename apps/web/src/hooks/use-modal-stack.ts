'use client';

import { useEffect, type RefObject } from 'react';

function dialogForLayer(layer: HTMLElement) {
  if (layer.matches('[role="dialog"]')) return layer;
  return layer.querySelector<HTMLElement>('[role="dialog"]');
}

export function useModalIsolation(mounted: boolean, layerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!mounted || !layerRef.current) return;
    const currentLayer = layerRef.current;
    const previousLayers = Array.from(document.querySelectorAll<HTMLElement>('[data-modal-layer][data-state="open"]'))
      .filter((layer) => layer !== currentLayer);
    const snapshots = previousLayers.map(dialogForLayer).filter((dialog): dialog is HTMLElement => Boolean(dialog)).map((dialog) => ({
      dialog,
      ariaHidden: dialog.getAttribute('aria-hidden'),
      inert: dialog.hasAttribute('inert')
    }));

    for (const { dialog } of snapshots) {
      dialog.setAttribute('aria-hidden', 'true');
      dialog.setAttribute('inert', '');
    }

    return () => {
      for (const { dialog, ariaHidden, inert } of snapshots) {
        if (ariaHidden === null) dialog.removeAttribute('aria-hidden');
        else dialog.setAttribute('aria-hidden', ariaHidden);
        if (!inert) dialog.removeAttribute('inert');
      }
    };
  }, [mounted, layerRef]);
}

export function isTopmostModalLayer(layer: HTMLElement | null) {
  if (!layer) return false;
  const layers = Array.from(document.querySelectorAll<HTMLElement>('[data-modal-layer][data-state="open"]'));
  return layers[layers.length - 1] === layer;
}
