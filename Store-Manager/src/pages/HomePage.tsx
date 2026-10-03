import { ChevronDown, ArrowRight, CalendarDays, AlertTriangle } from "lucide-react";
import {  motion, AnimatePresence  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {  Button  } from '../components/common/Button';
import { AttentionCard } from "../components/common/PrototypeMisc";
import {  StatusPill  } from '../components/common/StatusPill';
import { FloatingNewOrder } from "../components/layout/TopBar";
import { getUpcomingDeliveries, formatOrderType, getDefaultOrderType } from "../lib/utils";
import { type UpcomingDelivery } from "../types/store";
import { recentActivity, statusDetails, calmSpring } from "../lib/constants";

export function HomePage({
      showAttention = true,
      afterCutoff = false,
      showUpcoming = true,
      onNewOrder,
      onOpenDeferred,
      business,
      onOpenOrder,
      onBusinessChange,
      onNavigate,
    }: {
          showAttention?: boolean
          afterCutoff?: boolean
          showUpcoming?: boolean
          onNewOrder: () => void
          onOpenDeferred: () => void
          business: "fresh" | "style" | "tech"
          onOpenOrder: (id: string, view: string, state: string) => void
          onBusinessChange?: (b: "fresh" | "style" | "tech") => void
          onNavigate: (label: string) => void
        }) {
    return (
        <div className="home-page">
          <div className="home-page-header">
            <div>
              <span className="home-greeting">Good morning, Dilini</span>
              <div className="page-title">Home</div>
              <p>Here's what's happening at your store today.</p>
            </div>
            
          </div>

          {business && onBusinessChange && (
            <div className="prototype-state-control" style={{ marginBottom: 24 }}>
              <span className="prototype-only-label">Prototype only</span>
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Outlet type</span>
                <span className="prototype-select-wrap">
                  <select
                    value={business}
                    onChange={(event) => onBusinessChange(event.target.value as "fresh" | "style" | "tech")}
                  >
                    <option value="fresh">Waypoint Fresh</option>
                    <option value="style">Waypoint Style</option>
                    <option value="tech">Waypoint Tech</option>
                  </select>
                  <ChevronDown />
                </span>
              </label>
            </div>
          )}
          

          

          

          <motion.section className="home-section" layout transition={calmSpring}>
            <HomeSectionHeader title="Next delivery" />
            <NextDeliveryHero business={business} onOpen={() => onOpenOrder("ORD-1062", "order-detail", "scheduled")} />
          </motion.section>

    <AnimatePresence initial={false}>
            {showAttention && (
              <motion.section
                className="home-section attention-section"
                layout
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                transition={calmSpring}
              >
                <HomeSectionHeader title="Needs attention" />
                <AttentionCard onOpen={() => onOpenOrder("ORD-1045", "verify-delivery", "verify")} />
              </motion.section>
            )}
          </AnimatePresence>

          <motion.div className="home-bottom-grid" layout transition={calmSpring}>
            <section className="home-panel upcoming-panel">
              <HomeSectionHeader title="Upcoming deliveries" action="View all" onAction={() => onNavigate("Orders")} />
              <AnimatePresence mode="wait" initial={false}>
                {showUpcoming ? (
                  <motion.div
                    className="upcoming-list"
                    key="upcoming-list"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={calmSpring}
                  >
                    {getUpcomingDeliveries(business || "fresh").map((delivery) => (
                      <UpcomingDeliveryRow business={business}
                        delivery={delivery}
                        key={delivery.id}
                        onOpen={
                          delivery.id === "ORD-1065" ? onOpenDeferred : undefined
                        }
                      />
                    ))}
                  </motion.div>
                ) : (
                  <UpcomingEmptyState key="upcoming-empty" />
                )}
              </AnimatePresence>
            </section>

            <section className="home-panel activity-panel">
              <HomeSectionHeader title="Recent activity" action="View all" onAction={() => onNavigate("Deliveries")} />
              <RecentActivityList />
            </section>
          </motion.div>
          <FloatingNewOrder onClick={onNewOrder} />
        </div>
      )
}

export function HomeSectionHeader({
        title,
        action,
        onAction,
      }: {
        title: string
        action?: string
        onAction?: () => void
        }) {
    return (
    <div className="home-section-header">
      <div className="home-section-title">{title}</div>
      {action && (
        <Button tone="secondary" className="text-button" onClick={onAction}>
          {action}
          <ArrowRight />
        </Button>
      )}
    </div>
    )
}

export function NextDeliveryHero({ onOpen, business = "fresh" }: { onOpen?: () => void, business?: "fresh" | "style" | "tech" }) {
    return (
    <motion.div
      className="next-delivery-card"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={calmSpring}
    >
      <div className="next-delivery-main">
        <div className="next-delivery-heading">
          <span className="delivery-date">
            <CalendarDays />
            Tomorrow · Thursday, 1 October
          </span>
          <StatusPill kind="scheduled" />
        </div>
        <div className="delivery-name">{formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh"))}</div>
        <span className="order-reference">
          Order <strong className="data-id">ORD-1062</strong>
        </span>
      </div>

      <div className="next-delivery-eta">
        <span className="field-label">Expected arrival</span>
        <strong>06:40–07:00</strong>
        <span>Tomorrow morning</span>
      </div>

      <div className="next-delivery-meta">
        <div>
          <span>Trip</span>
          <strong className="data-id">PLG-03</strong>
        </div>
        <div>
          <span>Vehicle</span>
          <strong className="data-id">WP-014</strong>
        </div>
      </div>

      <Button tone="secondary" className="view-details-button" onClick={onOpen}>
        View details
        <ArrowRight />
      </Button>
    </motion.div>
    )
}

export function UpcomingDeliveryRow({ business, delivery, onOpen }: { business: "fresh" | "style" | "tech", delivery: UpcomingDelivery, onOpen?: () => void }) {
    return (
    <motion.button
      className="upcoming-row"
      type="button"
      layout
      onClick={onOpen}
      whileTap={{ scale: 0.99 }}
      transition={calmSpring}
    >
      <span className="upcoming-record">
        <strong className="data-id">{delivery.id}</strong>
        <span>{delivery.type}</span>
      </span>
      <span className="upcoming-date">
        <CalendarDays />
        {delivery.date}
      </span>
      <span className="upcoming-status">
        <StatusPill kind={delivery.status} />
        {delivery.reason && (
          <small>
            <AlertTriangle />
            {delivery.reason}
          </small>
        )}
      </span>
      <span className="upcoming-eta">{delivery.eta}</span>
      <ArrowRight className="row-arrow" />
    </motion.button>
    )
}

export function RecentActivityList() {
    return (
    <div className="activity-list">
      {recentActivity.map((activity) => {
        const details = statusDetails[activity.kind]
        return (
          <motion.button
            className="activity-row"
            type="button"
            key={activity.id}
            whileTap={{ scale: 0.99 }}
            transition={calmSpring}
          >
            <span
              className={`activity-icon activity-icon--${activity.kind}`}
              aria-hidden="true"
            >
              {details.icon}
            </span>
            <span className="activity-copy">
              <strong className="data-id">{activity.id}</strong>
              <span>{activity.label}</span>
            </span>
            <time>{activity.time}</time>
          </motion.button>
        )
      })}
    </div>
    )
}

export function UpcomingEmptyState() {
    return (
    <motion.div
      className="upcoming-empty"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={calmSpring}
    >
      <CalendarDays />
      <div>
        <strong>No upcoming deliveries scheduled</strong>
        <p>New delivery dates will appear here once an order is scheduled.</p>
      </div>
    </motion.div>
    )
}
