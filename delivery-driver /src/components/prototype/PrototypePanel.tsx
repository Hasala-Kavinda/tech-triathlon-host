// app/src/components/prototype/PrototypePanel.tsx - Outside review tool for Figma Make preview

import React, { useState } from 'react';
import { useStore, ScreenName, NetworkStatus, GpsStatus, GpsQuality } from '../../state/store';

interface FunctionItem {
  id: string;
  name: string;
  hint: string;
}

const FUNCTION_GROUPS: { group: string; items: FunctionItem[] }[] = [
  {
    group: 'GLOBAL',
    items: [
      { id: 'G01', name: 'Opens on Login Stage A', hint: 'Default on initial load / reload' },
      { id: 'G02', name: '36px Toast for external actions', hint: 'Tap Call, Directions, or Dispatch support' },
      { id: 'G03', name: 'Back chevron follows history', hint: 'Tap Back chevron on any screen' }
    ]
  },
  {
    group: 'LOGIN (Screen 1)',
    items: [
      { id: 'L01', name: 'Phone + 6 code validation', hint: 'Type phone & code (000000 tests error)' },
      { id: 'L02', name: 'Sign-in staggered entrance', hint: 'Tap Sign In button when enabled' },
      { id: 'L03', name: 'GPS pill: Off -> Locating -> On', hint: 'Tap GPS: Off in profile header' },
      { id: 'L04', name: 'Signal row live changes', hint: 'Toggle Network or GPS condition below' },
      { id: 'L05', name: 'Expand route accordion', hint: 'Tap any route header in Today\'s Plan' },
      { id: 'L06', name: 'Select route + swipe nudge', hint: 'Tap Start Route in expanded route list' },
      { id: 'L07', name: 'Clear selected route', hint: 'Tap Selected button to deselect' },
      { id: 'L08', name: 'Other routes disabled guards', hint: 'Active route shows Resume, others disabled' },
      { id: 'L09', name: 'Swipe bar 85% drag completion', hint: 'Drag swipe knob past 85% to start' },
      { id: 'L10', name: 'Long outlet list scroll area', hint: 'Scroll outlets inside expanded accordion' }
    ]
  },
  {
    group: 'ROUTE DASHBOARD (Screen 2)',
    items: [
      { id: 'D01', name: 'Dashboard entrance stagger', hint: 'Open dashboard screen' },
      { id: 'D02', name: 'Open Up Next card', hint: 'Tap Start delivery on Up Next card' },
      { id: 'D03', name: 'Tap outlet row to open', hint: 'Tap any pending outlet in the list' },
      { id: 'D04', name: 'Map › shortcut button', hint: 'Tap Map › next to Route title' },
      { id: 'D05', name: 'Back visible only while pending', hint: 'Back visible when all pending; hidden after start' },
      { id: 'D06', name: 'Progress bar & row cross-fade', hint: 'Return to dashboard after completing a stop' },
      { id: 'D07', name: 'Finish swipe bar when complete', hint: 'Complete all stops or swipe finish' },
      { id: 'D08', name: 'Signal row on weak/offline', hint: 'Switch Network condition to weak/offline' }
    ]
  },
  {
    group: 'MARKET DETAIL (Screen 3)',
    items: [
      { id: 'M01', name: 'Toggle product checklist item', hint: 'Tap any item to check/uncheck' },
      { id: 'M02', name: 'Progress bar & item countdown', hint: 'Check off items to see countdown update' },
      { id: 'M03', name: 'Unpacking Complete ring pulse', hint: 'Check all 7 items to activate button' },
      { id: 'M04', name: 'Unchecking re-disables button', hint: 'Uncheck an item after all checked' },
      { id: 'M05', name: 'Call manager toast', hint: 'Tap Call next to Nuwan Perera' },
      { id: 'M06', name: 'Back returns keeping progress', hint: 'Tap Back chevron to return to source' },
      { id: 'M07', name: 'Proceed to PIN screen', hint: 'Tap Unpacking Complete button' },
      { id: 'M08', name: 'Hairline on list scroll', hint: 'Scroll the checklist container' },
      { id: 'M09', name: 'Signal row helper display', hint: 'Set Network to weak/offline in panel' }
    ]
  },
  {
    group: 'PIN (Screen 4)',
    items: [
      { id: 'P01', name: 'Keypad digit entry & scale', hint: 'Tap numeric keys on keypad' },
      { id: 'P02', name: '4th digit auto-submits', hint: 'Enter 4 digits to auto-verify' },
      { id: 'P03', name: 'Wrong PIN shake & countdown', hint: 'Enter any wrong code (e.g. 1111)' },
      { id: 'P04', name: 'Locked state after 3 attempts', hint: 'Enter wrong PIN 3 times' },
      { id: 'P05', name: 'PIN 4821 success mark', hint: 'Enter 4821 to verify delivery' },
      { id: 'P06', name: 'Panel-driven states (Reject/Expire/Offline)', hint: 'Use simulated store manager buttons below' },
      { id: 'P07', name: 'Approval line cross-fade', hint: 'Tap Manager approves in panel' },
      { id: 'P08', name: 'Back discards entered digits', hint: 'Tap Back chevron from PIN screen' }
    ]
  },
  {
    group: 'MAP (Screen 5)',
    items: [
      { id: 'N01', name: 'Entrance line & pins pop-in', hint: 'Open Map Navigation screen' },
      { id: 'N02', name: 'Tap pin selects outlet card', hint: 'Tap any stop pin on the schematic map' },
      { id: 'N03', name: 'Tap empty map resets selection', hint: 'Tap empty canvas background' },
      { id: 'N04', name: 'Directions toast trigger', hint: 'Tap Directions button on bottom card' },
      { id: 'N05', name: 'Open/Resume pushes detail', hint: 'Tap Open/Resume button on bottom card' },
      { id: 'N06', name: 'You\'ve arrived dock state', hint: 'Toggle Driver near next outlet below' },
      { id: 'N07', name: 'Turn on GPS helper line', hint: 'Set GPS to Off and tap Turn on in map' },
      { id: 'N08', name: 'Completed outlet card view', hint: 'Select a green completed stop pin' },
      { id: 'N09', name: 'Map finish swipe bar', hint: 'Finish all stops and swipe finish bar' },
      { id: 'N10', name: 'Signal indicator inside card', hint: 'Set Network to weak/offline below' }
    ]
  },
  {
    group: 'SHIFT SUMMARY (Screen 6)',
    items: [
      { id: 'S01', name: 'Entrance animated check & count', hint: 'Open Shift Summary screen' },
      { id: 'S02', name: 'Show all 14 outlets accordion', hint: 'Tap Show all 14 outlets button' },
      { id: 'S03', name: 'Sync now queue flushing', hint: 'Tap Sync now when offline deliveries waiting' },
      { id: 'S04', name: 'Back to Today\'s Plan', hint: 'Tap Back to Today\'s Plan button' },
      { id: 'S05', name: 'End Shift slide-up sheet', hint: 'Tap End Shift, then cancel or confirm' },
      { id: 'S06', name: 'Last route single action', hint: 'Switch to Route 3 to see single action' }
    ]
  }
];

