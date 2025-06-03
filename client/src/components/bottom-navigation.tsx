import { Link, useLocation } from "wouter";
import { Home, Map, ClipboardList, Download, Settings } from "lucide-react";

interface BottomNavigationProps {
  currentRoute: string;
}

export default function BottomNavigation({ currentRoute }: BottomNavigationProps) {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/map", label: "Map", icon: Map },
    { path: "/logs", label: "Logs", icon: ClipboardList },
    { path: "/export", label: "Export", icon: Download },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const handleNavClick = () => {
    // Haptic feedback for navigation
    if ('vibrate' in navigator && localStorage.getItem('haptic-enabled') !== 'false') {
      navigator.vibrate(30);
    }
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 surface-variant material-shadow-elevated border-t border-gray-700"
      style={{ maxWidth: '390px', margin: '0 auto' }}
    >
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location === path;
          
          return (
            <Link key={path} href={path}>
              <button 
                onClick={handleNavClick}
                className={`flex flex-col items-center py-2 px-3 touch-target transition-colors ${
                  isActive 
                    ? 'text-primary' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="text-lg mb-1" size={20} />
                <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>
                  {label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
