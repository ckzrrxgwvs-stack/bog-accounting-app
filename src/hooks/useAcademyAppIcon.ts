import { useEffect } from 'react';

/**
 * While mounted (i.e. on the Pi Academy route), swap the browser tab favicon,
 * apple-touch icon, web app manifest, theme color, and title to Pi Academy's
 * amber identity — so the tab and "Add to Home Screen" use the π mark. Restores
 * the BOG-Pi defaults on unmount. Head elements are tagged by id in index.html.
 */
const ACADEMY = {
  favicon: '/academy-icon.svg',
  appleIcon: '/academy-180.png',
  manifest: '/academy.webmanifest',
  themeColor: '#e8990f',
  appleTitle: 'Pi Academy',
  title: 'Pi Academy · CPA Practice',
} as const;

export function useAcademyAppIcon() {
  useEffect(() => {
    const favicon = document.getElementById('app-favicon') as HTMLLinkElement | null;
    const appleIcon = document.getElementById('app-apple-icon') as HTMLLinkElement | null;
    const manifest = document.getElementById('app-manifest') as HTMLLinkElement | null;
    const themeColor = document.getElementById('app-theme-color') as HTMLMetaElement | null;
    const appleTitle = document.getElementById('app-apple-title') as HTMLMetaElement | null;

    const prev = {
      favicon: favicon?.getAttribute('href') ?? null,
      appleIcon: appleIcon?.getAttribute('href') ?? null,
      manifest: manifest?.getAttribute('href') ?? null,
      themeColor: themeColor?.getAttribute('content') ?? null,
      appleTitle: appleTitle?.getAttribute('content') ?? null,
      title: document.title,
    };

    if (favicon) favicon.setAttribute('href', ACADEMY.favicon);
    if (appleIcon) appleIcon.setAttribute('href', ACADEMY.appleIcon);
    if (manifest) manifest.setAttribute('href', ACADEMY.manifest);
    if (themeColor) themeColor.setAttribute('content', ACADEMY.themeColor);
    if (appleTitle) appleTitle.setAttribute('content', ACADEMY.appleTitle);
    document.title = ACADEMY.title;

    return () => {
      if (favicon && prev.favicon) favicon.setAttribute('href', prev.favicon);
      if (appleIcon && prev.appleIcon) appleIcon.setAttribute('href', prev.appleIcon);
      if (manifest && prev.manifest) manifest.setAttribute('href', prev.manifest);
      if (themeColor && prev.themeColor) themeColor.setAttribute('content', prev.themeColor);
      if (appleTitle && prev.appleTitle) appleTitle.setAttribute('content', prev.appleTitle);
      document.title = prev.title;
    };
  }, []);
}
