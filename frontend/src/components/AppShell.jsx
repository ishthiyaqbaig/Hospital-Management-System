import { useEffect, useState, useRef } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getRoleRedirect, roleLabels } from "../utils/roles";
import { listNotifications, updateNotification } from "../api/notifications";

const navItems = [
  { label: "Overview", to: "/" },
  { label: "Health", to: "/health" },
];

export default function AppShell() {
  const { isAuthenticated, logout, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const roleItems =
    isAuthenticated && user
      ? [
          { label: roleLabels[user.role], to: getRoleRedirect(user.role) },
          ...(user.role === "patient" || user.role === "receptionist"
            ? [{ label: "Book", to: "/booking" }]
            : []),
          ...(user.role === "receptionist"
            ? [{ label: "Queue", to: "/receptionist/queue" }]
            : []),
        ]
      : [];
  const items = [...navItems, ...roleItems];

  // Fetch notifications
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return undefined;
    }
    const fetchNotifications = () => {
      listNotifications({ page: 1, page_size: 5 })
        .then((data) => {
          setNotifications(data.items || []);
        })
        .catch(() => {});
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id) => {
    try {
      await updateNotification(id, { is_read: true });
      setNotifications((current) =>
        current.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      const promises = notifications
        .filter((n) => !n.is_read)
        .map((n) => updateNotification(n.id, { is_read: true }));
      await Promise.all(promises);
      setNotifications((current) =>
        current.map((n) => ({ ...n, is_read: true }))
      );
    } catch {}
  };

  return (
    <div className="min-h-screen bg-medical-ice text-slate-900">
      <header className="border-b border-cyan-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-medical-teal">
              MediFlow AI
            </p>
            <h1 className="text-xl font-bold text-medical-navy">
              Hospital Intelligence Console
            </h1>
          </div>
          <nav className="flex flex-wrap justify-end items-center gap-2">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "rounded px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-medical-teal text-white"
                      : "text-slate-600 hover:bg-cyan-50 hover:text-medical-teal",
                  ].join(" ")
                }
                end={item.to === "/"}
              >
                {item.label}
              </NavLink>
            ))}

            {/* Notification Bell */}
            {isAuthenticated ? (
              <div className="relative flex items-center" ref={dropdownRef}>
                <button
                  className="relative rounded-lg p-2 text-slate-600 hover:bg-cyan-50 hover:text-medical-teal transition"
                  onClick={() => setShowDropdown((curr) => !curr)}
                  type="button"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                  </svg>
                  {unreadCount > 0 ? (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white animate-bounce">
                      {unreadCount}
                    </span>
                  ) : null}
                </button>

                {showDropdown ? (
                  <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-cyan-100 bg-white/95 backdrop-blur-md p-4 shadow-soft z-50">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <h4 className="font-bold text-medical-navy text-sm">Notifications</h4>
                      {unreadCount > 0 ? (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-[11px] font-semibold text-medical-teal hover:underline"
                          type="button"
                        >
                          Mark all read
                        </button>
                      ) : null}
                    </div>

                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {notifications.length > 0 ? (
                        notifications.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => !item.is_read && handleMarkAsRead(item.id)}
                            className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                              item.is_read
                                ? "bg-slate-50/50 border-slate-100/50 text-slate-505"
                                : "bg-medical-ice border-cyan-100/50 text-slate-800 hover:border-medical-teal"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-1">
                              <p className="font-bold text-xs max-w-[200px] truncate">{item.title}</p>
                              {!item.is_read ? (
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 mt-1"></span>
                              ) : null}
                            </div>
                            <p className="text-[11px] mt-1 text-slate-600 leading-normal">{item.message}</p>
                            <p className="text-[9px] mt-1.5 text-slate-400">
                              {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="py-6 text-center text-xs text-slate-400">No recent notifications.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isAuthenticated ? (
              <button
                className="rounded px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-cyan-50 hover:text-medical-teal"
                onClick={logout}
                type="button"
              >
                Sign out
              </button>
            ) : (
              <NavLink
                className={({ isActive }) =>
                  [
                    "rounded px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-medical-teal text-white"
                      : "text-slate-600 hover:bg-cyan-50 hover:text-medical-teal",
                  ].join(" ")
                }
                to="/login"
              >
                Sign in
              </NavLink>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
