// Archive screen: displays, filters, sorts, and bulk-manages the user's saved titles
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTitles, deleteTitle, updateTitle } from '../services/api';
import TicketStubCard from '../components/TicketStubCard';
import Toast from '../components/Toast';
import { getTodayDateString, exportToCsv } from '../utils/exportUtils';

// A reusable search/filter dropdown menu that closes when clicking outside of it
function CustomDropdown({
  label,
  value,
  options,
  onChange,
  alignRight = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? label;

  return (
    <div
      ref={rootRef}
      className={`archive-dropdown ${alignRight ? 'archive-dropdown-right' : ''}`}
    >
      <button
        type="button"
        className="archive-dropdown-trigger theme-control"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedLabel}</span>
        <span className="archive-dropdown-caret" aria-hidden="true" />
      </button>

      {open ? (
        <div className="archive-dropdown-menu" role="listbox">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className={`archive-dropdown-option ${active ? 'is-active' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                role="option"
                aria-selected={active}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// Displays summary counts (Total, Movies, Series, Watchlist, Completed) for the archive
function StatsStrip({ titles }) {
  const total = titles.length;
  const movies = titles.filter((t) => t.type?.toLowerCase() === 'movie').length;
  const series = titles.filter(
    (t) => t.type?.toLowerCase() === 'series',
  ).length;
  const watchlist = titles.filter(
    (t) => t.status?.toLowerCase() === 'watchlist',
  ).length;
  const completed = titles.filter(
    (t) => t.status?.toLowerCase() === 'completed',
  ).length;

  const stats = [
    { label: 'Total', value: total },
    { label: 'Movies', value: movies },
    { label: 'Series', value: series },
    { label: 'Watchlist', value: watchlist },
    { label: 'Completed', value: completed },
  ];

  return (
    <div className="archive-stats">
      {stats.map((stat) => (
        <div key={stat.label} className="archive-stat">
          <div className="archive-stat-value">{stat.value}</div>
          <div className="archive-stat-label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

// Component handling search queries, filters (status, type, genre), sorting options, and desktop/mobile responsiveness
function Filters({
  searchQuery,
  setSearchQuery,
  statusValue,
  setStatusValue,
  typeValue,
  setTypeValue,
  genreValue,
  setGenreValue,
  sortValue,
  setSortValue,
  titles,
  selectionMode,
  onToggleSelectionMode,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const types = [
    'All',
    ...Array.from(
      new Set(
        titles
          .map((t) => {
            if (t.type?.toLowerCase() === 'movie') return 'Movie';
            if (t.type?.toLowerCase() === 'series') return 'Series';
            return t.type;
          })
          .filter(Boolean),
      ),
    ),
  ];
  const allGenres = Array.from(
    new Set(titles.flatMap((t) => t.genre).filter(Boolean)),
  );
  const genres = ['All', ...allGenres];

  const statusOptions = [
    { value: 'All', label: 'All Statuses' },
    { value: 'Watchlist', label: 'Watchlist' },
    { value: 'Watching', label: 'Watching' },
    { value: 'Completed', label: 'Completed' },
  ];
  const typeOptions = [
    { value: 'All', label: 'All Types' },
    ...types
      .filter((type) => type !== 'All')
      .map((type) => ({ value: type, label: type })),
  ];
  const genreOptions = [
    { value: 'All', label: 'All Genres' },
    ...genres
      .filter((genre) => genre !== 'All')
      .map((genre) => ({ value: genre, label: genre })),
  ];
  const sortOptions = [
    { value: 'recently-added', label: 'Recently Added' },
    { value: 'my-rating', label: 'My Rating' },
    { value: 'imdb-rating', label: 'IMDb Rating' },
    { value: 'year', label: 'Year' },
  ];

  const activeFilterCount =
    (statusValue !== 'All' ? 1 : 0) +
    (typeValue !== 'All' ? 1 : 0) +
    (genreValue !== 'All' ? 1 : 0) +
    (sortValue !== 'recently-added' ? 1 : 0);

  return (
    <div className="archive-filter-row">
      <div className="archive-search-slot">
        <input
          type="text"
          placeholder="Search titles..."
          className="archive-search theme-control archive-search-inline"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Desktop Controls (hidden on mobile via CSS) */}
      <div className="archive-desktop-controls">
        <CustomDropdown
          label="All Statuses"
          value={statusValue}
          options={statusOptions}
          onChange={setStatusValue}
        />
        <CustomDropdown
          label="All Types"
          value={typeValue}
          options={typeOptions}
          onChange={setTypeValue}
        />
        <CustomDropdown
          label="All Genres"
          value={genreValue}
          options={genreOptions}
          onChange={setGenreValue}
        />

        <div className="archive-sort-slot">
          <CustomDropdown
            label="Recently Added"
            value={sortValue}
            options={sortOptions}
            onChange={setSortValue}
            alignRight
          />
        </div>
      </div>

      {/* Mobile Controls (hidden on desktop via CSS) */}
      <div className="archive-mobile-controls">
        <button
          type="button"
          className="archive-mobile-filters-trigger theme-control"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              width: '16px',
              height: '16px',
              marginRight: '8px',
              verticalAlign: 'middle',
            }}
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span style={{ verticalAlign: 'middle' }}>Filters & Sort</span>
          {activeFilterCount > 0 && (
            <span className="filter-badge">{activeFilterCount}</span>
          )}
        </button>

        {mobileOpen && (
          <div className="archive-mobile-filters-panel">
            <div className="archive-mobile-filter-item">
              <div className="archive-mobile-filter-label">Status</div>
              <CustomDropdown
                label="All Statuses"
                value={statusValue}
                options={statusOptions}
                onChange={setStatusValue}
              />
            </div>
            <div className="archive-mobile-filter-item">
              <div className="archive-mobile-filter-label">Type</div>
              <CustomDropdown
                label="All Types"
                value={typeValue}
                options={typeOptions}
                onChange={setTypeValue}
              />
            </div>
            <div className="archive-mobile-filter-item">
              <div className="archive-mobile-filter-label">Genre</div>
              <CustomDropdown
                label="All Genres"
                value={genreValue}
                options={genreOptions}
                onChange={setGenreValue}
              />
            </div>
            <div className="archive-mobile-filter-item">
              <div className="archive-mobile-filter-label">Sort By</div>
              <CustomDropdown
                label="Recently Added"
                value={sortValue}
                options={sortOptions}
                onChange={setSortValue}
              />
            </div>
            <button
              type="button"
              className="archive-mobile-filters-done-btn detail-primary-button"
              onClick={() => setMobileOpen(false)}
            >
              Apply & Done
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        className="detail-secondary-button"
        onClick={onToggleSelectionMode}
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '15px',
          letterSpacing: '1px',
          padding: '8px 16px',
        }}
      >
        {selectionMode ? 'Cancel' : 'Select'}
      </button>
    </div>
  );
}

// Renders the list of ticket stubs in a responsive grid layout
function Grid({ titles, selectionMode, selectedIds, onToggleCardSelection }) {
  return (
    <div className="archive-grid">
      {titles.map((title) => (
        <TicketStubCard
          key={title.id}
          title={title}
          selectionMode={selectionMode}
          selected={selectedIds.has(title.id)}
          onClick={selectionMode ? () => onToggleCardSelection(title.id) : undefined}
        />
      ))}
    </div>
  );
}

// Main Archive page component: handles data loading, in-memory filtering/sorting, and bulk operations (delete, status update, CSV export)
export default function Archive() {
  useEffect(() => {
    document.title = 'MyStubs · Your Archive';
  }, []);

  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search/Filter/Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [genreFilter, setGenreFilter] = useState('All');
  const [sortBy, setSortBy] = useState('recently-added');

  // Selection states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Confirm delete & progress states
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deletingProgress, setDeletingProgress] = useState(null);
  const [updatingProgress, setUpdatingProgress] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const handleToggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedIds(new Set());
    }
    setSelectionMode(!selectionMode);
  };

  const handleToggleCardSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExecuteDelete = async () => {
    const idsArray = Array.from(selectedIds);
    const total = idsArray.length;
    let successCount = 0;
    let failCount = 0;

    try {
      // Loop sequentially to avoid overloading the API or Google Sheets rate limits
      for (let i = 0; i < total; i++) {
        const id = idsArray[i];
        setDeletingProgress(`Deleting ${i + 1} of ${total}...`);
        try {
          await deleteTitle(id);
          successCount++;
        } catch (err) {
          console.error(`Failed to delete title stub ${id}:`, err);
          failCount++;
        }
      }

      setDeletingProgress(null);
      setShowConfirmDelete(false);

      // Refresh data
      try {
        const data = await getTitles();
        setTitles(data);
      } catch (err) {
        console.error('Failed to reload titles list:', err);
      }

      // Exit selection mode & clear selection
      setSelectionMode(false);
      setSelectedIds(new Set());

      // Show summary/success toast
      if (failCount > 0) {
        setToastMessage(`${successCount} deleted, ${failCount} failed`);
      } else {
        setToastMessage(`Deleted ${successCount} title${successCount > 1 ? 's' : ''}`);
      }
    } catch (err) {
      console.error('Bulk deletion routine error:', err);
      setToastMessage('Failed to delete titles — check your connection');
      setDeletingProgress(null);
      setShowConfirmDelete(false);
    }
  };

  const handleExecuteStatusUpdate = async (statusValue) => {
    const idsArray = Array.from(selectedIds);
    const total = idsArray.length;
    let successCount = 0;
    let failCount = 0;

    try {
      // Loop sequentially to avoid overloading the API or Google Sheets rate limits
      for (let i = 0; i < total; i++) {
        const id = idsArray[i];
        setUpdatingProgress(`Updating ${i + 1} of ${total}...`);
        try {
          await updateTitle(id, { status: statusValue });
          successCount++;
        } catch (err) {
          console.error(`Failed to update title stub status for ${id}:`, err);
          failCount++;
        }
      }

      setUpdatingProgress(null);

      // Refresh data
      try {
        const data = await getTitles();
        setTitles(data);
      } catch (err) {
        console.error('Failed to reload titles list:', err);
      }

      // Exit selection mode & clear selection
      setSelectionMode(false);
      setSelectedIds(new Set());

      // Show summary/success toast
      if (failCount > 0) {
        setToastMessage(`${successCount} updated, ${failCount} failed`);
      } else {
        setToastMessage(`Updated ${successCount} title${successCount > 1 ? 's' : ''}`);
      }
    } catch (err) {
      console.error('Bulk status update routine error:', err);
      setToastMessage('Failed to update titles — check your connection');
      setUpdatingProgress(null);
    }
  };

  const [exportingSelected, setExportingSelected] = useState(false);

  const handleExecuteExportSelected = async () => {
    try {
      setExportingSelected(true);
      const selectedTitles = titles.filter(t => selectedIds.has(t.id));
      const filename = `mystubs-selected-export-${getTodayDateString()}.csv`;
      
      exportToCsv(selectedTitles, filename);
      setToastMessage(`${selectedTitles.length} title${selectedTitles.length > 1 ? 's' : ''} exported`);
    } catch (err) {
      console.error('Failed to export selected titles:', err);
      setToastMessage('Failed to export — check your connection');
    } finally {
      setExportingSelected(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTitles();
        if (active) {
          setTitles(data);
        }
      } catch {
        if (active) {
          setError("Couldn't load your archive. Is the backend running?");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="archive-page state-view">
        <div className="state-content">
          <div className="ticket-punch-container">
            <svg
              className="ticket-punch-svg"
              viewBox="0 0 100 60"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <mask id="ticket-mask">
                  <rect x="0" y="0" width="100" height="60" fill="white" />
                  <circle
                    className="punch-hole-mask"
                    cx="18"
                    cy="30"
                    r="5"
                    fill="black"
                  />
                </mask>
              </defs>

              <g mask="url(#ticket-mask)">
                <path
                  d="M 10,5 H 90 A 5,5 0 0,1 95,10 V 24 A 6,6 0 0,0 95,36 V 50 A 5,5 0 0,1 90,55 H 10 A 5,5 0 0,1 5,50 V 36 A 6,6 0 0,0 5,24 V 10 A 5,5 0 0,1 10,5 Z"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                />
                <line
                  x1="32"
                  y1="6"
                  x2="32"
                  y2="54"
                  stroke="var(--primary)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity="0.6"
                />
              </g>

              <circle
                className="punch-hole-edge"
                cx="18"
                cy="30"
                r="5"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.5"
              />
              <circle
                className="punch-particle particle-1"
                cx="18"
                cy="30"
                r="1.2"
                fill="var(--primary)"
              />
              <circle
                className="punch-particle particle-2"
                cx="18"
                cy="30"
                r="1.2"
                fill="var(--primary)"
              />
              <circle
                className="punch-particle particle-3"
                cx="18"
                cy="30"
                r="1.2"
                fill="var(--primary)"
              />
            </svg>
          </div>
          <p className="state-message">Punching your archive stubs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="archive-page state-view">
        <div className="state-content error-box">
          <svg
            className="state-svg-icon error-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="state-message">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="retry-btn theme-control"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!titles || titles.length === 0) {
    return (
      <div className="archive-page state-view">
        <div className="archive-empty-container">
          <div className="archive-empty-composition">
            <div className="archive-empty-circle" />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="archive-empty-camera-icon"
            >
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <div className="archive-empty-badge">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="archive-empty-clapper-icon"
              >
                <path d="M2 2h20v20H2z" />
                <path d="M2 7h20" />
                <path d="M2 12h20" />
                <path d="M7 2l3 5" />
                <path d="M12 2l3 5" />
                <path d="M17 2l3 5" />
              </svg>
            </div>
          </div>
          <h2 className="archive-empty-heading">
            Your Archive is a Blank Reel
          </h2>
          <p className="archive-empty-subtext">
            Every great collection starts with a single frame. Search for a
            title to log your first stub and begin your cinematic legacy.
          </p>
          <Link to="/add" className="archive-empty-btn">
            <span style={{ marginRight: '6px' }}>+</span> Add Your First Title
          </Link>
        </div>
      </div>
    );
  }

  // Filter calculations in-memory
  const filteredTitles = titles.filter((t) => {
    // Search Query (match title, director, cast, genre)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = t.title?.toLowerCase().includes(q);
      const directorMatch = t.director?.toLowerCase().includes(q);
      const castMatch = t.cast?.some((c) => c.toLowerCase().includes(q));
      const genreMatch = t.genre?.some((g) => g.toLowerCase().includes(q));
      if (!titleMatch && !directorMatch && !castMatch && !genreMatch) {
        return false;
      }
    }

    // Status Filter
    if (statusFilter !== 'All') {
      const titleStatus = t.status || 'Watchlist';
      if (titleStatus.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
    }

    // Type Filter
    if (typeFilter !== 'All') {
      const typeLabel = t.type?.toLowerCase() === 'movie' ? 'Movie' : 'Series';
      if (typeLabel !== typeFilter) {
        return false;
      }
    }

    // Genre Filter
    if (genreFilter !== 'All') {
      if (!t.genre?.includes(genreFilter)) {
        return false;
      }
    }

    return true;
  });

  // Sort calculations in-memory
  const sortedTitles = [...filteredTitles].sort((a, b) => {
    if (sortBy === 'recently-added') {
      const indexA = titles.indexOf(a);
      const indexB = titles.indexOf(b);
      return indexB - indexA; // newest database records first
    }
    if (sortBy === 'my-rating') {
      return (b.myRating || 0) - (a.myRating || 0);
    }
    if (sortBy === 'imdb-rating') {
      return (parseFloat(b.imdbRating) || 0) - (parseFloat(a.imdbRating) || 0);
    }
    if (sortBy === 'year') {
      return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0);
    }
    return 0;
  });

  const allVisibleSelected =
    sortedTitles.length > 0 &&
    sortedTitles.every((t) => selectedIds.has(t.id));

  const handleSelectAllToggle = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        sortedTitles.forEach((t) => next.delete(t.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        sortedTitles.forEach((t) => next.add(t.id));
        return next;
      });
    }
  };

  return (
    <div className="archive-page">
      <h1 className="archive-title">Archive</h1>
      <StatsStrip titles={titles} />
      <Filters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusValue={statusFilter}
        setStatusValue={setStatusFilter}
        typeValue={typeFilter}
        setTypeValue={setTypeFilter}
        genreValue={genreFilter}
        setGenreValue={setGenreFilter}
        sortValue={sortBy}
        setSortValue={setSortBy}
        titles={titles}
        selectionMode={selectionMode}
        onToggleSelectionMode={handleToggleSelectionMode}
      />
      <div className={`archive-bulk-bar ${selectionMode ? 'is-active' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: '15px', color: 'var(--text)', fontWeight: '600' }}>
            {selectedIds.size} selected
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSelectAllToggle}
              style={{
                width: '18px',
                height: '18px',
                backgroundColor: allVisibleSelected ? 'var(--primary)' : 'rgba(0, 0, 0, 0.5)',
                border: `1.5px solid ${allVisibleSelected ? 'var(--primary)' : 'var(--text-muted)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                padding: 0,
                cursor: 'pointer',
              }}
              aria-label="Select all visible titles"
            >
              {allVisibleSelected && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--on-primary)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
            <span
              style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: '15px',
                color: 'var(--text)',
                fontWeight: '500',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={handleSelectAllToggle}
            >
              Select All
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <CustomDropdown
            label="Change Status"
            options={[
              { value: 'Watchlist', label: 'Watchlist' },
              { value: 'Watching', label: 'Watching' },
              { value: 'Completed', label: 'Completed' },
            ]}
            onChange={handleExecuteStatusUpdate}
          />
          <button
            type="button"
            className="detail-secondary-button"
            onClick={handleExecuteExportSelected}
            disabled={exportingSelected}
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '15px',
              letterSpacing: '1px',
              padding: '8px 16px',
              opacity: exportingSelected ? 0.6 : 1,
            }}
          >
            {exportingSelected ? 'Exporting...' : 'Export Selected'}
          </button>
          <button
            type="button"
            className="detail-delete-button"
            onClick={() => setShowConfirmDelete(true)}
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '15px',
              letterSpacing: '1px',
              padding: '8px 16px',
            }}
          >
            Delete Selected
          </button>
        </div>
      </div>
      {sortedTitles.length === 0 ? (
        <p className="no-results-msg">No titles match your search criteria.</p>
      ) : (
        <Grid
          titles={sortedTitles}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleCardSelection={handleToggleCardSelection}
        />
      )}

      {showConfirmDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Confirm Delete</h2>
              <button
                type="button"
                className="modal-close-button"
                onClick={() => setShowConfirmDelete(false)}
                disabled={deletingProgress !== null}
              >
                &times;
              </button>
            </div>
            
            <span className="modal-perforation-notch-left" style={{ top: '65px' }} />
            <span className="modal-perforation-notch-right" style={{ top: '65px' }} />

            <div className="modal-body" style={{ padding: '24px' }}>
              {deletingProgress ? (
                <div className="loading-text" style={{ margin: '20px 0' }}>
                  {deletingProgress}
                </div>
              ) : (
                <div
                  style={{
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontSize: '15px',
                    color: 'var(--text)',
                    lineHeight: '1.5',
                  }}
                >
                  Delete {selectedIds.size} selected titles? This cannot be undone.
                </div>
              )}
            </div>

            {!deletingProgress && (
              <div className="modal-footer">
                <button
                  type="button"
                  className="detail-secondary-button"
                  onClick={() => setShowConfirmDelete(false)}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  No, Cancel
                </button>
                <button
                  type="button"
                  className="detail-delete-button"
                  onClick={handleExecuteDelete}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  Yes, Delete All
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {updatingProgress && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div className="loading-text" style={{ margin: '20px 0' }}>
                {updatingProgress}
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}
