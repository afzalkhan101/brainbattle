import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MdOutlineArrowBack } from "react-icons/md";
import {
  LayoutDashboard,
  Users,
  ChartNoAxesColumn,
  Settings,
  GraduationCap,
  BookOpen,
  ClipboardList,
  User,
  Wallet,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import Avatar from "./Avatar";
import toast from "react-hot-toast";
import { isAdmin } from "../pages/admin/shared";
import { useLocation } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/quizzes", label: "Quizzes", icon: BookOpen },
  { to: "/my-attempts", label: "My Attempts", icon: ClipboardList },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/profile", label: "Profile", icon: User },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const admin = isAdmin(user);
  const links = admin ? [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/quizzes', label: 'Quizzes', icon: BookOpen },
    { to: '/admin/students', label: 'Students', icon: Users },
    { to: '/admin/results', label: 'Results', icon: ChartNoAxesColumn },
    { to: '/admin/subjects', label: 'Subjects', icon: GraduationCap },
    { to: '/profile', label: 'Settings', icon: Settings },
  ] : navItems;
  const pageLabel = links.find((item) => item.to === location.pathname)?.label || 'Overview';

  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    navigate("/login");
  };


  return (
    <div className="flex min-h-screen bg-slate-50 overflow-x-hidden">
      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-100 flex flex-col transition-all duration-300
        ${collapsed ? "w-20" : "w-64"}
        ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* LOGO (FIXED PART ONLY) */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {!collapsed && (
              <div><span className="font-bold text-slate-900 text-lg flex items-center gap-2"><GraduationCap size={24} className="text-primary-600" />Brain Battle</span>{admin && <span className="text-[10px] tracking-[0.2em] text-slate-400 pl-8">ADMIN PANEL</span>}</div>
            )}

            <div
              onClick={() => setCollapsed((prev) => !prev)}
              className="hidden lg:flex w-8 h-8 rounded-lg bg-primary-600 items-center justify-center cursor-pointer transition-all"
            >
              <MdOutlineArrowBack
                size={16}
                className={`text-white transition-transform duration-300 ${
                  collapsed ? "rotate-180" : "rotate-0"
                }`}
              />
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="ml-auto lg:hidden text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* NAV */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              end={to === "/admin"}
              title={label}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <Icon size={17} />
              {!collapsed && label}
              {!collapsed && (
                <ChevronRight size={13} className="ml-auto opacity-30" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* USER */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3 px-2">
            <Avatar user={user} className="w-8 h-8 rounded-full text-xs" />

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-slate-400 truncate capitalize">
                  {user?.role}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut size={16} />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      {/* OVERLAY */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* MAIN */}
      <div
        className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-300
        ${collapsed ? "lg:ml-20" : "lg:ml-64"}`}
      >
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center gap-4 px-6 sticky top-0 z-20">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden text-slate-500"
          >
            <Menu size={20} />
          </button>

          {admin && <div className="text-sm text-slate-400 flex gap-3"><span>Admin</span><span>/</span><span className="font-semibold text-slate-800">{pageLabel}</span></div>}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">
              {user?.email}
            </span>

            <Avatar user={user} className="w-8 h-8 rounded-full text-xs" />
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
