import { useAuth } from "@/auth/AuthContext"

interface PlaceholderPageProps {
  navigate: (path: string) => void
}

const ROLE_LABELS: Record<string, { title: string; color: string; bg: string }> = {
  dispatcher: { title: "Dispatcher Dashboard", color: "#14549c", bg: "#d3e1f2" },
  loader:     { title: "Loader Panel", color: "#0e7c5b", bg: "#d1f0e5" },
  driver:     { title: "Driver View", color: "#7c3aed", bg: "#ede9fe" },
  store_manager: { title: "Store Manager Portal", color: "#b45309", bg: "#fef3c7" },
}

export function PlaceholderPage({ navigate }: PlaceholderPageProps) {
  const { user, signOut } = useAuth()
  const meta = ROLE_LABELS[user?.role ?? "dispatcher"]

  async function handleSignOut() {
    await signOut()
    navigate("/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
      <div className="text-center max-w-sm px-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl font-bold"
          style={{ backgroundColor: meta.bg, color: meta.color, fontFamily: "var(--font-poppins)" }}
        >
          {user?.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "var(--font-poppins)", color: "#0e3f78" }}
        >
          {meta.title}
        </h1>
        <p className="text-sm mb-1" style={{ color: "#6b7280" }}>
          Signed in as <strong style={{ color: "#374151" }}>{user?.name}</strong>
        </p>
        <p className="text-xs mb-8" style={{ fontFamily: "var(--font-mono)", color: "#9ca3af" }}>
          {user?.employeeId}
        </p>
        <button
          onClick={handleSignOut}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#14549c" }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
