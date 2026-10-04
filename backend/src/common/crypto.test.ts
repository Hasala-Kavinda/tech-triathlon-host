import { describe, expect, it } from "vitest"
import { stableHash } from "./crypto.js"

describe("stableHash", () => {
  it("is independent of object key insertion order", () => {
    expect(stableHash({ b: 2, a: { y: 2, x: 1 } })).toBe(stableHash({ a: { x: 1, y: 2 }, b: 2 }))
  })

  it("detects changes inside nested arrays", () => {
    expect(stableHash({ items: [{ id: "A", quantity: 1 }] })).not.toBe(stableHash({ items: [{ id: "A", quantity: 2 }] }))
  })
})
