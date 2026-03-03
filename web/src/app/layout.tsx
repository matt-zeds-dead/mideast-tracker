import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Gulf Watch — Real-time Middle East News Tracker',
  description: 'Real-time news, alerts, and satellite imagery for Dubai, Abu Dhabi, and the Middle East region.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }} className="bg-gray-950 text-white">
        {children}
      </body>
    </html>
  );
}
