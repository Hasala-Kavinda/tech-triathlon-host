import L from 'leaflet';
import { Outlet } from '../state/routeContext';

/**
 * Builds custom 32px L.divIcon with a 44px touch hit area:
 * - pending: surface fill, 2px ring in secondary text color, number in primary text
 * - in progress: accent fill, white number
 * - completed: emerald fill (#00C46A) with a white check instead of the number
 * - selected: scale 1.15 plus a 3px ring of the accent at 30% opacity.
 */
export function createOutletDivIcon(outlet: Outlet, isSelected: boolean): L.DivIcon {
  const isCompleted = outlet.status === 'completed';
  const isInProgress = outlet.status === 'in_progress';
  const number = outlet.visitOrder ?? '';

  let circleStyles = '';
  let content = '';

  if (isCompleted) {
    circleStyles = 'background-color: var(--success); color: #ffffff;';
    content = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    `;
  } else if (isInProgress) {
    circleStyles = 'background-color: var(--action); color: var(--action-text);';
    content = `<span style="font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; font-size: 14px; font-weight: 700;">${number}</span>`;
  } else {
    circleStyles = 'background-color: var(--surface); color: var(--text-primary); border: 2px solid var(--text-secondary);';
    content = `<span style="font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; font-size: 14px; font-weight: 700;">${number}</span>`;
  }

  const selectedRing = isSelected
    ? 'transform: scale(1.15); box-shadow: 0 0 0 3px var(--action-ring);'
    : '';

  const ariaLabel = `Outlet ${outlet.visitOrder || ''}, ${outlet.city}, ${outlet.status}`;

  const html = `
    <div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;" aria-label="${ariaLabel}">
      <div style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: transform 150ms ease-out; ${circleStyles} ${selectedRing}">
        ${content}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-outlet-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
}

/**
 * Marker stacking order: selected on top, then in progress, then pending, then completed.
 */
export function getOutletZIndex(outlet: Outlet, isSelected: boolean): number {
  if (isSelected) return 1000;
  if (outlet.status === 'in_progress') return 800;
  if (outlet.status === 'pending') return 600;
  return 400; // completed
}
