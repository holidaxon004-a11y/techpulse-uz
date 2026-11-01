import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://techpulse.uz';
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/catalog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/pc-builder`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },
    { url: `${baseUrl}/cart`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/profile`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ];
}

