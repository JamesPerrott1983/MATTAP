import { useEffect, useRef } from 'react';
import Globe, { type GlobeInstance } from 'globe.gl';
import { MeshPhongMaterial } from 'three';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import landTopo from '../data/land-110m.json';
import type { LatLng } from '../types';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface GlobeView {
  lat: number;
  lng: number;
  altitude: number;
  transitionMs: number;
  /** Changing the key re-applies the view even if coords are identical. */
  key: string;
}

interface GlobeMapProps {
  /** Marker for the player's (pending or submitted) guess. */
  guess: LatLng | null;
  /** Marker for the revealed correct location, with its display label. */
  correct: (LatLng & { label: string }) | null;
  /** Draw the connecting arc between guess and correct location. */
  showArc: boolean;
  /** Whether taps should place a guess right now. */
  interactive: boolean;
  /** Slow idle rotation (start screen). */
  autoRotate: boolean;
  /** Camera command; applied whenever `key` changes. */
  view: GlobeView | null;
  onTap: (coords: LatLng) => void;
}

/* ------------------------------------------------------------------ */
/* Static land polygons (bundled — no network requests needed)         */
/* ------------------------------------------------------------------ */

const topology = landTopo as unknown as Topology<{ land: GeometryCollection }>;
const landFeatures = (
  topojson.feature(topology, topology.objects.land) as unknown as {
    features?: object[];
  }
).features ?? [topojson.feature(topology, topology.objects.land)];

/* ------------------------------------------------------------------ */
/* Marker elements                                                     */
/* ------------------------------------------------------------------ */

interface MarkerDatum {
  lat: number;
  lng: number;
  kind: 'guess' | 'correct';
  label: string;
}

/** Distinct shapes as well as colours, for accessibility (spec 7.1). */
function createMarkerElement(d: MarkerDatum): HTMLElement {
  const el = document.createElement('div');
  el.className = `globe-marker globe-marker--${d.kind}`;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', d.label);
  if (d.kind === 'guess') {
    // Circular crosshair pin for the player's guess.
    el.innerHTML = `
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <circle cx="17" cy="17" r="10" fill="rgba(45,125,210,0.28)" stroke="#7cc0ff" stroke-width="2.5"/>
        <circle cx="17" cy="17" r="3.2" fill="#ffffff"/>
      </svg>
      <span class="globe-marker__label">${d.label}</span>`;
  } else {
    // Teardrop map pin for the correct MAT site.
    el.innerHTML = `
      <svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">
        <path d="M17 2C9.3 2 3 8.3 3 16c0 10.5 14 26 14 26s14-15.5 14-26C31 8.3 24.7 2 17 2z"
              fill="#34c77b" stroke="#0a1428" stroke-width="2"/>
        <circle cx="17" cy="16" r="5.5" fill="#0a1428"/>
      </svg>
      <span class="globe-marker__label globe-marker__label--correct">${d.label}</span>`;
  }
  return el;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function GlobeMap({
  guess,
  correct,
  showArc,
  interactive,
  autoRotate,
  view,
  onTap,
}: GlobeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const interactiveRef = useRef(interactive);
  const onTapRef = useRef(onTap);
  const appliedViewKey = useRef<string | null>(null);

  interactiveRef.current = interactive;
  onTapRef.current = onTap;

  /* One-time initialisation */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const globe = new Globe(container)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#2d7dd2')
      .atmosphereAltitude(0.18)
      .showGraticules(true)
      .polygonsData(landFeatures)
      .polygonCapColor(() => '#1c3d63')
      .polygonSideColor(() => 'rgba(0,0,0,0)')
      .polygonStrokeColor(() => '#3f6da0')
      .polygonAltitude(0.006)
      .onGlobeClick((coords) => {
        if (interactiveRef.current) onTapRef.current(coords);
      })
      .onPolygonClick((_poly, _ev, coords) => {
        // Land polygons sit above the sphere, so forward their taps too.
        if (interactiveRef.current) onTapRef.current({ lat: coords.lat, lng: coords.lng });
      })
      .htmlElement((d) => createMarkerElement(d as MarkerDatum))
      .htmlAltitude(0.01)
      .htmlElementVisibilityModifier((el, isVisible) => {
        el.style.opacity = isVisible ? '1' : '0';
      })
      .arcColor(() => '#ffd166')
      .arcStroke(0.55)
      .arcAltitudeAutoScale(0.35)
      .arcDashLength(0.35)
      .arcDashGap(0.15)
      .arcDashAnimateTime(reducedMotion ? 0 : 1600)
      .pointOfView({ lat: 25, lng: 5, altitude: 2.2 }, 0);

    // Deep-navy sphere instead of a satellite texture: crisp, on-brand and
    // fully offline-capable.
    globe.globeMaterial(new MeshPhongMaterial({ color: '#0d1f38', transparent: false }));

    const controls = globe.controls();
    controls.autoRotateSpeed = 0.55;
    controls.enablePan = false;
    controls.minDistance = 130;
    controls.maxDistance = 480;

    globeRef.current = globe;

    const resize = () => {
      globe.width(container.clientWidth);
      globe.height(container.clientHeight);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      globe._destructor();
      globeRef.current = null;
    };
  }, []);

  /* Auto-rotate (disabled under prefers-reduced-motion) */
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    globe.controls().autoRotate = autoRotate && !reducedMotion;
  }, [autoRotate]);

  /* Markers */
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const markers: MarkerDatum[] = [];
    if (guess) markers.push({ lat: guess.lat, lng: guess.lng, kind: 'guess', label: 'Your guess' });
    if (correct) {
      markers.push({ lat: correct.lat, lng: correct.lng, kind: 'correct', label: correct.label });
    }
    globe.htmlElementsData(markers);
  }, [guess, correct]);

  /* Connecting arc */
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    if (showArc && guess && correct) {
      globe.arcsData([
        { startLat: guess.lat, startLng: guess.lng, endLat: correct.lat, endLng: correct.lng },
      ]);
    } else {
      globe.arcsData([]);
    }
  }, [showArc, guess, correct]);

  /* Camera commands */
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !view || appliedViewKey.current === view.key) return;
    appliedViewKey.current = view.key;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    globe.pointOfView(
      { lat: view.lat, lng: view.lng, altitude: view.altitude },
      reducedMotion ? 0 : view.transitionMs,
    );
  }, [view]);

  return <div ref={containerRef} className="globe-container" data-testid="globe-map" />;
}

/* ------------------------------------------------------------------ */
/* View helpers (exported for reuse by App)                            */
/* ------------------------------------------------------------------ */

/** Midpoint of two coordinates, handling the antimeridian (date line). */
export function midpoint(a: LatLng, b: LatLng): LatLng {
  let lngB = b.lng;
  if (Math.abs(b.lng - a.lng) > 180) {
    lngB = b.lng > a.lng ? b.lng - 360 : b.lng + 360;
  }
  let lng = (a.lng + lngB) / 2;
  if (lng > 180) lng -= 360;
  if (lng < -180) lng += 360;
  return { lat: (a.lat + b.lat) / 2, lng };
}

/** Camera altitude that keeps two points `distanceKm` apart both visible. */
export function altitudeForDistance(distanceKm: number): number {
  const alt = 0.5 + (distanceKm / 20000) * 3.2;
  return Math.min(2.6, Math.max(0.7, alt));
}
