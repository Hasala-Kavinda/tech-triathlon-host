import { AlertTriangle, Hammer, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatQuantity, parseExpectedQuantity } from "../../lib/utils";
import type { ExceptionType, LoadItemData, LoadItemException } from "../../types/loader";
import { Button } from "../ui/Button";
import { StatusPill } from "../ui/StatusPill";
import { Text } from "../ui/Text";

export const missingReasons = ["Stock unavailable", "Short quantity", "Cannot locate"]
export const damagedReasons = [
  "Damaged during handling",
  "Damaged before loading",
  "Packaging damaged",
]
export function ExceptionSheet({
  isOffline,
  item,
  onClose,
  onSave,
}: {
  isOffline: boolean
  item: LoadItemData
  onClose: () => void
  onSave: (exception: LoadItemException) => void
}) {
  const expected = parseExpectedQuantity(item.quantity)
  const [type, setType] = useState<ExceptionType | null>(
    item.exception?.type ?? null,
  )
  const [affectedQuantityStr, setAffectedQuantityStr] = useState<string>(
    String(item.exception?.affectedQuantity ?? expected.amount),
  )
  const [reason, setReason] = useState(item.exception?.reason ?? "")
  const [note, setNote] = useState(item.exception?.note ?? "")
  const [quantityError, setQuantityError] = useState<string | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  // Pin onClose in a ref so the overflow-lock effect never re-fires just
  // because the parent re-created the callback reference.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    sheetRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      // Always restore, even if the component is forcibly unmounted.
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleKeyDown)
    }
  // Empty deps — runs once on mount, cleans up on unmount. Safe because
  // onClose is accessed through the stable ref above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reasons = type === "missing" ? missingReasons : damagedReasons
  const parsedQuantity = Number(affectedQuantityStr)
  const isQuantityValid =
    !isNaN(parsedQuantity) &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity > 0 &&
    parsedQuantity <= expected.amount

  const remaining = Math.max(expected.amount - (isNaN(parsedQuantity) ? 0 : parsedQuantity), 0)
  const canSave = Boolean(type && reason && isQuantityValid)

  function selectType(nextType: ExceptionType) {
    setType(nextType)
    setReason("")
    setQuantityError(null)
  }

  function changeQuantity(delta: number) {
    const current = Number(affectedQuantityStr)
    const val = (isNaN(current) || !Number.isInteger(current)) ? 0 : current
    const nextValue = val + delta
    if (nextValue <= 0) {
      setQuantityError(
        `Quantity must be greater than 0.`,
      )
      return
    }
    if (nextValue > expected.amount) {
      setQuantityError(
        `Quantity cannot exceed ${expected.amount} ${expected.unit}.`,
      )
      return
    }
    setAffectedQuantityStr(String(nextValue))
    setQuantityError(null)
  }

  function handleQuantityInput(value: string) {
    setAffectedQuantityStr(value)
    const parsed = Number(value)
    if (isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      setQuantityError(`Quantity must be a positive integer.`)
    } else if (parsed > expected.amount) {
      setQuantityError(`Quantity cannot exceed ${expected.amount} ${expected.unit}.`)
    } else {
      setQuantityError(null)
    }
  }

  function handleSave() {
    if (!type || !canSave) return
    onSave({
      affectedQuantity: parsedQuantity,
      note: note.trim() || undefined,
      recordedOffline: isOffline,
      reason,
      type,
      unit: expected.unit,
    })
  }

  return (
    <div
      className="sheet-backdrop"
      onClick={(event) => {
        // Only close when the click originated AND ended on the backdrop itself
        // (not on a child element releasing a drag over the backdrop).
        if (event.target === event.currentTarget) onCloseRef.current()
      }}
    >
      <div
        aria-labelledby="exception-sheet-title"
        aria-modal="true"
        className="exception-sheet"
        ref={sheetRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="exception-sheet__handle" aria-hidden="true" />
        <div className="exception-sheet__header">
          <div>
            <Text variant="label">Flag item</Text>
            <Text as="h2" variant="h2" className="exception-sheet__title">
              <span id="exception-sheet-title">{item.name}</span>
            </Text>
            <Text variant="data">{item.quantity} expected</Text>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>

        <div className="exception-sheet__body">
          <section className="exception-form-section">
            <div className="exception-form-section__heading">
              <Text as="h3" variant="h3">
                What happened?
              </Text>
              <Text variant="caption">Choose one exception type.</Text>
            </div>
            <div className="exception-type-grid">
              <button
                aria-pressed={type === "missing"}
                className="exception-type-option"
                onClick={() => selectType("missing")}
                type="button"
              >
                <AlertTriangle aria-hidden="true" />
                <span>
                  <strong>Missing</strong>
                  <small>Expected goods are unavailable</small>
                </span>
              </button>
              <button
                aria-pressed={type === "damaged"}
                className="exception-type-option"
                onClick={() => selectType("damaged")}
                type="button"
              >
                <Hammer aria-hidden="true" />
                <span>
                  <strong>Damaged</strong>
                  <small>Goods cannot be loaded as expected</small>
                </span>
              </button>
            </div>
          </section>

          {type ? (
            <>
              <section className="exception-form-section">
                <div className="exception-form-section__heading">
                  <Text as="h3" variant="h3">
                    Quantity affected
                  </Text>
                  <Text variant="caption">
                    Expected · {expected.amount} {expected.unit}
                  </Text>
                </div>
                <div className="quantity-workspace">
                  <div className="quantity-stepper">
                    <button
                      aria-label={`Decrease ${type} quantity`}
                      onClick={() => changeQuantity(-1)}
                      type="button"
                    >
                      <Minus aria-hidden="true" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max={expected.amount}
                      value={affectedQuantityStr}
                      onChange={(e) => handleQuantityInput(e.target.value)}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: 'inherit',
                        outline: 'none'
                      }}
                      aria-label="Affected quantity"
                    />
                    <button
                      aria-label={`Increase ${type} quantity`}
                      onClick={() => changeQuantity(1)}
                      type="button"
                    >
                      <Plus aria-hidden="true" />
                    </button>
                  </div>
                  <div className="remaining-quantity">
                    <Text variant="caption">
                      {type === "missing"
                        ? "Remaining to load"
                        : "Remaining usable quantity"}
                    </Text>
                    <Text variant="data">
                      {formatQuantity(remaining, expected.unit)}
                    </Text>
                  </div>
                </div>
                {quantityError ? (
                  <Text variant="caption" className="field-error">
                    {quantityError}
                  </Text>
                ) : null}
              </section>

              <section className="exception-form-section exception-form-grid">
                <label className="field-group">
                  <Text as="span" variant="label">
                    Reason
                  </Text>
                  <select
                    onChange={(event) => setReason(event.target.value)}
                    value={reason}
                  >
                    <option value="">Select reason</option>
                    {reasons.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {!reason ? (
                    <Text variant="caption">A reason is required.</Text>
                  ) : null}
                </label>
                <label className="field-group">
                  <Text as="span" variant="label">
                    Additional note (optional)
                  </Text>
                  <textarea
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={
                      type === "missing"
                        ? "e.g. 2 trays unavailable at loading."
                        : "e.g. Packaging damaged before loading."
                    }
                    rows={3}
                    value={note}
                  />
                </label>
              </section>

              <section className="exception-summary">
                <div className="exception-summary__heading">
                  <div>
                    <Text variant="label">Exception summary</Text>
                    <Text variant="body-strong">
                      {item.name} · {item.quantity}
                    </Text>
                  </div>
                  <StatusPill
                    variant="changed"
                    label={type === "missing" ? "Missing" : "Damaged"}
                  />
                </div>
                <div className="exception-summary__details">
                  <div>
                    <Text variant="caption">Quantity affected</Text>
                    <Text variant="data">
                      {formatQuantity(isNaN(parsedQuantity) ? 0 : parsedQuantity, expected.unit)}
                    </Text>
                  </div>
                  <div>
                    <Text variant="caption">Reason</Text>
                    <Text variant="body-strong">
                      {reason || "Select a reason"}
                    </Text>
                  </div>
                  <div>
                    <Text variant="caption">Note</Text>
                    <Text variant="body">
                      {note.trim() || "No additional note"}
                    </Text>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>

        <div className="exception-sheet__footer">
          <div>
            {isOffline ? (
              <>
                <StatusPill
                  variant="offline"
                  label="Offline"
                />
                <Text variant="caption">
                  Connection required to save this exception.
                </Text>
              </>
            ) : (
              <Text variant="caption">
                Exception details become part of the shared delivery record.
              </Text>
            )}
          </div>
          <div className="exception-sheet__actions">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!canSave} size="large" onClick={handleSave}>
              Save exception
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
