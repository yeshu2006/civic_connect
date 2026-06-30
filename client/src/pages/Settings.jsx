import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">
          Manage system configurations (Admin only).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Options</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Settings functionality coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
