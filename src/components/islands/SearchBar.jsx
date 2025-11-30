import React, { useState, useEffect, useRef } from 'react';
import { Input, Chip, Spinner } from '@heroui/react';
import { Search, TrendingUp, Clock } from 'lucide-react';

const TRENDING_KEYWORDS = [
  'iPhone 15 Pro',
  'AirPods Pro',
  'PlayStation 5',
  'Nintendo Switch',
  'Sony WH-1000XM5',
];

const RECENT_SEARCHES = [
  'iPhone 15 Pro',
  'Sony ヘッドホン',
  'Nintendo Switch',
];

export default function SearchBar({ placeholder = "商品名やJANコードで検索...", compact = false }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

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

  const handleKeywordClick = (keyword) => {
    setQuery(keyword);
    window.location.href = `/search?q=${encodeURIComponent(keyword)}`;
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit}>
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onValueChange={setQuery}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          startContent={<Search className="w-4 h-4 text-gray-400" />}
          endContent={loading && <Spinner size="sm" />}
          classNames={{
            input: "text-sm",
            inputWrapper: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary focus-within:border-primary",
          }}
          size={compact ? "sm" : "md"}
        />
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-4">
              {/* Trending Keywords */}
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    トレンドワード
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TRENDING_KEYWORDS.map((keyword, index) => (
                    <Chip
                      key={index}
                      variant="flat"
                      color="primary"
                      size="sm"
                      className="cursor-pointer hover:bg-primary hover:text-white transition-colors"
                      onClick={() => handleKeywordClick(keyword)}
                    >
                      {keyword}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Recent Searches */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    最近の検索
                  </h3>
                </div>
                <ul className="space-y-1">
                  {RECENT_SEARCHES.map((item, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => handleSuggestionClick(item)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-3"
                      >
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">{item}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="sm" />
              <span className="ml-2 text-sm text-gray-500">検索候補を読み込み中...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="py-2">
              {suggestions.map((suggestion, index) => (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <Search className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{suggestion.text}</span>
                    </div>
                    {suggestion.category && (
                      <Chip size="sm" variant="flat" color="default">
                        {suggestion.category}
                      </Chip>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">検索候補が見つかりませんでした</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
