// src/features/market-detail/components/ProductChecklist.tsx - Product checklist items

import React from 'react';
import { OutletProduct } from '@/shared/types';

export interface ProductChecklistProps {
  products: OutletProduct[];
  outletId: string;
  onToggleProduct: (outletId: string, productId: string) => void;
}

export const ProductChecklist: React.FC<ProductChecklistProps> = ({
  products,
  outletId,
  onToggleProduct
}) => {
  return (
    <section aria-label="Unpacking checklist" className="w-full pt-1">
      <div className="bg-surface rounded-[20px] border border-hairline divide-y divide-hairline overflow-hidden shadow-sm">
        {products.map((product) => {
          const isChecked = product.checked;

          return (
            <div
              key={product.id}
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
                </div>
              </div>

              <span className="text-[15px] text-secondary font-mono tabular-nums shrink-0">
                {product.quantity} {product.unit}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};
