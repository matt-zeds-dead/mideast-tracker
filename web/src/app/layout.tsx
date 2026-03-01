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
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }} className="bg-gray-950 text-white">
        {children}
      </body>
    </html>
  );
}
