import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { baseApi } from "../environment";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Users,
  Calendar,
  BarChart2,
  ClipboardList,
  Bell,
  CreditCard,
  Wallet,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Groups3Icon from "@mui/icons-material/Groups3";

const navArr = [
  { link: "/school",          label: "Dashboard",     Icon: LayoutDashboard },
  { link: "/school/class",    label: "Classes",        Icon: GraduationCap },
  { link: "/school/subject",  label: "Subjects",       Icon: BookOpen },
  { link: "/school/student",  label: "Students",       Icon: Users },
  { link: "/school/teacher",  label: "Teachers",       Icon: (props) => <Groups3Icon sx={{ fontSize: props.size ?? 18 }} className={props.className} /> },
];

const subNavArr = [
  { link: "/school/schedule",    label: "Schedule",       Icon: Calendar },
  { link: "/school/attendance",  label: "Attendance",     Icon: BarChart2 },
  { link: "/school/examination", label: "Examinations",   Icon: ClipboardList },
  { link: "/school/notice",      label: "Notices",        Icon: Bell },
  { link: "/school/fee",         label: "Fee Management", Icon: CreditCard },
  { link: "/school/salary",      label: "Salary",         Icon: Wallet },
];

function NavItem({ item, isActive, collapsed, onClick }) {
  const { Icon, label, link } = item;
  const active = isActive(link);
  return (
    <button
      onClick={() => onClick(link)}
      title={collapsed ? label : undefined}
      className={[
        "w-full flex items-center gap-3 py-2.5 text-sm rounded-r-lg border-l-4 transition-all duration-150",
        collapsed ? "justify-center" : "px-3",
        active
          ? "border-l-orange-500 bg-orange-500/15 text-orange-400"
          : "border-l-transparent text-gray-400 hover:bg-orange-500/10 hover:text-orange-300",
      ].join(" ")}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="truncate font-medium">{label}</span>}
    </button>
  );
}

function SidebarContent({ collapsed, forceFull, onToggle, onNav, isActive }) {
  const expanded = forceFull || !collapsed;
  return (
    <div className="flex flex-col h-full">
      {/* Logo row */}
      <div className={["flex items-center h-16 border-b border-gray-700/60 px-4 shrink-0", expanded ? "justify-between" : "justify-center"].join(" ")}>
        {expanded && (
          <span className="text-lg font-bold text-gray-100 tracking-tight select-none">
            Beacon<span className="text-orange-500">Port</span>
          </span>
        )}
        {!forceFull && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/60 transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 pr-1 space-y-0.5">
        <div className={expanded ? "px-3 pb-1" : "pb-1"}>
          {expanded && <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-1">Main</p>}
          <div className="space-y-0.5">
            {navArr.map((item) => (
              <NavItem key={item.link} item={item} isActive={isActive} collapsed={!expanded} onClick={onNav} />
            ))}
          </div>
        </div>
        <div className={expanded ? "px-3 pt-2" : "pt-2"}>
          <div className="border-t border-gray-700/60 mb-3" />
          {expanded && <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-1">Management</p>}
          <div className="space-y-0.5">
            {subNavArr.map((item) => (
              <NavItem key={item.link} item={item} isActive={isActive} collapsed={!expanded} onClick={onNav} />
            ))}
          </div>
        </div>
      </nav>

      {/* Logout */}
      <div className="shrink-0 border-t border-gray-700/60 p-3">
        <button
          onClick={() => onNav("/logout")}
          title={!expanded ? "Log Out" : undefined}
          className={["w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-gray-400 hover:text-red-400 hover:bg-red-500/10", !expanded ? "justify-center" : ""].join(" ")}
        >
          <LogOut size={18} className="shrink-0" />
          {expanded && <span className="font-medium">Log Out</span>}
        </button>
      </div>
    </div>
  );
}

export default function School() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [schoolData, setSchoolData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    axios.get(`${baseApi}/school/fetch-single`, { headers: authH() })
      .then(res => { if (res.data?.school) setSchoolData(res.data.school); })
      .catch(e => console.error('Failed to fetch school data:', e));
  }, []);

  const isActive = (path) => location.pathname === path;
  const handleNav = (link) => { navigate(link); setMobileOpen(false); };
  const isDashboard = location.pathname === "/school";

  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100">
      {/* Desktop sidebar */}
      <aside className={["hidden md:flex flex-col fixed left-0 top-0 h-screen bg-gray-900 border-r border-gray-700/60 z-40 transition-all duration-200", collapsed ? "w-16" : "w-60"].join(" ")}>
        <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} onNav={handleNav} isActive={isActive} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={["fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-700/60 z-50 transition-transform duration-200 md:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full"].join(" ")}>
        <SidebarContent forceFull collapsed={false} onToggle={() => {}} onNav={handleNav} isActive={isActive} />
      </aside>

      {/* Content wrapper */}
      <div className={["flex flex-col flex-1 min-w-0 h-screen transition-all duration-200", collapsed ? "md:ml-16" : "md:ml-60"].join(" ")}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center h-16 bg-gray-900 border-b border-gray-700/60 px-4 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="mr-4 p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/60 transition-colors md:hidden">
            <Menu size={20} />
          </button>
          {collapsed ? (
            <span className="text-base font-bold text-gray-100 tracking-tight select-none hidden md:block">
              Beacon<span className="text-orange-500">Port</span>
            </span>
          ) : (
            <>
              {isDashboard ? (
                <span className="text-base font-bold text-gray-100 tracking-tight select-none hidden md:block">
                  Beacon<span className="text-orange-500">Port</span>
                </span>
              ) : (
                <span className="text-base font-bold text-gray-100 tracking-tight select-none truncate">
                  {schoolData?.schoolName || 'School'}
                </span>
              )}
              <span className="text-base font-bold text-gray-100 tracking-tight select-none md:hidden">
                {isDashboard ? 'Beacon' + 'Port' : (schoolData?.schoolName || 'School')}
              </span>
            </>
          )}
        </header>

        {/* Page */}
        <main className="flex-1 p-4 md:p-6 overflow-auto min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}