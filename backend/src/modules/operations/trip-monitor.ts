import { DeliveryRecord, LoadRecord, Trip, TripLocation } from "../../database/models/index.js"
import { notFound } from "../../common/errors.js"
import { UserReadPort } from "../auth/user.read-port.js"
import { RemarkReadPort } from "../audit/remark.read-port.js"
import { OutletReadPort } from "../reference/outlet.read-port.js"
import { nearLabel, trackingState } from "./tracking.js"

type Contact = { id: string; employeeId: string; name: string; role: string; outletId?: string; phoneE164: string | null }

const toContact = (user: { _id: unknown; employeeId: string; name: string; role: string; outletId?: string; phoneE164?: string }): Contact => ({
  id: String(user._id),
  employeeId: user.employeeId,
  name: user.name,
  role: user.role,
  ...(user.outletId ? { outletId: user.outletId } : {}),
  phoneE164: user.phoneE164 ?? null,
})

const TERMINAL = new Set(["delivered", "failed"])

/** A stop's display state, from its real delivery record (the trip's embedded stop status is not advanced). */
function stopState(record: { status: string; outcome?: string | null } | undefined) {
  if (!record) return "planned"
  if (record.status === "pending") return "planned"
  if (record.status === "arrived") return "arrived"
  if (record.status === "failed" || record.outcome === "failed" || record.outcome === "refused" || record.outcome === "closed") return "failed"
  return "delivered"
}

/**
 * Everything the Dispatcher's Route monitoring page shows for one trip, joined from real collections:
 * trip + stops + delivery records + outlets, crew (driver, claiming loader, per-stop store managers),
 * latest tracked position, load summary and every remark with its linked load-record exception data.
 * The same payload is returned for planned, in-transit and completed trips.
 */
