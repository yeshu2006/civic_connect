import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../ui/Button';
import { LayoutDashboard, Map, PlusCircle, List, Settings } from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const links = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Heatmap', to: '/map', icon: Map },
    { name: 'All Issues', to: '/issues', icon: List },
  ];

  if (user.role !== 'Admin') {
    links.splice(1, 0, { name: 'Report Issue', to: '/report', icon: PlusCircle });
  }

  if (user.role === 'Admin') {
    links.push({ name: 'System Settings', to: '/settings', icon: Settings });
  }

  return (
    <aside className="w-64 border-r bg-muted/40 hidden md:block h-[calc(100vh-4rem)] sticky top-16">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-4 text-sm font-medium">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary mt-1",
                    isActive ? "bg-muted text-primary" : ""
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
