import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export default function SearchBar({ placeholder = "商品名やJANコードで検索...", compact = false }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // 遅延検索を実装
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // APIを呼び出して検索候補を取得
        const response = await fetch(`/api/search-suggestions?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error('検索候補の取得に失敗しました:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    window.location.href = `/search?q=${encodeURIComponent(suggestion)}`;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleInputFocus = () => {
    if (query.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // クリックイベントが先に発生するように少し遅延させる
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  return (
    <div className={`relative ${compact ? 'w-full' : 'max-w-2xl w-full'}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              compact
                ? 'px-10 py-2 text-sm'
                : 'px-12 py-4 text-lg'
            } ${loading ? 'pr-10' : ''}`}
            autoComplete="off"
            aria-label="検索"
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
          />

          {/* 検索アイコン */}
          <Search
            className={`absolute left-${compact ? '3' : '4'} top-1/2 transform -translate-y-1/2 text-gray-400 ${
              compact ? 'w-4 h-4' : 'w-5 h-5'
            }`}
          />

          {/* ローディングアイコン */}
          {loading && (
            <Loader2 className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin`} />
          )}

          {/* クリアボタン */}
          {!loading && query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 ${
              compact ? 'w-4 h-4' : 'w-5 h-5'
            }`}
              aria-label="検索をクリア"
            >
              <X />
            </button>
          )}
        </div>

        {/* 検索ボタン (compactモードの場合は非表示) */}
        {!compact && (
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            disabled={!query.trim()}
          >
            検索
          </button>
        )}
      </form>

      {/* 検索候補ドロップダウン */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
              <span className="text-gray-500">検索候補を読み込み中...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <ul role="listbox" className="py-2">
              {suggestions.map((suggestion, index) => (
                <li key={index} role="option">
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center justify-between group"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center space-x-3">
                      <Search className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{suggestion.text}</span>
                    </div>
                    {suggestion.category && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {suggestion.category}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : query.length >= 2 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>検索候補が見つかりませんでした</p>
            </div>
          ) : null}
        </div>
      )}

      {/* 履歴表示 (デモ用) */}
      {showSuggestions && query.length < 2 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">最近の検索</h3>
          </div>
          <ul className="py-2">
            {['iPhone 15 Pro', 'Sony ヘッドホン', 'Nintendo Switch'].map((historyItem, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => handleSuggestionClick(historyItem)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center space-x-3 group"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-900">{historyItem}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
