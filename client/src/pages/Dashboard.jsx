import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Activity, AlertTriangle, CheckCircle, Clock, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const { data: issues } = useQuery({
    queryKey: ['issues'],
    queryFn: async () => {
      const res = await api.get('/issues');
      return res.data;
    }
  });

  const displayIssues = isAdmin ? (issues || []) : (issues?.filter(i => i.reportedBy?._id === user?._id) || []);
  const pending = displayIssues.filter(i => i.status === 'Pending').length;
  const resolved = displayIssues.filter(i => i.status === 'Resolved').length;
  
  // Only for admin
  const activeCitizens = isAdmin ? new Set((issues || []).filter(i => i.reportedBy).map(i => i.reportedBy._id)).size : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name}</h1>
        <p className="text-muted-foreground">
          {isAdmin ? "Here's a high-level overview of city-wide civic activity." : "Here's an overview of your civic contributions."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isAdmin ? "Total Platform Reports" : "Total Reports"}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayIssues.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isAdmin ? "Pending Attention" : "Pending"}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isAdmin ? "Resolved Issues" : "Resolved"}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolved}</div>
          </CardContent>
        </Card>
        
        {isAdmin ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Citizens</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCitizens}</div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trust Score</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user?.trustScore || 100}</div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>{isAdmin ? "Recent Platform Activity" : "Recent Activity"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayIssues.slice(0, 5).map(issue => (
                <div key={issue._id} className="flex items-center gap-4">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium leading-none">{issue.title}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>Status: {issue.status}</span>
                      {isAdmin && <span>• By: {issue.reportedBy?.name || 'Unknown'}</span>}
                    </div>
                  </div>
                  <div className="ml-auto font-medium text-xs text-muted-foreground">
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {displayIssues.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
