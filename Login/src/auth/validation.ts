export const isEmployeeId = (v: string) => /^[A-Z]{3}-\d{4}$/.test(v.trim().toUpperCase())
export const isNic = (v: string) => /^(\d{9}[VvXx]|\d{12})$/.test(v.trim())
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
export const isLocalPhone = (v: string) => /^7\d{8}$/.test(v.replace(/\s/g, ""))
export const isOtp = (v: string) => /^\d{6}$/.test(v)
export const toE164 = (local: string) => `+94${local.replace(/\s/g, "")}`
    