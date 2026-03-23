import { lazy, type LazyExoticComponent, type ComponentType } from 'react';

type RouteConfig = {
  path: string;
  label: string;
  component: LazyExoticComponent<ComponentType>;
};

// ─── CHAQUE PERSONNE AJOUTE SA LIGNE ICI ─────────────────────────────────────
export const routes: RouteConfig[] = [
  // { path: '/feature-a', label: 'Feature A', component: lazy(() => import('./pages/FeatureA')) },
  // { path: '/feature-b', label: 'Feature B', component: lazy(() => import('./pages/FeatureB')) },
];
// ─────────────────────────────────────────────────────────────────────────────
