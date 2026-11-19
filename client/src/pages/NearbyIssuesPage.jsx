import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiNavigation,
  FiFilter,
  FiZap,
  FiMapPin,
  FiThumbsUp,
  FiArrowUpRight,
  FiX,
  FiLayers
} from 'react-icons/fi';
import LeafletMap from '../components/LeafletMap.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';
import { getNearbyIssues, voteIssue, unvoteIssue } from '../services/issueService.js';
import { DEPARTMENTS, SEVERITIES, STATUSES } from '../utils/constants.js';
import { formatDistance, getAssetUrl } from '../utils/formatters.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function NearbyIssuesPage() {
  const { isAuthenticated } = useAuth();
  const { success, error, info } = useToast();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);

  // User Coordinates (defaulting to San Francisco metro area)
  const [userCoords, setUserCoords] = useState({ latitude: 37.7749, longitude: -122.4194 });

  // Floating Filter Controls
  const [radiusMeters, setRadiusMeters] = useState(15000);
  const [department, setDepartment] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Acquire Browser GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        (err) => {
          console.warn('Geolocation permission not granted:', err.message);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  // Fetch Nearby Issues
  const fetchNearby = async () => {
    setLoading(true);
    try {
      const res = await getNearbyIssues({
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        radius: radiusMeters,
        department,
        severity,
        status
      });

      if (res.success) {
        setIssues(res.issues);
      }
    } catch (err) {
      console.error('Failed to fetch nearby issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearby();
  }, [userCoords.latitude, userCoords.longitude, radiusMeters, department, severity, status]);

  const handleVoteToggle = async (issueId) => {
    if (!isAuthenticated) {
      info('Please sign in to support this issue.');
      return;
    }

    try {
      const issue = issues.find((i) => i._id === issueId);
      if (issue?.hasVoted) {
        const res = await unvoteIssue(issueId);
        setIssues((prev) =>
          prev.map((i) => (i._id === issueId ? { ...i, votes: res.votes, hasVoted: false } : i))
        );
        if (selectedIssue?._id === issueId) {
          setSelectedIssue((prev) => ({ ...prev, votes: res.votes, hasVoted: false }));
        }
      } else {
        const res = await voteIssue(issueId);
        setIssues((prev) =>
          prev.map((i) => (i._id === issueId ? { ...i, votes: res.votes, hasVoted: true } : i))
        );
        if (selectedIssue?._id === issueId) {
          setSelectedIssue((prev) => ({ ...prev, votes: res.votes, hasVoted: true }));
        }
      }
    } catch (err) {
      error(err.response?.data?.message || 'Vote failed');
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - var(--header-height))', overflow: 'hidden' }}>
      {/* Full Map Canvas */}
      <LeafletMap
        height="100%"
        center={[userCoords.latitude, userCoords.longitude]}
        zoom={13}
        issues={issues}
        selectedIssue={selectedIssue}
        onSelectIssue={(issue) => setSelectedIssue(issue)}
        showHeatmap={showHeatmap}
      />

      {/* Floating Top Controls (Snapchat-style minimal HUD) */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          pointerEvents: 'none'
        }}
      >
        {/* Left: Quick Stats Pill */}
        <div
          style={{
            pointerEvents: 'auto',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            padding: '8px 16px',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: '13px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
            <span style={{ fontWeight: 600 }}>{issues.length}</span>
            <span style={{ color: 'var(--text-secondary)' }}>Nearby Issues</span>
          </div>

          <button
            onClick={() => setShowHeatmap((prev) => !prev)}
            style={{
              border: 'none',
              background: showHeatmap ? '#FFF7ED' : '#F4F4F5',
              color: showHeatmap ? 'var(--primary)' : 'var(--text-secondary)',
              padding: '4px 10px',
              borderRadius: '14px',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <FiZap size={13} />
            {showHeatmap ? 'Heatmap: ON' : 'Heatmap: OFF'}
          </button>
        </div>

        {/* Right: Filter Trigger & Center GPS Buttons */}
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <button
            onClick={() => setFilterPanelOpen((prev) => !prev)}
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '8px 14px',
              boxShadow: 'var(--shadow-md)',
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <FiFilter size={14} />
            Filters
          </button>

          <button
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  setUserCoords({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                  });
                  success('Map centered on your current GPS location.');
                });
              }
            }}
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: 38,
              height: 38,
              boxShadow: 'var(--shadow-md)',
              color: 'var(--primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Center on my location"
          >
            <FiNavigation size={16} />
          </button>
        </div>
      </div>

      {/* Floating Filter Popover */}
      {filterPanelOpen && (
        <div
          style={{
            position: 'absolute',
            top: 66,
            right: 16,
            zIndex: 1000,
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: 'var(--shadow-lg)',
            width: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Map Filters</span>
            <button
              onClick={() => setFilterPanelOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
            >
              <FiX size={16} />
            </button>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Search Radius
            </label>
            <select
              className="form-select"
              style={{ marginTop: 4, padding: '6px 8px', fontSize: '12px' }}
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
            >
              <option value={2000}>2 km</option>
              <option value={5000}>5 km</option>
              <option value={15000}>15 km</option>
              <option value={30000}>30 km</option>
              <option value={50000}>50 km (All)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Department
            </label>
            <select
              className="form-select"
              style={{ marginTop: 4, padding: '6px 8px', fontSize: '12px' }}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Status
            </label>
            <select
              className="form-select"
              style={{ marginTop: 4, padding: '6px 8px', fontSize: '12px' }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Severity
            </label>
            <select
              className="form-select"
              style={{ marginTop: 4, padding: '6px 8px', fontSize: '12px' }}
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="all">All Severities</option>
              {SEVERITIES.map((sev) => (
                <option key={sev} value={sev}>
                  {sev}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Snapchat-Style Bottom Issue Preview Sheet */}
      {selectedIssue && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '92%',
            maxWidth: 540,
            zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            boxShadow: 'var(--shadow-modal)',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', gap: 14 }}>
            {selectedIssue.imageUrl && (
              <img
                src={getAssetUrl(selectedIssue.imageUrl)}
                alt={selectedIssue.title}
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 8,
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <StatusBadge status={selectedIssue.status} />
                  <SeverityBadge severity={selectedIssue.severity} />
                </div>
                <button
                  onClick={() => setSelectedIssue(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                >
                  <FiX size={16} />
                </button>
              </div>

              <h3
                style={{
                  fontSize: '14.5px',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  marginBottom: 4,
                  lineHeight: 1.3
                }}
              >
                {selectedIssue.title}
              </h3>

              {selectedIssue.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  <FiMapPin size={12} />
                  <span>{selectedIssue.address}</span>
                  {selectedIssue.distanceMeters !== undefined && (
                    <span style={{ fontWeight: 600 }}>• {formatDistance(selectedIssue.distanceMeters)} away</span>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
                <button
                  onClick={() => handleVoteToggle(selectedIssue._id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid var(--border)',
                    background: selectedIssue.hasVoted ? 'var(--primary-light)' : '#FFFFFF',
                    color: selectedIssue.hasVoted ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <FiThumbsUp size={12} />
                  <span>Support ({selectedIssue.votes || 0})</span>
                </button>

                <Link
                  to={`/issues/${selectedIssue._id}`}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '4px 12px' }}
                >
                  View Details <FiArrowUpRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
