import { Schema, model } from "mongoose"

/**
 * Canonical counter document.
 *
 * _id is the sequence name (e.g. "order", "trip").
 * seq is the last allocated sequence number.
 *
 * IMPORTANT: Do NOT call Counter.findOneAndUpdate() anywhere except
 * CounterCommandPort.getNextSequence(). All other modules must go through
 * the command port.
 */
export interface ICounter {
  _id: string   // sequence name
  seq: number   // last allocated value
}

const counterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0, min: 0 },
  },
  {
    _id: false,        // suppress Mongoose's ObjectId — _id IS the sequence name
    versionKey: false, // no __v needed
    collection: "counters",
  },
)

export const Counter = model<ICounter>("Counter", counterSchema)
