import { Check } from "lucide-react";

export function ReachMap({ packed }: { packed: boolean }) {
  return (
    <div className="map-wrap">
      <div
        className="reach-map"
        aria-label="Vehicle reach map from Galle to Matara"
      >
        <span className="map-label map-label--akuressa">
          Akuressa · out of reach
        </span>
        <span className="out-pin" />
        <span className="map-label map-label--depot">Galle depot</span>
        <span className="depot-pin" />
        <div className="reach-zone" />
        {packed ? <div className="route-line" /> : null}
        {[8, 25, 56, 70, 91].map((left) => (
          <span
            className={`shop-pin ${packed ? "shop-pin--covered" : ""}`}
            key={left}
            style={{ left: `${left}%` }}
          />
        ))}
        <span className="map-label map-label--weligama">Weligama</span>
        <span className="map-label map-label--matara">Matara</span>
      </div>
      <div className="shop-reach">
        <strong>{packed ? "Shops covered" : "Shops in reach"} · 5</strong>
        {[
          "Sunrise Mart",
          "Lanka Super Stores",
          "Coastal Traders",
          "Mirissa Mart",
          "Matara City Mart",
        ].map((shop) => (
          <span key={shop}>
            {packed ? <Check aria-hidden="true" size={17} /> : <i />} {shop}
          </span>
        ))}
        <p>Hill View Stores, Akuressa, is out of reach</p>
      </div>
    </div>
  )
}
