import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import { Outlet, MapViewState } from '../state/routeContext';
import { DriverPosition, GpsStatus } from '../state/driverContext';
import { createOutletDivIcon, getOutletZIndex } from './OutletPin';
import { haversineMeters } from '../utils/geo';

export interface NavMapProps {
  outlets: Outlet[];
  selectedOutletId: string | null;
  onSelectOutlet: (outletId: string) => void;
  driverPosition: DriverPosition | null;
  gpsStatus: GpsStatus;
  mapView: MapViewState | null;
  onSaveMapView: (view: MapViewState) => void;
  bottomCardHeight: number;
  recenterTrigger: number;
  isOffline?: boolean;
}

export const NavMap: React.FC<NavMapProps> = ({
  outlets,
  selectedOutletId,
  onSelectOutlet,
  driverPosition,
  gpsStatus,
  mapView,
  onSaveMapView,
  bottomCardHeight,
  recenterTrigger,
  isOffline = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const isInitializedRef = useRef(false);

  // Layers refs
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylinesLayerRef = useRef<L.LayerGroup | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const driverAccuracyRef = useRef<L.Circle | null>(null);
  const driverDashLineRef = useRef<L.Polyline | null>(null);

  // Up next outlet (in_progress or first pending)
  const upNextOutlet = useMemo(() => {
    return outlets.find((o) => o.status === 'in_progress') || outlets.find((o) => o.status === 'pending') || null;
  }, [outlets]);

  // Compute fit bounds with padding
  const fitRouteBounds = useCallback(
    (animate = true) => {
      const map = mapRef.current;
      if (!map) return;

      const validOutlets = outlets.filter((o) => o.lat != null && o.lng != null);
      if (validOutlets.length === 0) return;

      const latLngs: L.LatLngTuple[] = validOutlets.map((o) => [o.lat!, o.lng!]);

      // If driver position within 50 km of first outlet, include in bounds
      if (driverPosition) {
        const dMeters = haversineMeters(driverPosition, {
          lat: validOutlets[0].lat!,
          lng: validOutlets[0].lng!
        });
        if (dMeters <= 50000) {
          latLngs.push([driverPosition.lat, driverPosition.lng]);
        }
      }

      const bounds = L.latLngBounds(latLngs);
      const topPadding = 72; // below RoutePill and RecenterButton
      const sidePadding = 32;
      const bottomPadding = Math.max(bottomCardHeight + 32, 160);

      map.fitBounds(bounds, {
        paddingTopLeft: [sidePadding, topPadding],
        paddingBottomRight: [sidePadding, bottomPadding],
        animate,
        duration: animate ? 0.25 : undefined,
        maxZoom: 16
      });
    },
    [outlets, driverPosition, bottomCardHeight]
  );

  // 1. Initialize Map exactly once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Default center around Kandy
    const defaultCenter: L.LatLngTuple = mapView ? mapView.center : [7.2906, 80.6337];
    const defaultZoom = mapView ? mapView.zoom : 12;

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      minZoom: 8,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      doubleClickZoom: false,
      touchZoom: true,
      dragging: true,
      bounceAtZoomLimits: true
    });

    // Custom attribution only (remove leaflet prefix & flag)
    const attribution = L.control.attribution({
      prefix: false,
      position: 'bottomright'
    });
    attribution.addAttribution('&copy; OpenStreetMap contributors');
    attribution.addTo(map);

    // Tiles: OpenStreetMap standard tiles (CSS filters applied in tokens.css)
    if (!isOffline) {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        keepBuffer: 2,
        updateWhenIdle: true,
        maxZoom: 18
      }).addTo(map);
    }

    // Layer groups
    const polylinesGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);
    polylinesLayerRef.current = polylinesGroup;
    markersLayerRef.current = markersGroup;
    mapRef.current = map;

    // Track map state when moved or zoomed
    const handleMoveEnd = () => {
      const center = map.getCenter();
      onSaveMapView({
        center: [center.lat, center.lng],
        zoom: map.getZoom(),
        selectedOutletId: selectedOutletId
      });
    };
    map.on('moveend', handleMoveEnd);

    // First paint fitBounds if no saved mapView
    requestAnimationFrame(() => {
      map.invalidateSize();
      if (!mapView && !isInitializedRef.current) {
        fitRouteBounds(false);
        isInitializedRef.current = true;
      }
    });

    // VisualViewport & window resize handlers for no map glitches
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      map.off('moveend', handleMoveEnd);
      map.remove();
      mapRef.current = null;
    };
  }, []); // Run once on mount

  // 2. Handle Recenter trigger
  useEffect(() => {
    if (recenterTrigger > 0 && mapRef.current) {
      fitRouteBounds(true);
    }
  }, [recenterTrigger, fitRouteBounds]);

  // 3. Update Route Polylines
  useEffect(() => {
    const group = polylinesLayerRef.current;
    if (!group) return;
    group.clearLayers();

    const sorted = [...outlets]
      .filter((o) => o.lat != null && o.lng != null)
      .sort((a, b) => (a.visitOrder ?? 0) - (b.visitOrder ?? 0));

    if (sorted.length < 2) return;

    // Segment lines joining outlets in visit order
    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to = sorted[i + 1];
      const isSegmentDone = to.status === 'completed';

      const polyline = L.polyline(
        [
          [from.lat!, from.lng!],
          [to.lat!, to.lng!]
        ],
        {
          color: isSegmentDone ? 'var(--text-secondary)' : 'var(--action)',
          opacity: isSegmentDone ? 0.5 : 0.9,
          weight: 3,
          lineCap: 'round',
          lineJoin: 'round'
        }
      );
      polyline.addTo(group);
    }
  }, [outlets]);

  // 4. Update Outlet Pins
  useEffect(() => {
    const group = markersLayerRef.current;
    const map = mapRef.current;
    if (!group || !map) return;
    group.clearLayers();

    outlets.forEach((outlet) => {
      if (outlet.lat == null || outlet.lng == null) return;

      const isSelected = outlet.id === selectedOutletId;
      const icon = createOutletDivIcon(outlet, isSelected);
      const zIndex = getOutletZIndex(outlet, isSelected);

      const marker = L.marker([outlet.lat, outlet.lng], {
        icon,
        zIndexOffset: zIndex
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectOutlet(outlet.id);

        // Gentle pan if marker is under card or top overlay
        const mapSize = map.getSize();
        const pt = map.latLngToContainerPoint([outlet.lat!, outlet.lng!]);
        const cardTopY = mapSize.y - bottomCardHeight;

        if (pt.y > cardTopY - 40 || pt.y < 80) {
          map.panTo([outlet.lat!, outlet.lng!], {
            animate: true,
            duration: 0.25
          });
        }
      });

      marker.addTo(group);
    });
  }, [outlets, selectedOutletId, onSelectOutlet, bottomCardHeight]);

  // 5. Driver Location marker & accuracy circle (updated with setLatLng without map re-renders)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (gpsStatus !== 'on' || !driverPosition) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
      if (driverAccuracyRef.current) {
        driverAccuracyRef.current.remove();
        driverAccuracyRef.current = null;
      }
      if (driverDashLineRef.current) {
        driverDashLineRef.current.remove();
        driverDashLineRef.current = null;
      }
      return;
    }

    const driverLatLng: L.LatLngTuple = [driverPosition.lat, driverPosition.lng];

    // Accuracy Circle
    const radius = Math.max(driverPosition.accuracyMeters || 15, 12);
    if (!driverAccuracyRef.current) {
      driverAccuracyRef.current = L.circle(driverLatLng, {
        radius,
        stroke: false,
        fillColor: 'var(--action)',
        fillOpacity: 0.12,
        interactive: false
      }).addTo(map);
    } else {
      driverAccuracyRef.current.setLatLng(driverLatLng);
      driverAccuracyRef.current.setRadius(radius);
    }

    // Driver 16px Dot with 3px surface ring
    if (!driverMarkerRef.current) {
      const driverIcon = L.divIcon({
        className: 'driver-location-marker',
        html: `
          <div style="width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
            <div style="width: 16px; height: 16px; border-radius: 50%; background-color: var(--action); border: 3px solid var(--surface); box-shadow: 0 1px 4px rgba(0,0,0,0.25);"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      driverMarkerRef.current = L.marker(driverLatLng, {
        icon: driverIcon,
        zIndexOffset: 1200,
        interactive: false
      }).addTo(map);
    } else {
      driverMarkerRef.current.setLatLng(driverLatLng);
    }

    // Driver-to-next dashed line (2px, 6px dash/gap, accent at 60% opacity)
    if (upNextOutlet && upNextOutlet.lat != null && upNextOutlet.lng != null) {
      const targetLatLng: L.LatLngTuple = [upNextOutlet.lat, upNextOutlet.lng];
      if (!driverDashLineRef.current) {
        driverDashLineRef.current = L.polyline([driverLatLng, targetLatLng], {
          color: 'var(--action)',
          weight: 2,
          opacity: 0.6,
          dashArray: '6, 6',
          interactive: false
        }).addTo(map);
      } else {
        driverDashLineRef.current.setLatLngs([driverLatLng, targetLatLng]);
      }
    } else if (driverDashLineRef.current) {
      driverDashLineRef.current.remove();
      driverDashLineRef.current = null;
    }
  }, [driverPosition, gpsStatus, upNextOutlet]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg)',
        touchAction: 'none'
      }}
      className="w-full h-full relative select-none"
    />
  );
};
