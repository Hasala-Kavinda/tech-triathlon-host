import { Schema, type ClientSession } from "mongoose"

export const baseSchemaOptions = {
  timestamps: true,
  versionKey: "version",
  strict: "throw",
  optimisticConcurrency: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      if (ret._id) {
        ret.id = ret._id.toString()
      }
      delete ret._id
      // keep version explicitly
      return ret
    },
  },
}

export function createBaseSchema<T>(definition: any, options?: any) {
  return new Schema<T>(definition, { ...baseSchemaOptions, ...options })
}

export interface RepositoryOptions {
  session?: ClientSession
}
