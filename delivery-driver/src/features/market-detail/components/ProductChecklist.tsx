// src/features/market-detail/components/ProductChecklist.tsx - Product checklist items with short/damaged reporting

import React, { useState } from 'react';
import { OutletProduct } from '@/shared/types';

export interface ProductChecklistProps {
  products: OutletProduct[];
  outletId: string;
  onToggleProduct: (outletId: string, productId: string) => void;
  /** Report units short or damaged. The rest of the expected quantity counts as delivered. */
  onSetIssue: (outletId: string, productId: string, issue: { short: number; damaged: number }) => void;
}

const asCount = (value: string) => Math.max(0, Math.floor(Number(value)) || 0);

export const ProductChecklist: React.FC<ProductChecklistProps> = ({
  products,
  outletId,
  onToggleProduct,
  onSetIssue
}) => {
  const [issueOpenFor, setIssueOpenFor] = useState<string | null>(null);

  return (
    <section aria-label="Unpacking checklist" className="w-full pt-1">
      <div className="bg-surface rounded-[20px] border border-hairline divide-y divide-hairline overflow-hidden shadow-sm">
        {products.map((product) => {
          const isChecked = product.checked;
          const expected = Number(product.quantity);
          const short = product.short ?? 0;
          const damaged = product.damaged ?? 0;
          const delivered = expected - short - damaged;
          const hasIssue = short + damaged > 0;
          const isIssueOpen = issueOpenFor === product.id;

          return (
            <div key={product.id}>
              <div
                onClick={() => onToggleProduct(outletId, product.id)}
                className="min-h-[56px] px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-bg/40 active:bg-bg/70 transition-colors select-none"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Checkbox Circle (120ms fill) */}
                  <div
                    className={`w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0 border transition-all duration-[120ms] ${
                      isChecked
                        ? 'bg-action border-action text-white shadow-sm'
                        : 'border-hairline bg-surface'
                    }`}
                  >
                    {isChecked && (
                      <span className="material-symbols-outlined text-[18px] leading-none animate-check-draw">
                        check
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-[17px] font-medium leading-tight truncate transition-colors duration-[120ms] ${
                        isChecked ? 'text-secondary' : 'text-black dark:text-white'
                      }`}
                    >
                      {product.name}
                    </p>
                    {product.chilled && (
                      <span className="text-[12px] text-action font-medium">Chilled storage</span>
                    )}
                    {hasIssue && (
                      <span className="block text-[12px] text-attention font-medium">
                        Delivering {delivered}
                        {short > 0 ? ` · ${short} short` : ''}
                        {damaged > 0 ? ` · ${damaged} damaged` : ''}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[15px] text-secondary font-mono tabular-nums shrink-0">
                  {product.quantity} {product.unit}
                </span>
              </div>

              <div className="px-4 pb-2 -mt-1">
                <button
                  type="button"
                  onClick={() => setIssueOpenFor(isIssueOpen ? null : product.id)}
                  className="text-[13px] text-action font-medium cursor-pointer hover:opacity-80"
                >
                  {isIssueOpen ? 'Done' : hasIssue ? 'Edit short / damaged' : 'Report short / damaged'}
                </button>

                {isIssueOpen && (
                  <div className="mt-2 flex items-end gap-3">
                    <label className="flex flex-col gap-1 text-[12px] text-secondary">
                      Short
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={expected}
                        value={short}
                        onChange={(event) => onSetIssue(outletId, product.id, { short: asCount(event.target.value), damaged })}
                        className="w-20 h-10 rounded-lg border border-hairline bg-bg px-2 text-[16px] text-black dark:text-white tabular-nums"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[12px] text-secondary">
                      Damaged
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={expected - short}
                        value={damaged}
                        onChange={(event) => onSetIssue(outletId, product.id, { short, damaged: asCount(event.target.value) })}
                        className="w-20 h-10 rounded-lg border border-hairline bg-bg px-2 text-[16px] text-black dark:text-white tabular-nums"
                      />
                    </label>
                    <span className="text-[13px] text-secondary pb-2.5">
                      Delivered: <strong className="text-black dark:text-white tabular-nums">{delivered}</strong> of {expected}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