export const PrototypePanel: React.FC = () => {
  const {
    currentScreen,
    jumpToScreen,
    conditions,
    updateCondition,
    managerApprove,
    managerReject,
    issueNewPin,
    expirePin,
    trackedFunctions,
    resetTicks,
    resetDemo
  } = useStore();

  const [activeTab, setActiveTab] = useState<'controls' | 'functions'>('controls');

  const allItems = FUNCTION_GROUPS.flatMap((g) => g.items);
  const totalCount = allItems.length;
  const completedCount = allItems.filter((item) => trackedFunctions[item.id]).length;

  return (
    <aside
      aria-label="Prototype Control Panel"
      className="hidden lg:flex flex-col w-[360px] h-[844px] bg-surface rounded-[24px] border border-hairline shadow-2xl p-4 select-none overflow-hidden text-black dark:text-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-hairline">
        <div>
          <h2 className="text-[16px] font-bold tracking-tight">Prototype Panel</h2>
          <p className="text-[12px] text-secondary">Figma Make Review Tools</p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={resetDemo}
            className="px-2.5 py-1 rounded-lg border border-hairline bg-surface text-[12px] font-medium text-secondary hover:text-black dark:hover:text-white active:scale-95 transition-all cursor-pointer"
          >
            Reset Demo
          </button>
          <button
            type="button"
            onClick={resetTicks}
            className="px-2.5 py-1 rounded-lg border border-hairline bg-surface text-[12px] font-medium text-secondary hover:text-black dark:hover:text-white active:scale-95 transition-all cursor-pointer"
          >
            Reset Ticks
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-bg p-1 mt-3 border border-hairline text-[13px] font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('controls')}
          className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
            activeTab === 'controls' ? 'bg-surface shadow-sm font-semibold' : 'text-secondary hover:text-black'
          }`}
        >
          Controls & Simulation
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('functions')}
          className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
            activeTab === 'functions' ? 'bg-surface shadow-sm font-semibold' : 'text-secondary hover:text-black'
          }`}
        >
          Functions ({completedCount}/{totalCount})
        </button>
      </div>

      {/* Scrollable Tab Content */}
      <div className="flex-1 overflow-y-auto pt-3 space-y-4 pr-1 text-[13px]">
        {activeTab === 'controls' ? (
          <>
            {/* Section 1: Jump to Screen */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                1. Jump to Screen
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'login', label: '1. Login' },
                  { id: 'dashboard', label: '2. Route' },
                  { id: 'market_detail', label: '3. Detail' },
                  { id: 'pin_confirmation', label: '4. PIN' },
                  { id: 'map', label: '5. Map' },
                  { id: 'shift_summary', label: '6. Summary' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => jumpToScreen(s.id as ScreenName)}
                    className={`py-1.5 px-2 rounded-xl text-[12px] font-medium border text-center transition-all cursor-pointer ${
                      currentScreen === s.id
                        ? 'bg-action text-white border-action shadow-sm'
                        : 'bg-surface border-hairline hover:bg-hairline/30'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Mock Conditions */}
            <div className="space-y-2 pt-1 border-t border-hairline">
              <label className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                2. Conditions Simulation
              </label>

              {/* Network */}
              <div className="space-y-1">
                <span className="text-[12px] text-secondary">Network Status:</span>
                <div className="grid grid-cols-4 gap-1">
                  {(['good', 'fair', 'weak', 'offline'] as NetworkStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => updateCondition('networkStatus', st)}
                      className={`py-1 rounded-lg text-[11px] font-medium border capitalize transition-all cursor-pointer ${
                        conditions.networkStatus === st
                          ? 'bg-action text-white border-action'
                          : 'bg-surface border-hairline text-secondary hover:text-black'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* GPS Status */}
              <div className="space-y-1">
                <span className="text-[12px] text-secondary">GPS Fix:</span>
                <div className="grid grid-cols-5 gap-1">
                  {(['on', 'off', 'requesting', 'blocked', 'unavailable'] as GpsStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => updateCondition('gpsStatus', st)}
                      className={`py-1 rounded-lg text-[10px] font-medium border capitalize transition-all cursor-pointer ${
                        conditions.gpsStatus === st
                          ? 'bg-action text-white border-action'
                          : 'bg-surface border-hairline text-secondary hover:text-black'
                      }`}
                    >
                      {st === 'requesting' ? 'Req' : st === 'unavailable' ? 'N/A' : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Driver Near Next Outlet */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[12px] text-secondary">Driver near next outlet:</span>
                <button
                  type="button"
                  onClick={() => updateCondition('driverNearNextOutlet', !conditions.driverNearNextOutlet)}
                  className={`px-3 py-1 rounded-full text-[12px] font-semibold border transition-all cursor-pointer ${
                    conditions.driverNearNextOutlet
                      ? 'bg-success/20 text-success border-success'
                      : 'bg-surface border-hairline text-secondary'
                  }`}
                >
                  {conditions.driverNearNextOutlet ? 'Yes (At Dock)' : 'No (In Transit)'}
                </button>
              </div>
            </div>

            {/* Section 3: Simulated Store Manager */}
            <div className="space-y-2 pt-1 border-t border-hairline">
              <label className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                3. Simulated Store Manager (PIN)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => managerApprove()}
                  className="py-1.5 px-2 rounded-xl bg-success/15 border border-success/40 text-success text-[12px] font-semibold hover:bg-success/25 transition-all cursor-pointer"
                >
                  Manager approves
                </button>
                <button
                  type="button"
                  onClick={() => managerReject()}
                  className="py-1.5 px-2 rounded-xl bg-critical/15 border border-critical/40 text-critical text-[12px] font-semibold hover:bg-critical/25 transition-all cursor-pointer"
                >
                  Manager rejects
                </button>
                <button
                  type="button"
                  onClick={() => issueNewPin()}
                  className="py-1.5 px-2 rounded-xl bg-surface border border-hairline text-[12px] font-medium hover:bg-hairline/30 transition-all cursor-pointer"
                >
                  Issue new PIN
                </button>
                <button
                  type="button"
                  onClick={() => expirePin()}
                  className="py-1.5 px-2 rounded-xl bg-surface border border-hairline text-[12px] font-medium hover:bg-hairline/30 transition-all cursor-pointer"
                >
                  Expire PIN
                </button>
              </div>

              {/* Next PIN Result Switch */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[12px] text-secondary">Next PIN result:</span>
                <button
                  type="button"
                  onClick={() =>
                    updateCondition(
                      'nextPinResult',
                      conditions.nextPinResult === 'normal' ? 'offline-saved' : 'normal'
                    )
                  }
                  className={`px-3 py-1 rounded-full text-[12px] font-semibold border transition-all cursor-pointer ${
                    conditions.nextPinResult === 'offline-saved'
                      ? 'bg-attention/20 text-attention border-attention'
                      : 'bg-action/10 text-action border-action'
                  }`}
                >
                  {conditions.nextPinResult === 'offline-saved' ? 'Offline-saved' : 'Normal (Sync)'}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Tab: Function Tracker */
          <div className="space-y-4">
            <div className="p-2.5 rounded-xl bg-bg border border-hairline flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold font-mono">
                  {completedCount} / {totalCount}
                </p>
                <p className="text-[11px] text-secondary">Functions verified</p>
              </div>
              <div className="h-2 w-28 bg-hairline rounded-full overflow-hidden">
                <div
                  className="h-full bg-success transition-all duration-300"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>

            {FUNCTION_GROUPS.map((grp) => (
              <div key={grp.group} className="space-y-1.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                  {grp.group}
                </h3>
                <div className="space-y-1">
                  {grp.items.map((item) => {
                    const isDone = trackedFunctions[item.id];
                    return (
                      <div
                        key={item.id}
                        className={`p-2 rounded-xl border transition-all ${
                          isDone
                            ? 'bg-success/10 border-success/30'
                            : 'bg-surface border-hairline'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`w-4 h-4 rounded-md flex items-center justify-center text-[12px] shrink-0 mt-0.5 ${
                              isDone ? 'bg-success text-white' : 'border border-hairline'
                            }`}
                          >
                            {isDone && '✓'}
                          </span>
                          <div className="min-w-0">
                            <p
                              className={`text-[12px] font-semibold leading-tight ${
                                isDone ? 'text-success' : 'text-black dark:text-white'
                              }`}
                            >
                              <span className="font-mono">{item.id}</span>: {item.name}
                            </p>
                            <p className="text-[11px] text-secondary mt-0.5 leading-snug">
                              {item.hint}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