export async function buildTripMonitor(tripId: string) {
  const trip = await Trip.findById(tripId).lean()
  if (!trip) throw notFound()
  const id = String(trip._id)
  const outletIds = [...new Set(trip.stops.map((stop) => stop.outletId))]
  const [deliveries, loadRecord, outlets, latest, remarks, managers] = await Promise.all([
    DeliveryRecord.find({ tripId: trip._id }).lean(),
    LoadRecord.findOne({ tripId: trip._id }).lean(),
    OutletReadPort.findManyByOutletIds(outletIds),
    TripLocation.findOne({ tripId: trip._id }).sort({ recordedAt: -1 }).lean(),
    RemarkReadPort.findByTrip(id),
    UserReadPort.findStoreManagersByOutlets(outletIds),
  ])
  const crewIds = [String(trip.claimedByDriverId ?? trip.driverId), ...(loadRecord?.claimedBy ? [String(loadRecord.claimedBy)] : []), ...remarks.map((remark) => String(remark.actorId))]
  const people = await UserReadPort.findContactsByIds([...new Set(crewIds)])
  const personById = new Map(people.map((user) => [String(user._id), toContact(user)]))
  const driver = personById.get(String(trip.claimedByDriverId ?? trip.driverId)) ?? null
  const loaders = loadRecord?.claimedBy ? [personById.get(String(loadRecord.claimedBy))].filter((person): person is Contact => Boolean(person)) : []

  const outletById = new Map(outlets.map((outlet) => [outlet.outletId, outlet]))
  const deliveryByStop = new Map(deliveries.map((record) => [String(record.tripStopId), record]))
  const managerByOutlet = new Map<string, Contact>()
  for (const manager of managers) if (manager.outletId && !managerByOutlet.has(manager.outletId)) managerByOutlet.set(manager.outletId, toContact(manager))

  const ordered = [...trip.stops].sort((a, b) => a.sequence - b.sequence)
  let nextTripStopId: string | null = null
  const stops = ordered.map((stop) => {
    const record = deliveryByStop.get(String(stop.tripStopId))
    const state = stopState(record)
    if (!nextTripStopId && !TERMINAL.has(state) && trip.status !== "completed") nextTripStopId = String(stop.tripStopId)
    const outlet = outletById.get(stop.outletId)
    return {
      tripStopId: String(stop.tripStopId),
      sequence: stop.sequence,
      outletId: stop.outletId,
      outletName: outlet?.displayName ?? stop.outletId,
      district: outlet?.district ?? null,
      plannedArrivalAt: stop.plannedArrivalAt ?? null,
      state,
      deliveryId: record ? String(record._id) : null,
      arrivedAt: record?.arrivedAt ?? null,
      completedAt: record?.completedAt ?? null,
      outcome: record?.outcome ?? null,
      timingResult: record?.timingResult ?? null,
      receiptStatus: record && (record.status === "receipt_confirmed" || record.status === "receipt_issue") ? record.status : null,
      manager: managerByOutlet.get(stop.outletId) ?? null,
    }
  })
  const done = stops.filter((stop) => TERMINAL.has(stop.state)).length
  const nextStop = stops.find((stop) => stop.tripStopId === nextTripStopId)

  const ageSeconds = latest ? Math.max(0, Math.floor((Date.now() - latest.recordedAt.getTime()) / 1000)) : null
  const position = latest ? { latitude: latest.location.coordinates[1]!, longitude: latest.location.coordinates[0]! } : null
  const tracking = {
    state: trackingState(trip.status, ageSeconds),
    lastSeenSecondsAgo: ageSeconds,
    recordedAt: latest?.recordedAt ?? null,
    latitude: position?.latitude ?? null,
    longitude: position?.longitude ?? null,
    speedKmh: latest?.speed == null ? null : Math.round(latest.speed * 3.6),
    nearLabel: nearLabel(position, outlets.map((outlet) => ({ district: outlet.district, coordinates: outlet.coordinates?.latitude != null && outlet.coordinates?.longitude != null ? { latitude: outlet.coordinates.latitude, longitude: outlet.coordinates.longitude } : undefined })), nextStop?.district),
  }

  const items = loadRecord?.items ?? []
  const load = loadRecord
    ? {
        status: loadRecord.status,
        vehicleId: trip.vehicleId,
        depot: loadRecord.depot,
        claimedAt: loadRecord.claimedAt ?? null,
        confirmedAt: loadRecord.confirmedAt ?? null,
        totalItems: items.length,
        loadedItems: items.filter((item) => item.status === "loaded").length,
        flaggedItems: items.filter((item) => item.exception).length,
      }
    : null

  const stopBySequence = new Map(stops.map((stop) => [stop.tripStopId, stop]))
  const remarkRows = remarks.map((remark) => {
    const stop = remark.stopId ? stopBySequence.get(String(remark.stopId)) : undefined
    const author = personById.get(String(remark.actorId))
    const flagged = items
      .filter((item) => item.exception && (remark.itemId ? item.itemId === remark.itemId : remark.stopId ? String(item.tripStopId) === String(remark.stopId) : false))
      .map((item) => ({ itemId: item.itemId, sku: item.sku, name: item.name, expectedQuantity: item.expectedQuantity, loadedQuantity: item.loadedQuantity, type: item.exception!.type, quantity: item.exception!.quantity, reasonCode: item.exception!.reasonCode, note: item.exception!.note ?? null }))
    return {
      id: String(remark._id),
      text: remark.text,
      status: remark.status,
      actorRole: remark.actorRole,
      author: author ? { id: author.id, name: author.name, role: author.role, phoneE164: author.phoneE164 } : null,
      createdAt: remark.createdAt,
      stop: stop ? { tripStopId: stop.tripStopId, sequence: stop.sequence, outletName: stop.outletName, outletId: stop.outletId } : null,
      reviewedAt: remark.reviewedAt ?? null,
      reviewResponse: remark.reviewResponse ?? null,
      notice: remark.notice ? { text: remark.notice.text, sentAt: remark.notice.sentAt, recipientIds: remark.notice.recipientIds.map(String) } : null,
      // Linked loader-exception data, joined by load_records.items[].itemId (or tripStopId) -- never guessed.
      loadException: flagged.length && load ? { vehicleId: load.vehicleId, depot: load.depot, loaded: load.loadedItems, flagged: load.flaggedItems, total: load.totalItems, confirmedAt: load.confirmedAt, items: flagged } : null,
    }
  })

  return {
    trip: {
      id,
      tripNumber: trip.tripNumber,
      serviceDate: trip.serviceDate,
      vehicleId: trip.vehicleId,
      depot: trip.depot,
      status: trip.status,
      departureAt: trip.departureAt,
      startedAt: trip.startedAt ?? null,
      completedAt: trip.completedAt ?? null,
      plannedEndAt: trip.plannedEndAt ?? null,
      acceptedAt: trip.acceptedAt ?? null,
    },
    stops,
    progress: { done, total: stops.length, nextTripStopId },
    crew: { driver, loaders },
    tracking,
    load,
    remarks: remarkRows,
    pendingRemarks: remarkRows.filter((remark) => remark.status === "pending").length,
    // People a notice can be addressed to: this trip's driver, loader and the store managers on its stops.
    recipients: [driver, ...loaders, ...stops.flatMap((stop) => (stop.manager ? [stop.manager] : []))].filter((person, index, all): person is Contact => Boolean(person) && all.findIndex((other) => other?.id === person?.id) === index),
  }
}
