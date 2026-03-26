import { lazy, type LazyExoticComponent, type ComponentType } from 'react';

type RouteConfig = {
  path: string;
  label: string;
  component: LazyExoticComponent<ComponentType>;
};

export const routes: RouteConfig[] = [
  { path: '/conformity',     label: 'Anomalies',   component: lazy(() => import('./pages/Conformity'))       },
  { path: '/conformity/:bugId', label: '',          component: lazy(() => import('./pages/ConformityDetail')) },
  { path: '/triage',         label: 'Bugs à trier', component: lazy(() => import('./pages/Triage'))           },
  { path: '/kpis',           label: 'KPIs',         component: lazy(() => import('./pages/Kpis'))             },
  { path: '/history',        label: 'Historique',   component: lazy(() => import('./pages/History'))          },
  { path: '/settings',       label: 'Paramètres',   component: lazy(() => import('./pages/Settings'))         },
];
