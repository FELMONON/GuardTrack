import { Link, useLocation } from "wouter";
import { Home, Map, ClipboardList, Moon, Settings } from "lucide-react";

interface BottomNavigationProps {
  currentRoute: string;
}

export default function BottomNavigation({ currentRoute }: BottomNavigationProps) {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Sites", icon: Home },
    { path: "/logs", label: "History", icon: ClipboardList },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const handleNavClick = () => {
    // Haptic feedback for navigation
    if ('vibrate' in navigator && localStorage.getItem('haptic-enabled') !== 'false') {
      navigator.vibrate(30);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-4">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location === path;
          
          return (
            <Link key={path} href={path}>
              <button 
                onClick={handleNavClick}
                className={`flex flex-col items-center py-3 px-4 min-w-[64px] transition-all duration-200 rounded-lg ${
                  isActive 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={22} className="mb-1" />
                <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>
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
