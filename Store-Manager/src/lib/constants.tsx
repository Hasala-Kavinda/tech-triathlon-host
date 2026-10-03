import { Home, ShoppingBag, Truck, CheckCircle2, CalendarDays, Clock3, CircleAlert, PackageCheck, AlertTriangle, ReceiptText, ChevronDown, ArrowLeft, ArrowRight } from "lucide-react";
import React, { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import type { StatusKind, OrderDetailState, CatalogProduct, OrderType } from "../types/store";

export const calmSpring = {
      type: "spring" as const,
      stiffness: 420,
      damping: 36,
      mass: 0.8,
    };
export const overlaySpring = {
      type: "spring" as const,
      stiffness: 340,
      damping: 34,
      mass: 0.9,
    };
export const navigation = [
      { label: "Home", icon: Home },
      { label: "Orders", icon: ShoppingBag },
      { label: "Deliveries", icon: Truck },
    ];
export const statusDetails: Record<StatusKind, {
      label: string
      icon: ReactNode
    }> = {
              confirmed: { label: "Order confirmed", icon: <CheckCircle2 /> },
              scheduled: { label: "Scheduled", icon: <CalendarDays /> },
              transit: { label: "On the way", icon: <Truck /> },
              arrived: { label: "Arrived", icon: <CheckCircle2 /> },
              deferred: { label: "Deferred", icon: <Clock3 /> },
              awaiting: { label: "Awaiting confirmation", icon: <CircleAlert /> },
              received: { label: "Receipt confirmed", icon: <PackageCheck /> },
              issue: { label: "Receipt confirmed with issue", icon: <AlertTriangle /> },
            };
export const orderDetailStages = [
              "Order confirmed",
              "Scheduled",
              "On the way",
              "Arrived",
              "Receipt confirmation",
            ];
export const orderDetailTimestamps: Record<OrderDetailState, string[]> = {
              deferred: ["Wed � 13:46", "-", "-", "-", "-", "-"],
              confirmed: ["Wed · 13:46", "-", "-", "-", "-", "-"],
              scheduled: ["Wed · 13:46", "Wed · 16:35", "-", "-", "-", "-"],
              "on-way": ["Wed · 13:46", "Wed · 16:35", "Thu · 05:48", "-", "-", "-"],
              arrived: ["Wed · 13:46", "Wed · 16:35", "Thu · 05:48", "Thu · 06:43", "-", "-"],

              "awaiting-confirmation": [
                "Wed · 13:46",
                "Wed · 16:35",
                "Thu · 05:48",
                "Thu · 06:43",
                "Thu · 06:45",
                "Current",
              ],
              "receipt-confirmed": [
                "Wed · 13:46",
                "Wed · 16:35",
                "Thu · 05:48",
                "Thu · 06:43",
                "Thu · 06:45",
                "Thu · 06:57",
              ],
              "receipt-issue": [
                "Wed · 13:46",
                "Wed · 16:35",
                "Thu · 05:48",
                "Thu · 06:43",
                "Thu · 06:45",
                "Thu · 06:59",
              ],
            };
export const orderDetailStep: Record<OrderDetailState, number> = {
              deferred: 0,
              confirmed: 0,
              scheduled: 1,
              "on-way": 2,
              arrived: 3,
              
              "awaiting-confirmation": 5,
              "receipt-confirmed": 5,
              "receipt-issue": 5,
            };
export const orderActivity = [
              {
                label: "Order received",
                time: "Wed · 13:46",
                step: 0,
                icon: <PackageCheck />,
              },
              {
                label: "Scheduled",
                time: "Wed · 16:35",
                step: 1,
                icon: <CalendarDays />,
              },
              {
                label: "Vehicle departed",
                time: "Thu · 05:48",
                step: 2,
                icon: <Truck />,
              },
              {
                label: "Arrived",
                time: "Thu · 06:43",
                step: 3,
                icon: <CheckCircle2 />,
              },
              {
                label: "Driver completed delivery",
                time: "Thu · 06:52",
                step: 4,
                icon: <ReceiptText />,
              },
            ];
export const deferredProducts: Array<CatalogProduct & { quantity: number }> = [
              { id: "fresh-milk", name: "Fresh milk", unit: "carton", quantity: 24 },
              { id: "chicken", name: "Chicken", unit: "kg", quantity: 20 },
              {
                id: "frozen-vegetables",
                name: "Frozen vegetables",
                unit: "box",
                quantity: 10,
              },
              { id: "yoghurt", name: "Yoghurt", unit: "crate", quantity: 8 },
            ];
export const deferredStages = [
              "Order confirmed",
              "Deferred",
              "Awaiting reschedule",
              "Scheduled",
              "Delivery",
            ];
export const timelineSteps = [
              "Order confirmed",
              "Scheduled",
              "On the way",
              "Arrived",
              "Receipt confirmation",
            ];
export const recentActivity = [
              {
                id: "ORD-1037",
                label: "Receipt confirmed",
                time: "Today · 06:57",
                kind: "received" as StatusKind,
              },
              {
                id: "ORD-1034",
                label: "Receipt confirmed with issue",
                time: "Yesterday",
                kind: "issue" as StatusKind,
              },
              {
                id: "ORD-1029",
                label: "Delivered",
                time: "28 Sep",
                kind: "confirmed" as StatusKind,
              },
            ];
export const productCatalog: Record<"fresh" | "style" | "tech", Partial<Record<OrderType, CatalogProduct[]>>> = {
              fresh: {
                dry: [
                  { id: "rice", name: "Rice", unit: "bag" },
                  { id: "milk-powder", name: "Milk powder", unit: "carton" },
                  { id: "flour", name: "Flour", unit: "bag" },
                  { id: "cooking-oil", name: "Cooking oil", unit: "bottle" },
                  { id: "canned-goods", name: "Canned goods", unit: "carton" },
                ],
                chilled: [
                  { id: "fresh-milk", name: "Fresh milk", unit: "carton" },
                  { id: "chicken", name: "Chicken", unit: "kg" },
                  { id: "frozen-vegetables", name: "Frozen vegetables", unit: "box" },
                  { id: "yoghurt", name: "Yoghurt", unit: "crate" },
                  { id: "frozen-meat", name: "Frozen meat", unit: "box" },
                ],
              },
              style: {
                products: [
                  { id: "t-shirts", name: "T-shirts", unit: "piece" },
                  { id: "shirts", name: "Shirts", unit: "piece" },
                  { id: "trousers", name: "Trousers", unit: "piece" },
                  { id: "dresses", name: "Dresses", unit: "piece" },
                  { id: "jackets", name: "Jackets", unit: "piece" },
                  { id: "shoes", name: "Shoes", unit: "pair" },
                  { id: "sandals", name: "Sandals", unit: "pair" },
                  { id: "bags", name: "Bags", unit: "piece" },
                  { id: "belts", name: "Belts", unit: "piece" },
                  { id: "caps", name: "Caps", unit: "piece" },
                ],
              },
              tech: {
                products: [
                  { id: "laptops", name: "Laptops", unit: "unit" },
                  { id: "smartphones", name: "Smartphones", unit: "unit" },
                  { id: "monitors", name: "Monitors", unit: "unit" },
                  { id: "tablets", name: "Tablets", unit: "unit" },
                  { id: "keyboards", name: "Keyboards", unit: "unit" },
                  { id: "mice", name: "Mice", unit: "unit" },
                  { id: "chargers", name: "Chargers", unit: "unit" },
                  { id: "headsets", name: "Headsets", unit: "unit" },
                  { id: "cables", name: "Cables", unit: "unit" },
                  { id: "battery-packs", name: "Battery packs", unit: "unit" },
                ],
              },
            };
export const mockDrafts: Record<"fresh" | "style" | "tech", Record<OrderType, Record<string, number>>> = {
              fresh: {
                dry: { rice: 20, "milk-powder": 30, flour: 10, "cooking-oil": 20 },
                chilled: { "fresh-milk": 12, chicken: 8 },
              },
              style: {
                products: { "t-shirts": 30, shirts: 20, trousers: 15, shoes: 12, dresses: 5, jackets: 4 },
              },
              tech: {
                products: { laptops: 6, smartphones: 12, monitors: 8, keyboards: 15, tablets: 10 },
              },
            } as any;

export function PrototypeStateControl<T extends string>({
      value,
      options,
      onChange,
      onSimulatePin,
    }: {
          value: T
          options: Array<{
            value: T
            label: string
          }>
          onChange: (value: T) => void
          onSimulatePin?: () => void
        }) {
    const stateIndex = options.findIndex((option) => option.value === value);
    return (
    <div className="prototype-state-control">
      <span className="prototype-only-label">Prototype only</span>
      <label>
        <span>Prototype state</span>
        <span className="prototype-select-wrap">
          <select
            value={value}
            onChange={(event) => onChange(event.target.value as T)}
          >
            {options.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown />
        </span>
      </label>
      <div className="prototype-step-actions">
        <button
          type="button"
          disabled={stateIndex === 0}
          onClick={() => onChange(options[Math.max(0, stateIndex - 1)].value)}
        >
          <ArrowLeft />
          Previous
        </button>
        {onSimulatePin && value === "arrived" && (
          <button type="button" onClick={onSimulatePin} style={{ color: "var(--emerald-700)", borderColor: "var(--emerald-600)", background: "var(--emerald-50)" }}>
            <CheckCircle2 style={{ width: 14, height: 14 }} />
            Simulate PIN verified
          </button>
        )}
        <button
          type="button"
          disabled={stateIndex === options.length - 1}
          onClick={() =>
            onChange(
              options[Math.min(options.length - 1, stateIndex + 1)].value,
            )
          }
        >
          Next
          <ArrowRight />
        </button>
      </div>
    </div>
    )
}
