import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useDriver } from '../state/driverContext';
import { useRoute } from '../state/routeContext';
import { TopBar } from '../components/TopBar';
import { Login } from '../pages/Login';
import { RouteDashboard } from '../pages/RouteDashboard';
import { MarketDetail } from '../pages/MarketDetail';
import { PinConfirmation } from '../pages/PinConfirmation';
import { MapNavigation } from '../pages/MapNavigation';
import { ShiftSummary } from '../pages/ShiftSummary';

export type RouteTransition = 'slide-forward' | 'slide-back' | 'fade' | 'none';

export interface RouterContextType {
  pathname: string;
  params: { [key: string]: string };
  returnTo: 'dashboard' | 'map';
  navigate: (
    to: string,
    options?: {
      replace?: boolean;
      transition?: RouteTransition;
      returnTo?: 'dashboard' | 'map';
    }
  ) => void;
  goBack: () => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const useRouter = (): RouterContextType => {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within AppRouter');
  return ctx;
};

// Route matcher utility
export const matchRoute = (
  pattern: string,
  pathname: string
): { matches: boolean; params: { [key: string]: string } } => {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return { matches: false, params: {} };
  }

  const params: { [key: string]: string } = {};

  for (let i = 0; i < patternParts.length; i++) {
    const pPart = patternParts[i];
    const uPart = pathParts[i];

    if (pPart.startsWith(':')) {
      const paramName = pPart.slice(1);
      params[paramName] = decodeURIComponent(uPart);
    } else if (pPart !== uPart) {
      return { matches: false, params: {} };
    }
  }

  return { matches: true, params };
};

