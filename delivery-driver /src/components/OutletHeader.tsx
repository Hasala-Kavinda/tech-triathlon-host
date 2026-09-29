import React from 'react';

export interface OutletHeaderProps {
  routeNumber: number;
  outletOrder: number;
  totalOutlets: number;
  city: string;
  brandName: string;
  managerName?: string;
  managerPhone?: string;
}

export const OutletHeader: React.FC<OutletHeaderProps> = ({
  routeNumber,
  outletOrder,
  totalOutlets,
  city,
  brandName,
  managerName = 'Nuwan Perera',
  managerPhone = '077 123 4567'
}) => {
  const sanitizedPhone = managerPhone ? managerPhone.replace(/[^0-9+]/g, '') : '';

  return (
    <section
      aria-label="Outlet details header"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
      }}
      className="w-full px-1 pt-1 pb-1 select-none"
    >
      {/* 1. Small caption in secondary text: "Route 2 · Outlet 4 of 14" (route and order in data font) */}
      <p className="text-[13px] text-secondary leading-tight">
        Route <span className="font-mono tabular-nums">{routeNumber}</span> · Outlet{' '}
        <span className="font-mono tabular-nums">{outletOrder}</span> of{' '}
        <span className="font-mono tabular-nums">{totalOutlets}</span>
      </p>

      {/* 2. Large title: city name (28px bold, tight tracking, primary text) */}
      <h1 className="text-[28px] font-bold text-black dark:text-white leading-tight tracking-tight mt-1 truncate">
        {city}
      </h1>

      {/* 3. Brand beneath in secondary text */}
      <p className="text-[15px] text-secondary font-normal leading-tight mt-0.5">
        {brandName}
      </p>

      {/* 4. One quiet line: "Store manager · Nuwan Perera" with "Call" text button in accent */}
      <div className="flex items-center justify-between mt-2.5 pt-0.5 text-[15px] leading-tight">
        <span className="text-secondary truncate pr-2">
          Store manager · <span className="text-black dark:text-white font-normal">{managerName}</span>
        </span>
        {managerPhone ? (
          <a
            href={`tel:${sanitizedPhone}`}
            className="text-action font-medium hover:opacity-80 active:opacity-60 transition-opacity shrink-0 py-0.5 focus:outline-none"
            aria-label={`Call store manager ${managerName}`}
          >
            Call
          </a>
        ) : null}
      </div>
    </section>
  );
};
