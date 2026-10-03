import { AlertTriangle, Flag, Hammer, Send, User, X } from "lucide-react"
import { useState } from "react"
import { Button, Heading, IconButton } from "./ui"
import type { Remark } from "../types/dispatcher";

type RemarksModalProps = {
  vehicleId: string
  remarks: Remark[]
  onClose: () => void
  onUpdateRemarks: (updated: Remark[]) => void
}


/* ------------------------------------------------------------------ */
/* Loader remarks carry the loading exception record from the loader's */
/* app (missing / damaged items). The dispatcher reviews each item,    */
/* decides what happens to it, and informs the store's stock manager.  */
/* ------------------------------------------------------------------ */

type ExceptionItem = {
  name: string
  qty: string
  kind: "Damaged" | "Missing"
  reason: string
}

type Decision = "Replace next route" | "Credit note" | "Return to depot"

const DECISIONS: Decision[] = ["Replace next route", "Credit note", "Return to depot"]

const LOAD_RECORD = {
  bay: "03",
  departure: "08:15",
  stops: 4,
  totalItems: 23,
  loaded: 19,
  confirmedAt: "07:52 · device time",
}

const EXCEPTIONS: ExceptionItem[] = [
  { name: "Earbuds", qty: "2 cartons", kind: "Damaged", reason: "Damaged during handling" },
  { name: "Phone chargers", qty: "1 carton", kind: "Damaged", reason: "Box crushed before loading" },
  { name: "USB cables", qty: "1 box", kind: "Damaged", reason: "Damaged during handling" },
  { name: "Power banks", qty: "2 boxes", kind: "Missing", reason: "Short quantity" },
]

function defaultDecision(item: ExceptionItem): Decision {
  return item.kind === "Missing" ? "Replace next route" : "Return to depot"
}

function storeNoticeFor(
  shop: string,
  items: ExceptionItem[],
  decisions: Decision[],
) {
  const lines = items.map(
    (item, i) => `• ${item.name}, ${item.qty}: ${item.kind.toLowerCase()} (${item.reason.toLowerCase()}) → ${decisions[i].toLowerCase()}`,
  )
  return `Hello, today's delivery to ${shop} has ${items.length} flagged items:\n${lines.join("\n")}\nWe will send the replacements tomorrow and share the credit note. Sorry for the trouble.`
}

