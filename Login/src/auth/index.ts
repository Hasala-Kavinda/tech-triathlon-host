import { realApi } from "./api"
import { mockApi } from "./mockApi"

export const authApi = import.meta.env.VITE_USE_MOCK_AUTH === "true" ? mockApi : realApi
