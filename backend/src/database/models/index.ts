import mongoose, { Schema, model } from "mongoose"

export { Counter } from "../persistence/counter.model.js"
export { ROLES, type Role, User } from "../../modules/auth/persistence/user.model.js"

export { Trip } from "../../modules/planning/persistence/trip.model.js"

export { LoadRecord } from "../../modules/loading/persistence/load-record.model.js"
export { DeliveryRecord } from "../../modules/delivery/persistence/delivery-record.model.js"
export { PinChallenge } from "../../modules/delivery/persistence/pin-challenge.model.js"
export { TripLocation } from "../../modules/delivery/persistence/trip-location.model.js"










export { OperationalEvent } from "../../modules/audit/persistence/operational-event.model.js"
export { MutationLedger } from "../../modules/audit/persistence/mutation-ledger.model.js"
export { FileAsset } from "../../modules/files/persistence/file-asset.model.js"

export function toPublicObject<T extends { toObject(): Record<string, unknown> }>(document: T) {
  const value = document.toObject()
  value.id = String(value._id)
  delete value._id
  return value
}

export { mongoose }