export const AppRouter: React.FC<{ children?: ReactNode }> = () => {
  const { session } = useDriver();
  const { selectedRoute, selectedRouteId, routes, selectRoute } = useRoute();

  // Initial path from window.location or default '/'
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      return p && p !== '/' ? p : '/';
    }
    return '/';
  });

  const [returnTo, setReturnTo] = useState<'dashboard' | 'map'>('dashboard');
  const [transition, setTransition] = useState<RouteTransition>('none');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const historyStack = useRef<string[]>([pathname]);

  // Synchronize browser popstate (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const newPath = window.location.pathname || '/';
      setTransition('slide-back');
      setPathname(newPath);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback(
    (
      to: string,
      options?: {
        replace?: boolean;
        transition?: RouteTransition;
        returnTo?: 'dashboard' | 'map';
      }
    ) => {
      const targetPath = to.startsWith('/') ? to : `/${to}`;
      if (options?.returnTo) {
        setReturnTo(options.returnTo);
      }

      const chosenTransition =
        options?.transition || (options?.replace ? 'fade' : 'slide-forward');
      setTransition(chosenTransition);
      setIsTransitioning(true);

      if (options?.replace) {
        window.history.replaceState(null, '', targetPath);
        historyStack.current[historyStack.current.length - 1] = targetPath;
      } else {
        window.history.pushState(null, '', targetPath);
        historyStack.current.push(targetPath);
      }

      setPathname(targetPath);

      setTimeout(() => {
        setIsTransitioning(false);
      }, 260);
    },
    []
  );

  const goBack = useCallback(() => {
    if (historyStack.current.length > 1) {
      historyStack.current.pop();
      setTransition('slide-back');
      setIsTransitioning(true);
      window.history.back();
      setTimeout(() => {
        setIsTransitioning(false);
      }, 260);
    } else {
      navigate('/route', { replace: true, transition: 'slide-back' });
    }
  }, [navigate]);

  // ROUTE GUARDS (Section 5)
  useEffect(() => {
    // Guard 1: Not signed in -> Login Stage A (any route)
    if (!session.signedIn && pathname !== '/') {
      navigate('/', { replace: true, transition: 'fade' });
      return;
    }

    // Guard 2: No selectedRouteId or route not in_progress -> Login Stage B
    if (session.signedIn) {
      const isRouteOrSubRoute = pathname.startsWith('/route');
      const isSummaryRoute = pathname === '/route/summary';

      if (isRouteOrSubRoute && !isSummaryRoute) {
        if (!selectedRouteId || (selectedRoute && selectedRoute.status !== 'in_progress')) {
          navigate('/', { replace: true, transition: 'fade' });
          return;
        }
      }

      // Guard 3: /route/summary unless the route is completed -> /route
      if (isSummaryRoute) {
        if (!selectedRoute || selectedRoute.status !== 'completed') {
          navigate('/route', { replace: true, transition: 'fade' });
          return;
        }
      }

      // Guard 4: /route/outlet/:outletId validation
      const matchPin = matchRoute('/route/outlet/:outletId/pin', pathname);
      const matchOutlet = matchRoute('/route/outlet/:outletId', pathname);

      if (matchPin.matches) {
        const outId = matchPin.params.outletId;
        const outlet = selectedRoute?.outlets.find((o) => o.id === outId);
        if (!outlet) {
          navigate('/route', { replace: true, transition: 'fade' });
          return;
        }
        if (outlet.status === 'completed') {
          navigate('/route', { replace: true, transition: 'fade' });
          return;
        }
        // Guard 5: /pin while unpackingComplete is false -> Market Detail
        if (!outlet.unpackingComplete) {
          navigate(`/route/outlet/${outId}`, { replace: true, transition: 'fade' });
          return;
        }
      } else if (matchOutlet.matches) {
        const outId = matchOutlet.params.outletId;
        const outlet = selectedRoute?.outlets.find((o) => o.id === outId);
        if (!outlet) {
          navigate('/route', { replace: true, transition: 'fade' });
          return;
        }
        // A completed outlet can no longer be edited or opened -> /route
        if (outlet.status === 'completed') {
          navigate('/route', { replace: true, transition: 'fade' });
          return;
        }
      }
    }
  }, [session.signedIn, pathname, selectedRouteId, selectedRoute, navigate]);

  // TOPBAR LOGIC (Single Root TopBar per Section 1)
  const isPendingDashboard =
    pathname === '/route' &&
    selectedRoute &&
    selectedRoute.outlets.every((o) => o.status === 'pending');

  let topBarShowBack = false;
  let topBarOnBack: (() => void) | undefined = undefined;

  if (pathname === '/route') {
    // Back chevron shown ONLY while every outlet is still pending; returns to Login Stage B and clears selectedRouteId
    if (isPendingDashboard) {
      topBarShowBack = true;
      topBarOnBack = () => {
        selectRoute(0); // Clears selected route
        navigate('/', { transition: 'slide-back' });
      };
    } else {
      topBarShowBack = false;
    }
  } else if (pathname === '/route/map') {
    // Back chevron returns to /route
    topBarShowBack = true;
    topBarOnBack = () => {
      navigate('/route', { transition: 'slide-back' });
    };
  } else if (pathname === '/route/summary') {
    // Back is disabled on summary
    topBarShowBack = false;
  } else {
    const matchPin = matchRoute('/route/outlet/:outletId/pin', pathname);
    const matchOutlet = matchRoute('/route/outlet/:outletId', pathname);

    if (matchPin.matches) {
      // PIN screen back chevron returns to Market Detail
      topBarShowBack = true;
      topBarOnBack = () => {
        navigate(`/route/outlet/${matchPin.params.outletId}`, { transition: 'slide-back' });
      };
    } else if (matchOutlet.matches) {
      // Market Detail back chevron goes to returnTo ('dashboard' or 'map')
      topBarShowBack = true;
      topBarOnBack = () => {
        if (returnTo === 'map') {
          navigate('/route/map', { transition: 'slide-back' });
        } else {
          navigate('/route', { transition: 'slide-back' });
        }
      };
    }
  }

  // Active Screen Resolution
  let activeScreen: ReactNode = null;
  let routeParams: { [key: string]: string } = {};

  const matchPin = matchRoute('/route/outlet/:outletId/pin', pathname);
  const matchOutlet = matchRoute('/route/outlet/:outletId', pathname);

  if (pathname === '/') {
    activeScreen = <Login onSuccess={() => navigate('/route')} />;
  } else if (pathname === '/route') {
    activeScreen = (
      <RouteDashboard
        onOpenStop={(stopId) => {
          navigate(`/route/outlet/out-r2-${stopId}`, { returnTo: 'dashboard' });
        }}
        onNavigateTab={(tab) => {
          if (tab === 'map') navigate('/route/map');
          else if (tab === 'summary') navigate('/route/summary');
          else if (tab === 'route') navigate('/route');
        }}
        onBackToLogin={() => navigate('/', { transition: 'slide-back' })}
      />
    );
  } else if (pathname === '/route/map') {
    activeScreen = (
      <MapNavigation
        onBack={() => navigate('/route', { transition: 'slide-back' })}
        onOpenMarketDetail={(stopId) =>
          navigate(`/route/outlet/out-r2-${stopId}`, { returnTo: 'map' })
        }
        onFinishRoute={() => navigate('/route/summary')}
      />
    );
  } else if (pathname === '/route/summary') {
    activeScreen = (
      <ShiftSummary
        onClockOut={() => navigate('/', { replace: true })}
        onNavigateTab={(tab) => {
          if (tab === 'route') navigate('/route');
          else if (tab === 'map') navigate('/route/map');
        }}
        onBackToPlan={() => navigate('/', { transition: 'slide-back' })}
      />
    );
  } else if (matchPin.matches) {
    routeParams = matchPin.params;
    activeScreen = (
      <PinConfirmation
        onSuccess={() => navigate('/route', { replace: true })}
        onCancel={() => navigate(`/route/outlet/${routeParams.outletId}`, { transition: 'slide-back' })}
        onBack={() => navigate(`/route/outlet/${routeParams.outletId}`, { transition: 'slide-back' })}
      />
    );
  } else if (matchOutlet.matches) {
    routeParams = matchOutlet.params;
    activeScreen = (
      <MarketDetail
        returnTo={returnTo}
        onBack={() => {
          if (returnTo === 'map') navigate('/route/map', { transition: 'slide-back' });
          else navigate('/route', { transition: 'slide-back' });
        }}
        onProceedToPin={() =>
          navigate(`/route/outlet/${routeParams.outletId}/pin`)
        }
      />
    );
  } else {
    activeScreen = <Login onSuccess={() => navigate('/route')} />;
  }

  // Animation CSS styles based on transition and prefers-reduced-motion
  const transitionClass =
    transition === 'fade'
      ? 'animate-fade-in'
      : transition === 'slide-forward'
      ? 'animate-slide-in-right'
      : transition === 'slide-back'
      ? 'animate-slide-in-left'
      : '';

  return (
    <RouterContext.Provider
      value={{
        pathname,
        params: routeParams,
        returnTo,
        navigate,
        goBack
      }}
    >
      <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-[#0f1115] py-0 sm:py-6 selection:bg-primary-container">
        {/* Mobile Viewport Container (390px x 844px) with safe-area styling */}
        <div className="w-full max-w-[390px] h-[844px] max-h-[100dvh] sm:rounded-[36px] overflow-hidden shadow-2xl relative bg-bg border border-neutral-800 flex flex-col justify-between select-none">
          {/* ROOT TOPBAR: Rendered ONCE at the top. TopBar never animates per Section 8 */}
          <TopBar
            title="Fleet Logistics"
            showBackButton={topBarShowBack}
            onBack={topBarOnBack}
            isScrolled={false}
          />

          {/* SCREEN CONTENT AREA WITH TRANSITIONS */}
          <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
            <div
              key={pathname}
              className={`flex-1 min-h-0 flex flex-col w-full h-full ${transitionClass}`}
            >
              {activeScreen}
            </div>
          </div>
        </div>

        {/* Discreet Dev State Switcher Dock (?dev=1 / quick jump) */}
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900/90 text-neutral-300 rounded-full text-[11px] backdrop-blur-md border border-neutral-700 shadow-xl select-none">
          <span className="font-semibold text-neutral-400 uppercase tracking-wider text-[10px] mr-1">
            Flow:
          </span>
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className={`px-2 py-0.5 rounded-full transition-colors ${
              pathname === '/' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
            }`}
          >
            1. Login
          </button>
          <button
            type="button"
            onClick={() => navigate('/route', { replace: true })}
            className={`px-2 py-0.5 rounded-full transition-colors ${
              pathname === '/route' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
            }`}
          >
            2. Dashboard
          </button>
          <button
            type="button"
            onClick={() =>
              navigate('/route/outlet/out-r2-1', { replace: true, returnTo: 'dashboard' })
            }
            className={`px-2 py-0.5 rounded-full transition-colors ${
              pathname.includes('/outlet') && !pathname.includes('/pin')
                ? 'bg-primary text-white font-bold'
                : 'hover:bg-neutral-800'
            }`}
          >
            3. Detail
          </button>
          <button
            type="button"
            onClick={() =>
              navigate('/route/outlet/out-r2-1/pin', { replace: true, returnTo: 'dashboard' })
            }
            className={`px-2 py-0.5 rounded-full transition-colors ${
              pathname.includes('/pin') ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
            }`}
          >
            4. PIN
          </button>
          <button
            type="button"
            onClick={() => navigate('/route/map', { replace: true })}
            className={`px-2 py-0.5 rounded-full transition-colors ${
              pathname === '/route/map' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
            }`}
          >
            5. Map
          </button>
          <button
            type="button"
            onClick={() => navigate('/route/summary', { replace: true })}
            className={`px-2 py-0.5 rounded-full transition-colors ${
              pathname === '/route/summary'
                ? 'bg-primary text-white font-bold'
                : 'hover:bg-neutral-800'
            }`}
          >
            6. Summary
          </button>
        </div>
      </div>
    </RouterContext.Provider>
  );
};
