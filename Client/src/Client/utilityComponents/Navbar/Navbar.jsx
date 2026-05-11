import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const pages = [
  { link: '/', label: 'Home' },
  { link: '/login', label: 'Login' },
  { link: '/register', label: 'Register' },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const go = (link) => { navigate(link); setOpen(false); };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <span onClick={() => go('/')} className="text-xl font-bold text-white cursor-pointer tracking-tight">
            Beacon<span className="text-orange-500">Port</span>
          </span>

          <div className="hidden md:flex items-center gap-1">
            {pages.map((p) => (
              <button key={p.link} onClick={() => go(p.link)}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                {p.label}
              </button>
            ))}
          </div>

          <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-gray-400 hover:text-white">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-gray-800 py-2 space-y-1">
            {pages.map((p) => (
              <button key={p.link} onClick={() => go(p.link)}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
