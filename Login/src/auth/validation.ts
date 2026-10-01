export const isEmployeeId = (v: string) => /^[A-Z]{3}-\d{4}$/.test(v.trim().toUpperCase())
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
    
