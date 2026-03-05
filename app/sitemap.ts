import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://turtletalk.io';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: APP_URL, priority: 1.0, changeFrequency: 'monthly' },
    { url: `${APP_URL}/talk`, priority: 0.9, changeFrequency: 'monthly' },
    { url: `${APP_URL}/missions`, priority: 0.7, changeFrequency: 'weekly' },
    { url: `${APP_URL}/appreciation`, priority: 0.6, changeFrequency: 'weekly' },
    { url: `${APP_URL}/appreciation/wish-list`, priority: 0.5, changeFrequency: 'weekly' },
    { url: `${APP_URL}/journals`, priority: 0.5, changeFrequency: 'weekly' },
    { url: `${APP_URL}/messages`, priority: 0.5, changeFrequency: 'weekly' },
  ];
}
