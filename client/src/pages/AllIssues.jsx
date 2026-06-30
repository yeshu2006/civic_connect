import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';

const IssueModal = ({ issue, onClose, isAdmin, onStatusUpdate }) => {
  const [status, setStatus] = useState(issue.status);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await onStatusUpdate(issue._id, status);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-2">{issue.title}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Reported by {issue.reportedBy?.name || 'Unknown'} on {new Date(issue.createdAt).toLocaleDateString()}
          </p>

          {issue.images && issue.images.length > 0 && (
            <img 
              src={issue.images[0]} 
              alt="Issue" 
              className="w-full max-h-80 object-cover rounded-md mb-6"
            />
          )}

          <div className="space-y-4 mb-6">
            <div>
              <h3 className="font-semibold text-lg">Description</h3>
              <p className="text-muted-foreground">{issue.description}</p>
            </div>
            
            <div className="flex gap-4">
              <div>
                <span className="font-medium">Category:</span> {issue.category}
              </div>
              <div>
                <span className="font-medium">Severity:</span> {issue.severity}
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-2">Status</h3>
            {isAdmin ? (
              <div className="flex items-center gap-4">
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="flex h-10 w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Duplicate">Duplicate</option>
                </select>
                <Button onClick={handleUpdate} disabled={loading || status === issue.status}>
                  {loading ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            ) : (
              <span className="bg-primary/10 text-primary px-3 py-1.5 rounded text-sm font-medium">
                {issue.status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AllIssues = () => {
  const [filterCategory, setFilterCategory] = useState('All');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: issues, isLoading, error } = useQuery({
    queryKey: ['all-issues'],
    queryFn: async () => {
      const res = await api.get('/issues');
      return res.data;
    }
  });

  const handleStatusUpdate = async (id, newStatus) => {
    await api.put(`/issues/${id}/status`, { status: newStatus });
    queryClient.invalidateQueries(['all-issues']);
  };

  if (isLoading) return <div>Loading issues...</div>;
  if (error) return <div>Failed to load issues</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Issues</h1>
          <p className="text-muted-foreground">
            View all civic issues reported by the community.
          </p>
        </div>
        <div>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex h-10 w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="All">All Categories</option>
            <option value="Road Damage">Road Damage</option>
            <option value="Garbage">Garbage</option>
            <option value="Street Light">Street Light</option>
            <option value="Water Leakage">Water Leakage</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(issues || [])
          .filter(issue => filterCategory === 'All' || issue.category === filterCategory)
          .map(issue => (
          <Card 
            key={issue._id} 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setSelectedIssue(issue)}
          >
            <CardHeader>
              <CardTitle className="text-xl">{issue.title}</CardTitle>
              <div className="text-sm text-muted-foreground">
                Reported by {issue.reportedBy?.name || 'Unknown'} on {new Date(issue.createdAt).toLocaleDateString()}
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 line-clamp-2">{issue.description}</p>
              <div className="flex flex-wrap gap-2 text-sm mt-2">
                <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                  Status: {issue.status}
                </span>
                <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded">
                  Severity: {issue.severity}
                </span>
                {issue.category && (
                  <span className="bg-muted text-muted-foreground px-2 py-1 rounded">
                    Category: {issue.category}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {issues?.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-10">
            No issues found.
          </div>
        )}
      </div>

      {selectedIssue && (
        <IssueModal 
          issue={selectedIssue} 
          onClose={() => setSelectedIssue(null)}
          isAdmin={user?.role === 'Admin'}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
};

export default AllIssues;
