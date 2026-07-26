/**
 * Deployment-Kontext.
 *
 * Vercel setzt `VERCEL_ENV` auf 'production' | 'preview' | 'development'.
 * Nur die echte Produktion darf indexiert werden: jede Preview läuft auf einer
 * eigenen Domain mit identischem Inhalt, und eine indexierte Preview
 * konkurriert als Duplicate Content mit der Produktionsseite — bei 269
 * generierten Landingpages ist das kein Randfall.
 */

export type DeploymentEnv = 'production' | 'preview' | 'development';

export function deploymentEnv(): DeploymentEnv {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === 'preview' || vercelEnv === 'development') return vercelEnv;
  if (vercelEnv === 'production') return 'production';
  // Außerhalb von Vercel (Docker auf dem eigenen Server) entscheidet NODE_ENV.
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

/** Nur `true`, wenn Suchmaschinen diesen Stand tatsächlich sehen sollen. */
export function isIndexable(): boolean {
  return deploymentEnv() === 'production';
}

export const isPreview = () => deploymentEnv() === 'preview';
