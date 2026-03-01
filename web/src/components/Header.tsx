'use client';

/**
 * App Header with real-time connection status and alert count
 */

interface Props {
  connected: boolean;
  alertCount: number;
  onNotificationRequest: () => void;
}

export default function Header({ connected, alertCount, onNotificationRequest }: Props) {
  return (
    <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
      {/* Logo / Title */}
      <div className="flex items-center gap-3">
        <div className="text-2xl">🌍</div>
        <div>
          <h1 className="text-white font-bold text-lg leading-none">Gulf Watch</h1>
          <p className="text-gray-500 text-xs">Real-time Middle East News Tracker</p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Military alert badge */}
        {alertCount > 0 && (
          <div className="flex items-center gap-1.5 bg-red-900/40 border border-red-700/50 text-red-400 px-3 py-1.5 rounded-lg text-sm font-medium animate-pulse">
            <span>🚨</span>
            <span>{alertCount} Military Alert{alertCount !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Notification button */}
        <button
          onClick={onNotificationRequest}
          className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800"
          title="Enable notifications"
        >
          🔔
        </button>

        {/* Live status indicator */}
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className={`text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
            {connected ? 'LIVE' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}
