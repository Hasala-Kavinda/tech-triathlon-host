import React from 'react';

export type NavTab = 'route' | 'map' | 'profile' | 'summary';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  shiftStatus?: 'offline' | 'online';
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, shiftStatus = 'online' }) => {
  const isOnline = shiftStatus === 'online';

  return (
    <nav
      aria-label="Bottom Navigation"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))' }}
      className="fixed bottom-0 left-0 right-0 max-w-[500px] mx-auto w-full z-50 flex justify-around items-center px-margin py-space-xs bg-surface dark:bg-inverse-surface border-t border-outline-variant dark:border-outline shadow-lg"
    >
      {/* Tab 1: Route */}
      <button
        type="button"
        onClick={() => onTabChange('route')}
        aria-label="Route Dashboard"
        aria-current={activeTab === 'route' ? 'page' : undefined}
        className={`flex flex-col items-center justify-center min-h-[48px] w-full transition-all duration-150 active:scale-95 ${
          activeTab === 'route'
            ? 'text-status-in-progress dark:text-inverse-primary font-semibold'
            : 'text-secondary dark:text-secondary-fixed-dim hover:text-on-surface'
        }`}
      >
        <span
          className="material-symbols-outlined text-[24px]"
          style={activeTab === 'route' ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          local_shipping
        </span>
        <span className="text-label-sm font-label-sm mt-0.5">Route</span>
      </button>

      {/* Tab 2: Map */}
      <button
        type="button"
        onClick={() => onTabChange('map')}
        aria-label="Route Map"
        aria-current={activeTab === 'map' ? 'page' : undefined}
        className={`flex flex-col items-center justify-center min-h-[48px] w-full transition-all duration-150 active:scale-95 ${
          activeTab === 'map'
            ? 'text-status-in-progress dark:text-inverse-primary font-semibold'
            : 'text-secondary dark:text-secondary-fixed-dim hover:text-on-surface'
        }`}
      >
        <span
          className="material-symbols-outlined text-[24px]"
          style={activeTab === 'map' ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          map
        </span>
        <span className="text-label-sm font-label-sm mt-0.5">Map</span>
      </button>

      {/* Tab 3: Summary / Profile */}
      <button
        type="button"
        onClick={() => onTabChange('summary')}
        aria-label="Shift Summary and Driver Profile"
        aria-current={activeTab === 'summary' ? 'page' : undefined}
        className={`flex flex-col items-center justify-center min-h-[48px] w-full transition-all duration-150 active:scale-95 ${
          activeTab === 'summary'
            ? 'text-status-in-progress dark:text-inverse-primary font-semibold'
            : 'text-secondary dark:text-secondary-fixed-dim hover:text-on-surface'
        }`}
      >
        <div className="relative flex flex-col items-center">
          <span
            className="material-symbols-outlined text-[24px]"
            style={activeTab === 'summary' ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            person
          </span>
          {isOnline && (
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-status-completed border border-surface"></span>
          )}
        </div>
        <span className="text-label-sm font-label-sm mt-0.5">Summary</span>
      </button>
    </nav>
  );
};