function LoaderExceptionReview({
  remark,
  vehicleId,
  decisions,
  setDecision,
  storeNotice,
  setStoreNotice,
}: {
  remark: Remark
  vehicleId: string
  decisions: Decision[]
  setDecision: (index: number, value: Decision) => void
  storeNotice: string
  setStoreNotice: (value: string) => void
}) {
  const missing = EXCEPTIONS.filter((e) => e.kind === "Missing").length
  const damaged = EXCEPTIONS.length - missing
  return (
    <div className="loader-review">
      <div className="loader-review__summary">
        <span>
          <small>Vehicle</small>
          <b className="data-text">{vehicleId}</b>
        </span>
        <span>
          <small>Bay</small>
          <b className="data-text">{LOAD_RECORD.bay}</b>
        </span>
        <span>
          <small>Departure</small>
          <b className="data-text">{LOAD_RECORD.departure}</b>
        </span>
        <span>
          <small>Loaded</small>
          <b className="data-text">
            {LOAD_RECORD.loaded} / {LOAD_RECORD.totalItems}
          </b>
        </span>
        <span>
          <small>Flagged</small>
          <b className="data-text loader-review__flagged">{EXCEPTIONS.length}</b>
        </span>
        <span>
          <small>Confirmed</small>
          <b className="data-text">{LOAD_RECORD.confirmedAt}</b>
        </span>
      </div>

      <div className="loader-review__exceptions">
        <div className="loader-review__head">
          <span className="loader-review__flag">
            <Flag aria-hidden="true" size={20} />
          </span>
          <span>
            <small>Exceptions recorded by the loader</small>
            <strong>{EXCEPTIONS.length} flagged items</strong>
          </span>
          <span className="loader-review__count loader-review__count--missing">
            <AlertTriangle aria-hidden="true" size={15} /> {missing} missing
          </span>
          <span className="loader-review__count">
            <Hammer aria-hidden="true" size={15} /> {damaged} damaged
          </span>
        </div>

        {EXCEPTIONS.map((item, i) => (
          <div className="loader-review__item" key={item.name}>
            <span
              className={`loader-review__icon ${item.kind === "Missing" ? "loader-review__icon--missing" : ""
                }`}
            >
              {item.kind === "Missing" ? (
                <AlertTriangle aria-hidden="true" size={16} />
              ) : (
                <Hammer aria-hidden="true" size={16} />
              )}
            </span>
            <span className="loader-review__item-text">
              <strong>{item.name}</strong>
              <small>
                {item.qty} · {item.kind} · {item.reason}
              </small>
            </span>
            <select
              aria-label={`Decision for ${item.name}`}
              className="loader-review__decision"
              onChange={(e) => setDecision(i, e.target.value as Decision)}
              value={decisions[i]}
            >
              {DECISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="remark-notice-group">
        <label>
          Notice to the stock manager · {remark.stopName}
        </label>
        <textarea
          className="remark-textarea loader-review__store-notice"
          onChange={(e) => setStoreNotice(e.target.value)}
          value={storeNotice}
        />
      </div>
    </div>
  )
}

export function RemarksModal({
  vehicleId,
  remarks: initialRemarks,
  onClose,
  onUpdateRemarks,
}: RemarksModalProps) {
  const [remarks, setRemarks] = useState<Remark[]>(initialRemarks)
  const [activeId, setActiveId] = useState<string>(() => {
    const firstUnreviewed = initialRemarks.find((r) => !r.reviewed)
    return firstUnreviewed ? firstUnreviewed.id : initialRemarks[0].id
  })

  const activeRemark = remarks.find((r) => r.id === activeId) || remarks[0]
  const [noticeText, setNoticeText] = useState(
    activeRemark.notice ||
    "Thanks. Keep the damaged cartons on the truck and return them to the depot; a replacement goes out tomorrow.",
  )

  const reviewedCount = remarks.filter((r) => r.reviewed).length
  const isLoader = activeRemark.role === "Loader"

  // Loader exception review: decision per flagged item and the notice to
  // the shop's stock manager, kept per remark while the pop-up is open.
  const [decisionsById, setDecisionsById] = useState<Record<string, Decision[]>>({})
  const [storeNoticeById, setStoreNoticeById] = useState<Record<string, string>>({})
  const decisions = decisionsById[activeRemark.id] ?? EXCEPTIONS.map(defaultDecision)
  const storeNotice =
    storeNoticeById[activeRemark.id] ??
    storeNoticeFor(activeRemark.stopName, EXCEPTIONS, decisions)
  const setDecision = (index: number, value: Decision) => {
    const next = decisions.map((d, i) => (i === index ? value : d))
    setDecisionsById((prev) => ({ ...prev, [activeRemark.id]: next }))
    // Keep the drafted notice in step unless the dispatcher has edited it.
    if (!storeNoticeById[`${activeRemark.id}:edited`]) {
      setStoreNoticeById((prev) => ({
        ...prev,
        [activeRemark.id]: storeNoticeFor(activeRemark.stopName, EXCEPTIONS, next),
      }))
    }
  }
  const setStoreNotice = (value: string) =>
    setStoreNoticeById((prev) => ({
      ...prev,
      [activeRemark.id]: value,
      [`${activeRemark.id}:edited`]: "1",
    }))

  const handleSelect = (r: Remark) => {
    setActiveId(r.id)
    setNoticeText(
      r.notice ||
      "Thanks. Keep the damaged cartons on the truck and return them to the depot; a replacement goes out tomorrow.",
    )
  }

  const markReviewed = (withNotice: boolean) => {
    const updated = remarks.map((r) => {
      if (r.id === activeRemark.id) {
        return {
          ...r,
          reviewed: true,
          notice: withNotice ? noticeText : r.notice,
        }
      }
      return r
    })
    setRemarks(updated)
    onUpdateRemarks(updated)

    // Move to next unreviewed
    const nextUnreviewed = updated.find((r) => !r.reviewed)
    if (nextUnreviewed) {
      setActiveId(nextUnreviewed.id)
      setNoticeText(
        nextUnreviewed.notice ||
        "Noted. We will coordinate with the team regarding this matter.",
      )
    }
  }

  return (
    <div
      className="modal-layer"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        aria-labelledby="remarks-modal-title"
        aria-modal="true"
        className={`modal remarks-modal ${isLoader ? "remarks-modal--loader" : ""}`}
        role="dialog"
      >
        <div className="modal__heading">
          <div>
            <Heading id="remarks-modal-title">Review remarks</Heading>
            <p>
              {vehicleId} · {remarks.length} remarks
            </p>
          </div>
          <IconButton icon={X} label="Close modal" onClick={onClose} />
        </div>

        <div className="remarks-grid">
          {/* Left: Remarks List */}
          <div className="remarks-modal-list">
            {remarks.map((r) => {
              const isActive = r.id === activeRemark.id
              return (
                <div
                  className={`remark-modal-item ${isActive ? "remark-modal-item--active" : ""}`}
                  key={r.id}
                  onClick={() => handleSelect(r)}
                >
                  <div className="remark-modal-avatar">
                    <User size={20} />
                  </div>
                  <div className="remark-modal-item__content">
                    <div className="remark-modal-item__header">
                      <strong>{r.role}</strong>
                      <span>{r.time}</span>
                    </div>
                    <div className="remark-modal-item__text">{r.text}</div>
                  </div>
                  <span
                    className={`remark-badge ${r.reviewed ? "remark-badge--reviewed" : "remark-badge--new"}`}
                  >
                    {r.reviewed ? "Reviewed" : "New"}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Right: Active Remark Details */}
          <div className={`remark-detail-panel ${isLoader ? "remark-detail-panel--loader" : ""}`}>
            <div className="remark-detail-header">
              <div className="remark-detail-author">
                <div className="remark-modal-avatar">
                  <User size={24} />
                </div>
                <div>
                  <strong style={{ fontSize: "16px", color: "var(--navy-900)", display: "block" }}>
                    {activeRemark.role}
                  </strong>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Raised {activeRemark.time} at {activeRemark.stopName} · stop {activeRemark.stopNumber}
                  </span>
                </div>
              </div>
              <span
                className={`remark-badge ${activeRemark.reviewed ? "remark-badge--reviewed" : "remark-badge--new"}`}
              >
                {activeRemark.reviewed ? "Reviewed" : "New"}
              </span>
            </div>

            <div className="remark-detail-quote">
              &ldquo;{activeRemark.text}&rdquo;
            </div>

            {isLoader ? (
              <LoaderExceptionReview
                decisions={decisions}
                remark={activeRemark}
                setDecision={setDecision}
                setStoreNotice={setStoreNotice}
                storeNotice={storeNotice}
                vehicleId={vehicleId}
              />
            ) : null}

            <div className="remark-notice-group">
              <label>Notice to the {activeRemark.role}</label>
              <textarea
                className="remark-textarea"
                onChange={(e) => setNoticeText(e.target.value)}
                placeholder={`Write a notice to the ${activeRemark.role}...`}
                value={noticeText}
              />
            </div>

            {isLoader ? null : <div className="remark-notify-row">
              <span>Also notify:</span>
              <span className="notify-chip">
                Stock manager · {activeRemark.stopName}
              </span>
              <button className="notify-add-btn" type="button">
                + Add
              </button>
            </div>}

            <div className="remark-action-buttons">
              <Button
                icon={Send}
                onClick={() => markReviewed(true)}
                variant="primary"
              >
                {isLoader
                  ? "Send to loader & stock manager · mark reviewed"
                  : "Send notice & mark reviewed"}
              </Button>
              <Button onClick={() => markReviewed(false)} variant="secondary">
                Mark reviewed only
              </Button>
            </div>
          </div>
        </div>

        <div className="remarks-modal-footer">
          <span>
            {reviewedCount} of {remarks.length} reviewed · Accept route unlocks when all are reviewed
          </span>
          <Button onClick={onClose} variant="secondary">
            Done
          </Button>
        </div>
      </section>
    </div>
  )
}