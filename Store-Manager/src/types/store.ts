import type { ReactNode } from "react";

export type OrderType = "dry" | "chilled" | "products";
export type OrderDrafts = Record<OrderType, Record<string, number>>;
export type CatalogProduct = {
      id: string
      name: string
      unit: string
    };
export type SubmissionState = "idle" | "submitting" | "error";
export type OrderDetailState = "confirmed" | "deferred" | "scheduled" | "on-way" | "arrived" | "awaiting-confirmation" | "receipt-confirmed" | "receipt-issue";
export type ReceiptFlowState = "verify" | "full" | "issue-edit" | "issue-review" | "confirmed" | "confirmed-issue";
export type ReceiptIssueType = "good" | "missing" | "damaged" | "temperature" | "wrong-variant" | "wrong-item" | "seal" | "condition" | "other";
export type ButtonTone = "primary" | "secondary" | "issue";
export type ButtonSize = "default" | "mobile";
export type StatusKind = "confirmed" | "scheduled" | "transit" | "arrived" | "deferred" | "awaiting" | "received" | "issue";
export type UpcomingDelivery = {
      id: string
      type: string
      date: string
      status: "confirmed" | "scheduled" | "deferred"
      eta: string
      reason?: string
    };
