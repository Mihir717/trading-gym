import { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import { format } from 'date-fns';
import {
  BookOpen,
  Edit3,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Filter,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Predefined tags for quick selection
const PRESET_TAGS = [
  { name: 'breakout', color: 'blue' },
  { name: 'trend-follow', color: 'green' },
  { name: 'reversal', color: 'orange' },
  { name: 'support', color: 'purple' },
  { name: 'resistance', color: 'pink' },
  { name: 'momentum', color: 'cyan' },
  { name: 'scalp', color: 'yellow' },
  { name: 'swing', color: 'indigo' },
  { name: 'fomo', color: 'red' },
  { name: 'revenge-trade', color: 'red' },
  { name: 'planned', color: 'green' },
  { name: 'impulsive', color: 'orange' }
];

const TAG_COLORS = {
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  green: 'bg-green-500/20 text-green-300 border-green-500/30',
  orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  pink: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  indigo: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  red: 'bg-red-500/20 text-red-300 border-red-500/30',
  gray: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
};

function TradeJournal() {
  const closedTrades = useStore((state) => state.closedTrades);
  const [journalEntries, setJournalEntries] = useState(() => {
    // Load from localStorage
    try {
      const saved = localStorage.getItem('trading_gym_journal');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [editingTradeId, setEditingTradeId] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [expandedTrades, setExpandedTrades] = useState({});
  const [filterTag, setFilterTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Save journal entries to localStorage
  const saveJournal = (entries) => {
    setJournalEntries(entries);
    localStorage.setItem('trading_gym_journal', JSON.stringify(entries));
  };

  // Start editing a trade
  const startEditing = (trade) => {
    const entry = journalEntries[trade.id] || {};
    setEditingTradeId(trade.id);
    setEditNote(entry.notes || '');
    setEditTags(entry.tags || []);
  };

  // Save the current edit
  const saveEdit = () => {
    if (editingTradeId) {
      const newEntries = {
        ...journalEntries,
        [editingTradeId]: {
          notes: editNote,
          tags: editTags,
          updatedAt: Date.now()
        }
      };
      saveJournal(newEntries);
      setEditingTradeId(null);
      setEditNote('');
      setEditTags([]);
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingTradeId(null);
    setEditNote('');
    setEditTags([]);
  };

  // Toggle a tag
  const toggleTag = (tagName) => {
    if (editTags.includes(tagName)) {
      setEditTags(editTags.filter(t => t !== tagName));
    } else {
      setEditTags([...editTags, tagName]);
    }
  };

  // Toggle expanded state for a trade
  const toggleExpanded = (tradeId) => {
    setExpandedTrades(prev => ({
      ...prev,
      [tradeId]: !prev[tradeId]
    }));
  };

  // Get tag color
  const getTagColor = (tagName) => {
    const preset = PRESET_TAGS.find(t => t.name === tagName);
    return preset ? TAG_COLORS[preset.color] : TAG_COLORS.gray;
  };

  // Filter trades based on search and tag filter
  const filteredTrades = useMemo(() => {
    return closedTrades.filter(trade => {
      const entry = journalEntries[trade.id];

      // Tag filter
      if (filterTag && (!entry?.tags || !entry.tags.includes(filterTag))) {
        return false;
      }

      // Search filter (in notes)
      if (searchQuery && entry?.notes) {
        return entry.notes.toLowerCase().includes(searchQuery.toLowerCase());
      }

      if (searchQuery && !entry?.notes) {
        return false;
      }

      return true;
    });
  }, [closedTrades, journalEntries, filterTag, searchQuery]);

  // Get all unique tags used
  const usedTags = useMemo(() => {
    const tags = new Set();
    Object.values(journalEntries).forEach(entry => {
      (entry.tags || []).forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [journalEntries]);

  if (closedTrades.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{
          background: 'rgba(10, 10, 10, 0.9)',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}
      >
        <BookOpen className="w-12 h-12 mx-auto mb-4 text-purple-500 opacity-50" />
        <p className="text-gray-400">No trades to journal yet</p>
        <p className="text-gray-500 text-sm mt-2">
          Complete some trades and add notes to track your trading psychology
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'rgba(10, 10, 10, 0.9)',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}
      >
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Trade Journal</h3>
            <span className="text-sm text-gray-500">
              ({filteredTrades.length} of {closedTrades.length} trades)
            </span>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-800/50 border border-purple-500/20 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                showFilters || filterTag
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  : 'bg-gray-800/50 border-purple-500/20 text-gray-400 hover:border-purple-500/40'
              }`}
            >
              <Filter className="w-4 h-4" />
              {filterTag ? `Filter: ${filterTag}` : 'Filter'}
            </button>
          </div>
        </div>

        {/* Filter Tags */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-purple-500/20">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterTag('')}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  filterTag === ''
                    ? 'bg-purple-500/30 border-purple-500/50 text-purple-300'
                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                All
              </button>
              {usedTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(tag === filterTag ? '' : tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    filterTag === tag
                      ? getTagColor(tag)
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Trade List */}
      <div className="space-y-3">
        {filteredTrades.slice().reverse().map((trade) => {
          const pnl = parseFloat(trade.pnl || 0);
          const isProfitable = pnl >= 0;
          const entry = journalEntries[trade.id] || {};
          const isEditing = editingTradeId === trade.id;
          const isExpanded = expandedTrades[trade.id];

          return (
            <div
              key={trade.id}
              className="rounded-xl overflow-hidden transition-all"
              style={{
                background: 'rgba(10, 10, 10, 0.9)',
                border: `1px solid ${isProfitable ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
              }}
            >
              {/* Trade Header */}
              <div
                className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-800/30 transition-colors"
                onClick={() => toggleExpanded(trade.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Trade Direction Icon */}
                  <div className={`p-2 rounded-lg ${isProfitable ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {trade.trade_type === 'BUY'
                      ? <TrendingUp className={`w-5 h-5 ${isProfitable ? 'text-green-400' : 'text-red-400'}`} />
                      : <TrendingDown className={`w-5 h-5 ${isProfitable ? 'text-green-400' : 'text-red-400'}`} />
                    }
                  </div>

                  {/* Trade Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${trade.trade_type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.trade_type}
                      </span>
                      <span className="text-gray-400">@</span>
                      <span className="text-white">${parseFloat(trade.entry_price).toFixed(2)}</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-white">${parseFloat(trade.exit_price).toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {trade.exit_time ? format(new Date(trade.exit_time), 'MMM d, yyyy HH:mm') : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Tags Preview */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="hidden md:flex gap-1">
                      {entry.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getTagColor(tag)}`}
                        >
                          #{tag}
                        </span>
                      ))}
                      {entry.tags.length > 3 && (
                        <span className="text-gray-500 text-xs">+{entry.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Notes Indicator */}
                  {entry.notes && (
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                  )}

                  {/* PnL */}
                  <span className={`font-bold min-w-[80px] text-right ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                    {isProfitable ? '+' : ''}${pnl.toFixed(2)}
                  </span>

                  {/* Expand Icon */}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-800">
                  {isEditing ? (
                    /* Edit Mode */
                    <div className="pt-4 space-y-4">
                      {/* Tags */}
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">Tags</label>
                        <div className="flex flex-wrap gap-2">
                          {PRESET_TAGS.map(tag => (
                            <button
                              key={tag.name}
                              onClick={() => toggleTag(tag.name)}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                editTags.includes(tag.name)
                                  ? TAG_COLORS[tag.color]
                                  : 'bg-gray-800/50 border-gray-700 text-gray-500 hover:border-gray-600'
                              }`}
                            >
                              #{tag.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">Notes</label>
                        <textarea
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="What was your thought process? What did you learn?"
                          className="w-full h-32 p-3 rounded-lg bg-gray-800/50 border border-purple-500/20 text-white text-sm focus:outline-none focus:border-purple-500/50 resize-none"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 transition-all"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={saveEdit}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-all"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="pt-4">
                      {/* Trade Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-gray-500">Position Size</div>
                          <div className="text-white">{parseFloat(trade.position_size).toFixed(4)} BTC</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Entry Price</div>
                          <div className="text-white">${parseFloat(trade.entry_price).toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Exit Price</div>
                          <div className="text-white">${parseFloat(trade.exit_price).toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Exit Reason</div>
                          <div className="text-white">{trade.exit_reason || 'Manual'}</div>
                        </div>
                      </div>

                      {/* Tags */}
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs text-gray-500 mb-2">Tags</div>
                          <div className="flex flex-wrap gap-2">
                            {entry.tags.map(tag => (
                              <span
                                key={tag}
                                className={`px-3 py-1 rounded-full text-xs font-medium border ${getTagColor(tag)}`}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {entry.notes ? (
                        <div className="mb-4">
                          <div className="text-xs text-gray-500 mb-2">Notes</div>
                          <div className="p-3 rounded-lg bg-gray-800/50 text-gray-300 text-sm whitespace-pre-wrap">
                            {entry.notes}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4 p-3 rounded-lg bg-gray-800/30 text-gray-500 text-sm text-center">
                          No notes added yet
                        </div>
                      )}

                      {/* Edit Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(trade);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                        {entry.notes || entry.tags?.length ? 'Edit Entry' : 'Add Notes'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredTrades.length === 0 && (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: 'rgba(10, 10, 10, 0.9)',
            border: '1px solid rgba(139, 92, 246, 0.2)'
          }}
        >
          <Search className="w-8 h-8 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">No trades match your filters</p>
          <button
            onClick={() => {
              setFilterTag('');
              setSearchQuery('');
            }}
            className="mt-3 text-purple-400 text-sm hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

export default TradeJournal;
