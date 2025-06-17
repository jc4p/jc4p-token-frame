import { NavLink } from 'react-router-dom';

export function Navigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800">
      <div className="flex justify-around items-center h-16">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-5 py-2 font-mono text-sm ${
              isActive ? 'text-green-400' : 'text-gray-500 hover:text-gray-400'
            }`
          }
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="mt-1">HOME</span>
        </NavLink>
        
        <NavLink
          to="/redeem"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-5 py-2 font-mono text-sm ${
              isActive ? 'text-green-400' : 'text-gray-500 hover:text-gray-400'
            }`
          }
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <span className="mt-1">REDEEM</span>
        </NavLink>
        
        <NavLink
          to="/history"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-5 py-2 font-mono text-sm ${
              isActive ? 'text-green-400' : 'text-gray-500 hover:text-gray-400'
            }`
          }
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="mt-1">HISTORY</span>
        </NavLink>
      </div>
    </nav>
  );
}