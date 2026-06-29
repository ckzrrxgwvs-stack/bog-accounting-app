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
  ogTitle: 'Pi Academy · learn the discipline behind the ledger',
  ogDescription:
    'A CPA practice room. Pick the competencies you want — AR, AP, GL and more — and build real, hands-on skill at your own pace.',
  ogImage: 'https://bog-accounting-v5.vercel.app/academy-og.png',
} as const;

export function useAcademyAppIcon() {
  useEffect(() => {
    const favicon = document.getElementById('app-favicon') as HTMLLinkElement | null;
    const appleIcon = document.getElementById('app-apple-icon') as HTMLLinkElement | null;
    const manifest = document.getElementById('app-manifest') as HTMLLinkElement | null;
    const themeColor = document.getElementById('app-theme-color') as HTMLMetaElement | null;
    const appleTitle = document.getElementById('app-apple-title') as HTMLMetaElement | null;

    // Open Graph / Twitter social-preview tags (by id, set in index.html)
    const ogTitle = document.getElementById('og-title') as HTMLMetaElement | null;
    const ogDescription = document.getElementById('og-description') as HTMLMetaElement | null;
    const ogImage = document.getElementById('og-image') as HTMLMetaElement | null;
    const twTitle = document.getElementById('twitter-title') as HTMLMetaElement | null;
    const twDescription = document.getElementById('twitter-description') as HTMLMetaElement | null;
    const twImage = document.getElementById('twitter-image') as HTMLMetaElement | null;

    const prev = {
      favicon: favicon?.getAttribute('href') ?? null,
      appleIcon: appleIcon?.getAttribute('href') ?? null,
      manifest: manifest?.getAttribute('href') ?? null,
      themeColor: themeColor?.getAttribute('content') ?? null,
      appleTitle: appleTitle?.getAttribute('content') ?? null,
      title: document.title,
      ogTitle: ogTitle?.getAttribute('content') ?? null,
      ogDescription: ogDescription?.getAttribute('content') ?? null,
      ogImage: ogImage?.getAttribute('content') ?? null,
      twTitle: twTitle?.getAttribute('content') ?? null,
      twDescription: twDescription?.getAttribute('content') ?? null,
      twImage: twImage?.getAttribute('content') ?? null,
    };

    if (favicon) favicon.setAttribute('href', ACADEMY.favicon);
    if (appleIcon) appleIcon.setAttribute('href', ACADEMY.appleIcon);
    if (manifest) manifest.setAttribute('href', ACADEMY.manifest);
    if (themeColor) themeColor.setAttribute('content', ACADEMY.themeColor);
    if (appleTitle) appleTitle.setAttribute('content', ACADEMY.appleTitle);
    document.title = ACADEMY.title;
    if (ogTitle) ogTitle.setAttribute('content', ACADEMY.ogTitle);
    if (ogDescription) ogDescription.setAttribute('content', ACADEMY.ogDescription);
    if (ogImage) ogImage.setAttribute('content', ACADEMY.ogImage);
    if (twTitle) twTitle.setAttribute('content', ACADEMY.ogTitle);
    if (twDescription) twDescription.setAttribute('content', ACADEMY.ogDescription);
    if (twImage) twImage.setAttribute('content', ACADEMY.ogImage);

    return () => {
      if (favicon && prev.favicon) favicon.setAttribute('href', prev.favicon);
      if (appleIcon && prev.appleIcon) appleIcon.setAttribute('href', prev.appleIcon);
      if (manifest && prev.manifest) manifest.setAttribute('href', prev.manifest);
      if (themeColor && prev.themeColor) themeColor.setAttribute('content', prev.themeColor);
      if (appleTitle && prev.appleTitle) appleTitle.setAttribute('content', prev.appleTitle);
      document.title = prev.title;
      if (ogTitle && prev.ogTitle) ogTitle.setAttribute('content', prev.ogTitle);
      if (ogDescription && prev.ogDescription) ogDescription.setAttribute('content', prev.ogDescription);
      if (ogImage && prev.ogImage) ogImage.setAttribute('content', prev.ogImage);
      if (twTitle && prev.twTitle) twTitle.setAttribute('content', prev.twTitle);
      if (twDescription && prev.twDescription) twDescription.setAttribute('content', prev.twDescription);
      if (twImage && prev.twImage) twImage.setAttribute('content', prev.twImage);
    };
  }, []);
}
