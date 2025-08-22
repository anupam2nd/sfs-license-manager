
import { Home, Plus, Bell, Settings } from 'lucide-react';

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

export const Sidebar = () => {

  const menuItems: SidebarItem[] = [
    {
      icon: <Home className="w-5 h-5" />,
      label: 'Dashboard',
      href: '/dashboard',
      active: window.location.pathname === '/dashboard',
    },
    {
      icon: <Plus className="w-5 h-5" />,
      label: 'Add License',
      href: '/add-license',
      active: window.location.pathname === '/add-license',
    },
    {
      icon: <Bell className="w-5 h-5" />,
      label: 'Notifications',
      href: '/notifications',
      active: window.location.pathname === '/notifications',
    },
    {
      icon: <Settings className="w-5 h-5" />,
      label: 'Settings',
      href: '/settings',
      active: window.location.pathname === '/settings',
    },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 shadow-sm">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">License Manager</h1>
      </div>
      
      <nav className="mt-6">
        {menuItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
              item.active
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {item.icon}
            <span className="ml-3">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
};
