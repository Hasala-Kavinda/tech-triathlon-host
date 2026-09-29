import type { ReactNode } from "react"
import waytracLogo from "@/assets/waytrack-logo.png"

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left blue panel */}
      <div
        className="relative flex flex-col md:w-[480px] md:min-h-screen shrink-0"
        style={{ backgroundColor: "#14549c" }}
      >
        {/* Logo */}
        <div className="p-8 pb-0">
          <div className="flex items-center gap-3">
            <img
              src={waytracLogo}
              alt="WayTrack logo"
              className="w-11 h-11 rounded-xl object-cover shrink-0"
            />
            <span
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-poppins)", color: "#f6c022" }}
            >
              WayTrack
            </span>
          </div>
        </div>

        {/* Body copy */}
        <div className="flex-1 flex flex-col justify-center px-10 py-12">
          <h2
            className="text-3xl font-bold leading-snug text-white mb-4"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            Welcome to the delivery planning system for{" "}
            <span style={{ color: "#f6c022" }}>Waypoint Group.</span>
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.75)" }}>
            Waypoint Group (Pvt) Ltd is a Sri Lankan retail group with three brands sharing one distribution network.
          </p>

          {/* Role chips */}
          <div className="flex flex-wrap gap-2">
            {["Dispatcher", "Loader", "Driver", "Store manager"].map((role) => (
              <span
                key={role}
                className="text-sm px-4 py-1.5 rounded-full text-white"
                style={{ border: "1.5px solid rgba(255,255,255,0.45)", fontFamily: "var(--font-inter)" }}
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        {/* Footer copyright */}
        <div className="px-10 pb-6 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
          © 2026 Waypoint Group (Pvt) Ltd
        </div>

        {/* Yellow bottom stripe */}
        <div className="h-1.5 w-full" style={{ backgroundColor: "#f6c022" }} />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>
    </div>
  )
}
