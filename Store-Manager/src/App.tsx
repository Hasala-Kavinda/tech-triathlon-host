import { useEffect, useState, useRef, type ReactNode } from "react"
import { getCatalogue, submitStoreOrder, storeDeliveryApi, type StoreDelivery } from "./api/store"
import { AnimatePresence, motion, useMotionValue, animate, useTransform } from "motion/react"
import wayTrackLogo from "./assets/waytrack-logo.png"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Box,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  Home,
  Menu,
  Minus,
  PackageCheck,
  PackageOpen,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Snowflake,
  LoaderCircle,
  Truck,
  UserRound,
  X,
  KeyRound,
  LogOut,
} from "lucide-react"
import { TopBar, BottomNavigation } from "./components/layout/TopBar"
import { getDefaultOrderType } from "./lib/utils"
import { DeliveriesPage } from "./pages/DeliveriesPage"
import { HomePage } from "./pages/HomePage"
import { NewOrderPage } from "./pages/NewOrderPage"
import { OrderConfirmationPage } from "./pages/OrderConfirmationPage"
import { OrderDetailPage } from "./pages/OrderDetailPage"
import { OrdersPage } from "./pages/OrdersPage"
import { ReceiptFlowPage } from "./pages/ReceiptFlowPage"
import { ReviewOrderPage } from "./pages/ReviewOrderPage"
import {  OrderType, OrderDrafts, OrderDetailState, ReceiptFlowState, CatalogProduct, StatusKind  } from './types/store'
import { mockDrafts, calmSpring } from './lib/constants';

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const prototypeState = params.get("state")
  const prototypeView = params.get("view")
  const initialBusiness = (params.get("business") as "fresh" | "style" | "tech") || "fresh"
  const [business, setBusiness] = useState<"fresh" | "style" | "tech">(initialBusiness)
  const showAttention = prototypeState !== "no-attention"
  const afterCutoff = prototypeState === "after-cutoff"
  const showUpcoming = prototypeState !== "no-upcoming"
  const initialOrderType: OrderType =
    prototypeState === "chilled" ? "chilled" : "dry"
  const [orderType, setOrderType] = useState<OrderType>(initialOrderType)

  function handleBusinessChange(newBusiness: "fresh" | "style" | "tech") {
    setBusiness(newBusiness)
    setOrderType(getDefaultOrderType(newBusiness))
  }
  const [drafts, setDrafts] = useState<OrderDrafts>(prototypeState === "empty" ? { dry: {}, chilled: {}, products: {} } as unknown as OrderDrafts : mockDrafts[business])

  useEffect(() => {
    if (prototypeState !== "empty") {
      setDrafts(mockDrafts[business])
    }
  }, [business])
  const [view, setView] =
    useState<"home" | "orders" | "deliveries" | "new-order" | "review" | "confirmation" | "order-detail" | "deferred-detail" | "verify-delivery">(
      prototypeView === "new-order" ||
        prototypeView === "orders" ||
        prototypeView === "deliveries" ||
        prototypeView === "review" ||
        prototypeView === "confirmation" ||
        prototypeView === "order-detail" ||
        prototypeView === "verify-delivery"
        ? (prototypeView as any)
        : "home",
    )
  const getBottomNavTab = (v: string) => {
    if (v === "home" || v === "new-order" || v === "review" || v === "confirmation") return "Home"
    if (v === "orders" || v === "order-detail" ) return "Orders"
    if (v === "deliveries" || v === "verify-delivery") return "Deliveries"
    return "Home"
  }
  const currentNav = getBottomNavTab(view)
  const initialOrderDetailState: OrderDetailState =
    prototypeState === "scheduled" ||
    prototypeState === "on-way" ||
    prototypeState === "arrived" ||
    prototypeState === "awaiting-confirmation" ||
    prototypeState === "receipt-confirmed" ||
    prototypeState === "receipt-issue"
      ? prototypeState
      : "confirmed"
  const [orderDetailState, setOrderDetailState] = useState<OrderDetailState>(
    initialOrderDetailState,
  )

  const initialReceiptState: ReceiptFlowState =
    prototypeState === "full"
      ? "full"
      : prototypeState === "issue-edit"
        ? "issue-edit"
        : prototypeState === "issue-review"
          ? "issue-review"
          : prototypeState === "receipt-confirmed"
            ? "confirmed"
            : prototypeState === "receipt-confirmed-issue"
              ? "confirmed-issue"
              : "verify"
  const [receiptFlowState, setReceiptFlowState] =
    useState<ReceiptFlowState>(initialReceiptState)
  const [selectedOrderId, setSelectedOrderId] = useState<string>("ORD-1082")

  
    function handleOpenOrder(id: string, nextView: string, state: string) {
    setSelectedOrderId(id)
    if (state) {
      if (nextView === "order-detail") setOrderDetailState(state as OrderDetailState)
      if (nextView === "verify-delivery") setReceiptFlowState(state as ReceiptFlowState)
    }
    setView(nextView as any)
  }

  
  const directionRef = useRef(0)
  const viewIndex = { home: 0, orders: 1, deliveries: 2 }
  const pageVariants = {
    enter: (direction: number) => ({ x: direction * 24, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction * -24, opacity: 0 })
  }

  function navigate(label: string) {
    const nextView = label.toLowerCase() as "home" | "orders" | "deliveries"
    const currentIndex = (viewIndex as any)[view] ?? 0
    const nextIndex = viewIndex[nextView] ?? 0
    if (nextIndex !== currentIndex) {
      directionRef.current = nextIndex > currentIndex ? 1 : -1
    }
    setView(nextView)
  }

  const mainContentRef = useRef<HTMLElement>(null)


  useEffect(() => {
    // Desktop window scroll
    window.scrollTo(0, 0)
    // Mobile flex shell scroll
    mainContentRef.current?.scrollTo({ top: 0, behavior: "auto" })
  }, [view])

  return (
    <div className="app-shell">
      <div className="app-area">
        <TopBar business={business} current={currentNav} onNavigate={navigate} afterCutoff={prototypeState === "after-cutoff" || prototypeState === "full"} />
        <main className="main-content" ref={mainContentRef}>
          <AnimatePresence mode="wait" initial={false} custom={directionRef.current}>
          {view === "home" && (
            <motion.div key="home" custom={directionRef.current} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: "easeOut" }}>
              <HomePage
                business={business}
                onBusinessChange={handleBusinessChange}
                showAttention={showAttention}
                afterCutoff={afterCutoff}
                showUpcoming={showUpcoming}
                onNewOrder={() => setView("new-order")}
                onOpenDeferred={() => {
                  setOrderDetailState("deferred")
                  setView("order-detail")
                }}
                onOpenOrder={handleOpenOrder}
                onNavigate={navigate}
              />
            </motion.div>
          )}
          {view === "orders" && (
            <motion.div key="orders" custom={directionRef.current} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: "easeOut" }}>
              <OrdersPage business={business}
                  onNewOrder={() => setView("new-order")}
                  onOpenOrder={handleOpenOrder}
                />
            </motion.div>
          )}

          {view === "deliveries" && (
            <motion.div key="deliveries" custom={directionRef.current} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22, ease: "easeOut" }}>
              <DeliveriesPage business={business} 
                onOpenOrder={handleOpenOrder}
              />
            </motion.div>
          )}

          {view === "new-order" && (
            <motion.div
              key="new-order"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <NewOrderPage business={business}
                afterCutoff={afterCutoff}
                type={orderType}
                onTypeChange={setOrderType}
                quantities={drafts}
                onQuantitiesChange={setDrafts}
                initialSearch={prototypeState === "search" ? "Rice" : ""}
                initialSummaryOpen={prototypeState === "summary"}
                onReview={() => setView("review")}
              />
            </motion.div>
          )}

          {view === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <ReviewOrderPage business={business}
                type={orderType}
                quantities={drafts}
                afterCutoff={afterCutoff}
                forceError={prototypeState === "submit-error"}
                onBack={() => setView("new-order")}
                onConfirmed={() => setView("confirmation")}
              />
            </motion.div>
          )}

          {view === "confirmation" && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={calmSpring}
            >
              <OrderConfirmationPage business={business}
                type={orderType}
                quantities={drafts}
                afterCutoff={afterCutoff}
                onHome={() => setView("home")}
                onViewOrder={() => {
                  setOrderDetailState("confirmed")
                  setView("order-detail")
                }}
              />
            </motion.div>
          )}

          {view === "order-detail" && (
            <motion.div
              key="order-detail"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <OrderDetailPage
                orderId={selectedOrderId}
                business={business}
                onBusinessChange={handleBusinessChange}
                state={orderDetailState}
                onBack={() => setView("home")}
                onStateChange={setOrderDetailState}
                onOpenOrder={handleOpenOrder}
                onNavigateDeferred={() => {
                    setOrderDetailState("deferred"); setView("order-detail")
                  }}
                  onReviewDelivery={() => {
                  setReceiptFlowState("verify")
                  setView("verify-delivery")

                }}
              />
            </motion.div>
          )}

          

          {view === "verify-delivery" && (
            <motion.div
              key="verify-delivery"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <ReceiptFlowPage
                orderId={selectedOrderId}
                business={business}
                onBusinessChange={handleBusinessChange}
                state={receiptFlowState}
                onStateChange={setReceiptFlowState}
                onBack={() => {
                  setOrderDetailState("awaiting-confirmation")
                  setView("order-detail")
                }}
                onHome={() => setView("home")}
                onOpenOrder={handleOpenOrder}
                onViewOrder={(withIssue) => {
                  setOrderDetailState(
                    withIssue ? "receipt-issue" : "receipt-confirmed",
                  )
                  setView("order-detail")
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </main>
      </div>
      <BottomNavigation current={currentNav} onNavigate={navigate} />
    </div>
  )
}
