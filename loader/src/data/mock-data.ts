import type { WorkCardState } from "../types/loader";
import type { LoadItemData } from "../types/loader"

export type LoadTiming = {
  receivedAt: number
  departureAt: number
  finalVariance?: number
}

export type LoadCase = {
  tripId?: string
  version?: number
  departure: string
  items: number
  priority: "normal" | "urgent"
  route: string
  state: WorkCardState
  stops: number
  vehicle: string
  weight: string
  timing: LoadTiming
}

export type ActiveStop = {
  deliveryWindow: string
  items: LoadItemData[]
  orderId: string
  outlet: string
  stopNumber: number
}

const now = Date.now()

export const initialLoadCases: LoadCase[] = [
  {
    departure: "04:30",
    items: 23,
    priority: "normal",
    route: "Colombo North",
    state: "available",
    stops: 6,
    vehicle: "WP-CAB-4821",
    weight: "1,260 kg",
    timing: {
      receivedAt: now - 30 * 60 * 1000,
      departureAt: now + 12 * 60 * 1000 + 15 * 1000, // 12:15 left
    },
  },
  {
    departure: "05:00",
    items: 16,
    priority: "urgent",
    route: "Kandy → Matale",
    state: "available",
    stops: 4,
    vehicle: "WP-LOR-7731",
    weight: "840 kg",
    timing: {
      receivedAt: now - 15 * 60 * 1000,
      departureAt: now + 42 * 1000, // 00:42 left
    },
  },
  {
    departure: "05:15",
    items: 18,
    priority: "normal",
    route: "Colombo Central",
    state: "available",
    stops: 5,
    vehicle: "WP-VAN-2917",
    weight: "620 kg",
    timing: {
      receivedAt: now - 5 * 60 * 1000,
      departureAt: now + 27 * 60 * 1000 + 31 * 1000, // 27:31 left
    },
  },
  {
    departure: "05:25",
    items: 14,
    priority: "normal",
    route: "Negombo Coast",
    state: "unavailable",
    stops: 4,
    vehicle: "WP-CAB-5184",
    weight: "710 kg",
    timing: {
      receivedAt: now,
      departureAt: now + 35 * 60 * 1000, // 35:00 left
    },
  },
  {
    departure: "04:15",
    items: 12,
    priority: "normal",
    route: "Galle Fort",
    state: "completed-other",
    stops: 3,
    vehicle: "WP-LOR-8921",
    weight: "450 kg",
    timing: {
      receivedAt: now - 60 * 60 * 1000,
      departureAt: now - 15 * 60 * 1000,
      finalVariance: 10 * 60 * 1000, // finished 10 mins early
    },
  },
]

export const initialStops: ActiveStop[] = [
  {
    stopNumber: 6,
    outlet: "MegaStore",
    deliveryWindow: "05:00",
    orderId: "ORD-48291",
    items: [
      {
        id: "48291-chicken",
        name: "Chicken (Frozen)",
        quantity: "20 kg",
        status: "loaded",
      },
      {
        id: "48291-milk",
        name: "Milk (Fresh)",
        quantity: "40 L",
        status: "loaded",
      },
      {
        id: "48291-eggs",
        name: "Eggs",
        quantity: "10 trays",
        status: "pending",
      },
      {
        id: "48291-vegetables",
        name: "Frozen vegetables",
        quantity: "12 cartons",
        status: "loaded",
      },
    ],
  },
  {
    stopNumber: 5,
    outlet: "TechWorld",
    deliveryWindow: "05:25",
    orderId: "ORD-48307",
    items: [
      {
        id: "48307-displays",
        name: "42-inch displays",
        quantity: "4 units",
        status: "loaded",
      },
      {
        id: "48307-routers",
        name: "Wi-Fi routers",
        quantity: "8 units",
        status: "pending",
      },
      {
        id: "48307-cables",
        name: "HDMI cables",
        quantity: "24 units",
        status: "loaded",
      },
      {
        id: "48307-mounts",
        name: "Display wall mounts",
        quantity: "4 units",
        status: "loaded",
      },
    ],
  },
  {
    stopNumber: 4,
    outlet: "CityStyle",
    deliveryWindow: "05:50",
    orderId: "ORD-48322",
    items: [
      {
        id: "48322-shirts",
        name: "Men's shirts",
        quantity: "6 cartons",
        status: "loaded",
      },
      {
        id: "48322-dresses",
        name: "Summer dresses",
        quantity: "4 cartons",
        status: "loaded",
      },
      {
        id: "48322-footwear",
        name: "Footwear",
        quantity: "5 cartons",
        status: "pending",
      },
      {
        id: "48322-accessories",
        name: "Accessories",
        quantity: "2 cartons",
        status: "loaded",
      },
    ],
  },
  {
    stopNumber: 3,
    outlet: "FreshMart North",
    deliveryWindow: "06:10",
    orderId: "ORD-48338",
    items: [
      {
        id: "48338-produce",
        name: "Fresh produce",
        quantity: "18 crates",
        status: "loaded",
      },
      {
        id: "48338-yoghurt",
        name: "Yoghurt",
        quantity: "6 trays",
        status: "loaded",
      },
      {
        id: "48338-dairy",
        name: "Dairy crates",
        quantity: "4 crates",
        status: "flagged",
        exception: {
          affectedQuantity: 1,
          pendingSync: false,
          reason: "Damaged before loading",
          type: "damaged",
          unit: "crates",
        },
      },
      {
        id: "48338-bakery",
        name: "Bakery selection",
        quantity: "8 trays",
        status: "pending",
      },
    ],
  },
  {
    stopNumber: 2,
    outlet: "Green Basket",
    deliveryWindow: "06:35",
    orderId: "ORD-48354",
    items: [
      {
        id: "48354-rice",
        name: "Rice",
        quantity: "20 bags",
        status: "loaded",
      },
      {
        id: "48354-pulses",
        name: "Pulses",
        quantity: "12 cartons",
        status: "loaded",
      },
      {
        id: "48354-oil",
        name: "Cooking oil",
        quantity: "10 cartons",
        status: "pending",
      },
      {
        id: "48354-spices",
        name: "Spice packs",
        quantity: "6 cartons",
        status: "loaded",
      },
    ],
  },
  {
    stopNumber: 1,
    outlet: "Colombo Fresh",
    deliveryWindow: "07:00",
    orderId: "ORD-48369",
    items: [
      {
        id: "48369-fruit",
        name: "Fresh fruit",
        quantity: "16 crates",
        status: "flagged",
        exception: {
          affectedQuantity: 3,
          pendingSync: false,
          reason: "Damaged during handling",
          type: "damaged",
          unit: "crates",
        },
      },
      {
        id: "48369-juice",
        name: "Chilled juice",
        quantity: "8 trays",
        status: "flagged",
        exception: {
          affectedQuantity: 2,
          pendingSync: false,
          reason: "Short quantity",
          type: "missing",
          unit: "trays",
        },
      },
      {
        id: "48369-water",
        name: "Bottled water",
        quantity: "10 cartons",
        status: "pending",
      },
    ],
  },
]
