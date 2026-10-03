
export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}
export function formatQuantity(amount: number, unit: string) {
  return `${amount} ${amount === 1 ? unit.replace(/s$/, "") : unit}`
}
export function parseExpectedQuantity(quantity: string) {
  const match = quantity.match(/^(\d+(?:\.\d+)?)\s*(.*)$/)
  return {
    amount: match ? Number(match[1]) : 1,
    unit: match?.[2] || "item",
  }
}
