'use client';

/**
 * NewsCard Component
 * Displays a single news item with military flagging and category badges
 */

import { NewsItem, MapFeature } from '@/types';

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  military: { bg: 'bg-red-900/40', text: 'text-red-400', label: '⚔️ Military' },
  security: { bg: 'bg-orange-900/40', text: 'text-orange-400', label: '🛡️ Security' },
  politics: { bg: 'bg-purple-900/40', text: 'text-purple-400', label: '🏛️ Politics' },
  economy: { bg: 'bg-green-900/40', text: 'text-green-400', label: '💰 Economy' },
  general: { bg: 'bg-blue-900/40', text: 'text-blue-400', label: '📰 General' },
};

interface Props {
  item: NewsItem | MapFeature;
  onClick?: () => void;
  isSelected?: boolean;
  compact?: boolean;
}

function isNewsItem(item: NewsItem | MapFeature): item is NewsItem {
  return 'description' in item;
}

export default function NewsCard({ item, onClick, isSelected, compact = false }: Props) {
  const catStyle = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.general;
  const timeAgo = getTimeAgo(item.publishedAt);
  const url = 'url' in item ? item.url : '#';

  return (
    <div
      onClick={onClick}
      className={`
        rounded-xl border transition-all duration-200 cursor-pointer
        ${isSelected
          ? 'border-blue-500 bg-blue-950/40 shadow-lg shadow-blue-500/20'
          : 'border-gray-700/50 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
        }
        ${item.isMilitary ? 'border-l-4 border-l-red-500' : ''}
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catStyle.bg} ${catStyle.text}`}>
            {catStyle.label}
          </span>
          {item.isMilitary && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/60 text-red-300 font-bold animate-pulse">
              🚨 ALERT
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">{timeAgo}</span>
      </div>

      {/* Title */}
      <h3 className={`font-semibold text-white leading-tight mb-2 ${compact ? 'text-sm' : 'text-base'}`}>
        {item.title}
      </h3>

      {/* Description (full items only) */}
      {!compact && isNewsItem(item) && item.description && (
        <p className="text-sm text-gray-400 leading-relaxed mb-3 line-clamp-2">
          {item.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>📡 {item.source}</span>
          {item.location && (
            <span>📍 {item.location.name}</span>
          )}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-blue-400 hover:text-blue-300 hover:underline whitespace-nowrap"
        >
          Read →
        </a>
      </div>

      {/* Military keywords */}
      {!compact && 'militaryKeywords' in item && item.militaryKeywords && item.militaryKeywords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.militaryKeywords.slice(0, 5).map((kw: string) => (
            <span key={kw} className="text-xs px-1.5 py-0.5 bg-red-950/50 text-red-400 rounded">
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
