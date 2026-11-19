import React, { useEffect, useState } from 'react';
import { FiSearch, FiFilter, FiLayers, FiAlertCircle } from 'react-icons/fi';
import IssueCard from '../components/IssueCard.jsx';
import { getIssues } from '../services/issueService.js';
import { DEPARTMENTS, SEVERITIES, STATUSES } from '../utils/constants.js';

export default function AllIssuesPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const fetchIssueList = async () => {
    setLoading(true);
    try {
      const res = await getIssues({
        search,
        department,
        status,
        severity,
        sortBy,
        page,
        limit: 8
      });

      if (res.success) {
        setIssues(res.issues);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssueList();
  }, [department, status, severity, sortBy, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchIssueList();
  };

  const handleResetFilters = () => {
    setSearch('');
    setDepartment('all');
    setStatus('all');
    setSeverity('all');
    setSortBy('newest');
    setPage(1);
  };

  return (
    <div className="page-container">
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>All Civic Issues</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Browse, filter, and support municipal infrastructure reports ({total} total tickets).
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '16px',
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FiSearch
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Search by issue title, description, or street address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </form>

        {/* Filter controls row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            <FiFilter size={14} />
            <span>Filters:</span>
          </div>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 160, padding: '6px 10px', fontSize: '12.5px' }}
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 130, padding: '6px 10px', fontSize: '12.5px' }}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 130, padding: '6px 10px', fontSize: '12.5px' }}
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Severities</option>
            {SEVERITIES.map((sev) => (
              <option key={sev} value={sev}>
                {sev}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 140, padding: '6px 10px', fontSize: '12.5px', marginLeft: 'auto' }}
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
          >
            <option value="newest">Sort: Newest</option>
            <option value="votes">Sort: Most Supported</option>
            <option value="severity">Sort: Highest Severity</option>
            <option value="oldest">Sort: Oldest</option>
          </select>

          {(department !== 'all' || status !== 'all' || severity !== 'all' || search) && (
            <button
              onClick={handleResetFilters}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Issues Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          Loading civic reports...
        </div>
      ) : issues.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: 'var(--text-secondary)'
          }}
        >
          <FiAlertCircle size={32} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
          <h3 style={{ fontSize: '15px', color: 'var(--text-main)', marginBottom: 4 }}>No issues match your criteria</h3>
          <p style={{ fontSize: '13px' }}>Try adjusting your department, status, or search filters.</p>
        </div>
      ) : (
        <>
          <div className="grid-4" style={{ marginBottom: 24 }}>
            {issues.map((issue) => (
              <IssueCard key={issue._id} issue={issue} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary btn-sm"
              >
                Previous
              </button>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
