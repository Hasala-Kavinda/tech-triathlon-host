import { AlertTriangle, Flag, Hammer, Send, User, X } from "lucide-react"
import { useState } from "react"
import { Button, Heading, IconButton } from "./ui"
import { monitorApi, type Contact, type MonitorRemark } from "../api/monitor"

type RemarksModalProps = {
  vehicleId: string
  tripId: string
  remarks: MonitorRemark[]
  /** The people a notice can go to: this trip's driver, loader and the stock managers on its stops. */
  recipients: Contact[]
  driver: Contact | null
  /** Reloads the trip after a review so every count on the page stays in step with the database. */
  onChanged: () => Promise<void>
  onClose: () => void
}

type Decision = "Replace next route" | "Credit note" | "Return to depot"
const DECISIONS: Decision[] = ["Replace next route", "Credit note", "Return to depot"]
const defaultDecision = (type: "missing" | "damaged"): Decision => (type === "missing" ? "Replace next route" : "Return to depot")

const ROLE_LABEL: Record<string, string> = { driver: "Driver", loader: "Loader", store_manager: "Stock manager", dispatcher: "Dispatcher" }
const roleLabel = (role: string) => ROLE_LABEL[role] ?? role

const stamp = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Colombo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "–"
const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" }) : "–")

function LoaderExceptionReview({ remark, decisions, setDecision }: { remark: MonitorRemark; decisions: Decision[]; setDecision: (index: number, value: Decision) => void }) {
  const exception = remark.loadException!
  const missing = exception.items.filter((item) => item.type === "missing").length
  const damaged = exception.items.length - missing
  return (
    <div className="loader-review">
      <div className="loader-review__summary">
        <span><small>Vehicle</small><b className="data-text">{exception.vehicleId}</b></span>
        <span><small>Depot</small><b className="data-text">{exception.depot}</b></span>
        <span><small>Loaded</small><b className="data-text">{exception.loaded} / {exception.total}</b></span>
        <span><small>Flagged</small><b className="data-text loader-review__flagged">{exception.flagged}</b></span>
        <span><small>Confirmed</small><b className="data-text">{exception.confirmedAt ? clock(exception.confirmedAt) : "not yet"}</b></span>
      </div>

      <div className="loader-review__exceptions">
        <div className="loader-review__head">
          <span className="loader-review__flag"><Flag aria-hidden="true" size={20} /></span>
          <span>
            <small>Exceptions recorded by the loader</small>
            <strong>{exception.items.length} flagged item{exception.items.length === 1 ? "" : "s"}</strong>
          </span>
          <span className="loader-review__count loader-review__count--missing"><AlertTriangle aria-hidden="true" size={15} /> {missing} missing</span>
          <span className="loader-review__count"><Hammer aria-hidden="true" size={15} /> {damaged} damaged</span>
        </div>

        {exception.items.map((item, index) => (
          <div className="loader-review__item" key={item.itemId}>
            <span className={`loader-review__icon ${item.type === "missing" ? "loader-review__icon--missing" : ""}`}>
              {item.type === "missing" ? <AlertTriangle aria-hidden="true" size={16} /> : <Hammer aria-hidden="true" size={16} />}
            </span>
            <span className="loader-review__item-text">
              <strong>{item.name}</strong>
              <small>
                {item.quantity} of {item.expectedQuantity} · {item.type} · {item.reasonCode.replaceAll("_", " ")}{item.note ? ` · ${item.note}` : ""}
              </small>
            </span>
            {remark.status === "pending" ? (
              <select aria-label={`Decision for ${item.name}`} className="loader-review__decision" onChange={(event) => setDecision(index, event.target.value as Decision)} value={decisions[index]}>
                {DECISIONS.map((decision) => <option key={decision} value={decision}>{decision}</option>)}
              </select>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export function RemarksModal({ vehicleId, tripId: _tripId, remarks, recipients, driver, onChanged, onClose }: RemarksModalProps) {
  const [activeId, setActiveId] = useState<string>(() => (remarks.find((remark) => remark.status === "pending") ?? remarks[0])?.id ?? "")
  const [noticeById, setNoticeById] = useState<Record<string, string>>({})
  const [extraById, setExtraById] = useState<Record<string, string[]>>({})
  const [decisionsById, setDecisionsById] = useState<Record<string, Decision[]>>({})
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = remarks.find((remark) => remark.id === activeId) ?? remarks[0]
  const reviewedCount = remarks.filter((remark) => remark.status === "reviewed").length

  if (!active) {
    return (
      <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <section aria-modal="true" className="modal remarks-modal" role="dialog">
          <div className="modal__heading"><Heading id="remarks-modal-title">Review remarks</Heading><IconButton icon={X} label="Close modal" onClick={onClose} /></div>
          <p className="mute" style={{ padding: 24 }}>No remarks have been raised on this route.</p>
        </section>
      </div>
    )
  }

  const isLoader = active.actorRole === "loader" && active.loadException !== null
  const flagged = active.loadException?.items ?? []
  const decisions = decisionsById[active.id] ?? flagged.map((item) => defaultDecision(item.type))
  const defaultNotice = isLoader
    ? `Thanks. ${flagged.length} flagged item${flagged.length === 1 ? "" : "s"} noted for ${active.stop?.outletName ?? "this route"}; follow the decisions recorded in the review.`
    : "Thanks, noted. We will follow up on this."
  const notice = noticeById[active.id] ?? active.notice?.text ?? defaultNotice
  const extraIds = extraById[active.id] ?? []
  const addable = recipients.filter((person) => person.id !== driver?.id && !extraIds.includes(person.id))
  const nameOf = (id: string) => recipients.find((person) => person.id === id)

  const setDecision = (index: number, value: Decision) => setDecisionsById((prev) => ({ ...prev, [active.id]: decisions.map((current, i) => (i === index ? value : current)) }))

  const review = async (withNotice: boolean) => {
    setBusy(true)
    setError(null)
    try {
      const decisionText = flagged.length ? ` Decisions: ${flagged.map((item, index) => `${item.name} → ${decisions[index]}`).join("; ")}.` : ""
      const recipientIds = [...(driver ? [driver.id] : []), ...extraIds]
      if (withNotice && recipientIds.length === 0) throw new Error("This route has no driver to send a notice to.")
      await monitorApi.review(active.id, {
        response: withNotice ? `${notice.trim()}${decisionText}` : `Reviewed.${decisionText}`,
        ...(withNotice ? { notice: { text: `${notice.trim()}${decisionText}`, recipientIds } } : {}),
      })
      await onChanged()
      const next = remarks.find((remark) => remark.status === "pending" && remark.id !== active.id)
      if (next) setActiveId(next.id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The review could not be saved.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="remarks-modal-title" aria-modal="true" className={`modal remarks-modal ${isLoader ? "remarks-modal--loader" : ""}`} role="dialog">
        <div className="modal__heading">
          <div>
            <Heading id="remarks-modal-title">Review remarks</Heading>
            <p>{vehicleId} · {remarks.length} remark{remarks.length === 1 ? "" : "s"}</p>
          </div>
          <IconButton icon={X} label="Close modal" onClick={onClose} />
        </div>

        <div className="remarks-grid">
          <div className="remarks-modal-list">
            {remarks.map((remark) => (
              <div className={`remark-modal-item ${remark.id === active.id ? "remark-modal-item--active" : ""}`} key={remark.id} onClick={() => { setActiveId(remark.id); setAdding(false); setError(null) }}>
                <div className="remark-modal-avatar"><User size={20} /></div>
                <div className="remark-modal-item__content">
                  <div className="remark-modal-item__header">
                    <strong>{roleLabel(remark.actorRole)}</strong>
                    <span>{stamp(remark.createdAt)}</span>
                  </div>
                  <div className="remark-modal-item__text">{remark.text}</div>
                </div>
                <span className={`remark-badge ${remark.status === "reviewed" ? "remark-badge--reviewed" : "remark-badge--new"}`}>{remark.status === "reviewed" ? "Reviewed" : "New"}</span>
              </div>
            ))}
          </div>

          <div className={`remark-detail-panel ${isLoader ? "remark-detail-panel--loader" : ""}`}>
            <div className="remark-detail-header">
              <div className="remark-detail-author">
                <div className="remark-modal-avatar"><User size={24} /></div>
                <div>
                  <strong style={{ fontSize: "16px", color: "var(--navy-900)", display: "block" }}>
                    {active.author?.name ?? roleLabel(active.actorRole)} · {roleLabel(active.actorRole)}
                  </strong>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Raised {stamp(active.createdAt)}{active.stop ? ` at ${active.stop.outletName} · stop ${active.stop.sequence}` : " · whole route"}
                  </span>
                </div>
              </div>
              <span className={`remark-badge ${active.status === "reviewed" ? "remark-badge--reviewed" : "remark-badge--new"}`}>{active.status === "reviewed" ? "Reviewed" : "New"}</span>
            </div>

            <div className="remark-detail-quote">&ldquo;{active.text}&rdquo;</div>

            {isLoader ? <LoaderExceptionReview decisions={decisions} remark={active} setDecision={setDecision} /> : null}

            {active.status === "reviewed" ? (
              <div className="remark-notice-group">
                <label>Dispatcher response · {stamp(active.reviewedAt)}</label>
                <p style={{ margin: 0 }}>{active.reviewResponse}</p>
                {active.notice ? <p className="mute" style={{ fontSize: 12 }}>Notice sent {stamp(active.notice.sentAt)} to {active.notice.recipientIds.map((id) => nameOf(id)?.name ?? "a crew member").join(", ")}.</p> : <p className="mute" style={{ fontSize: 12 }}>No notice was sent.</p>}
              </div>
            ) : (
              <>
                <div className="remark-notice-group">
                  <label>Notice to the Driver{driver ? ` · ${driver.name}` : ""}</label>
                  <textarea className="remark-textarea" onChange={(event) => setNoticeById((prev) => ({ ...prev, [active.id]: event.target.value }))} placeholder="Write a notice to the driver..." value={notice} />
                </div>

                <div className="remark-notify-row">
                  <span>Also notify:</span>
                  {extraIds.map((id) => (
                    <span className="notify-chip" key={id}>
                      {nameOf(id) ? `${roleLabel(nameOf(id)!.role)} · ${nameOf(id)!.name}` : id}
                      <button aria-label="Remove recipient" onClick={() => setExtraById((prev) => ({ ...prev, [active.id]: extraIds.filter((other) => other !== id) }))} style={{ marginLeft: 6 }} type="button">×</button>
                    </span>
                  ))}
                  {adding ? (
                    <select autoFocus onChange={(event) => { if (event.target.value) setExtraById((prev) => ({ ...prev, [active.id]: [...extraIds, event.target.value] })); setAdding(false) }} value="">
                      <option value="">Choose a person…</option>
                      {addable.map((person) => <option key={person.id} value={person.id}>{roleLabel(person.role)} · {person.name}{person.outletId ? ` (${person.outletId})` : ""}</option>)}
                    </select>
                  ) : (
                    <button className="notify-add-btn" disabled={addable.length === 0} onClick={() => setAdding(true)} type="button">+ Add</button>
                  )}
                </div>

                {error ? <p role="alert" style={{ color: "var(--critical-500)" }}>{error}</p> : null}

                <div className="remark-action-buttons">
                  <Button disabled={busy} icon={Send} onClick={() => void review(true)} variant="primary">Send notice &amp; mark reviewed</Button>
                  <Button disabled={busy} onClick={() => void review(false)} variant="secondary">Mark reviewed only</Button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="remarks-modal-footer">
          <span>{reviewedCount} of {remarks.length} reviewed · Accept route unlocks when all are reviewed</span>
          <Button onClick={onClose} variant="secondary">Done</Button>
        </div>
      </section>
    </div>
  )
}
