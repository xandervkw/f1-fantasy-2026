import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/dashboard", label: "Predict" },
  { to: "/standings", label: "Standings" },
  { to: "/history", label: "History" },
  { to: "/about", label: "About" },
];

function linkClasses(isActive: boolean) {
  return `px-3 py-1.5 text-sm rounded-md transition-colors ${
    isActive
      ? "bg-primary text-primary-foreground font-medium"
      : "text-muted-foreground hover:text-foreground hover:bg-muted"
  }`;
}

export default function NavBar() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-3xl mx-auto flex items-center justify-between h-12 px-4">
        {/* Desktop nav links (hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => linkClasses(isActive)}
            >
              {link.label}
            </NavLink>
          ))}
          {profile?.is_admin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => linkClasses(isActive)}
            >
              Admin
            </NavLink>
          )}
        </div>

        {/* Mobile hamburger button (hidden on desktop) */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="sm:hidden flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Toggle menu"
        >
          {open ? (
            // X icon
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            // Hamburger icon
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>

        {/* Right — user name */}
        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
          {profile?.display_name}
        </span>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div className="sm:hidden border-t bg-background px-4 py-2 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block ${linkClasses(isActive)}`
              }
            >
              {link.label}
            </NavLink>
          ))}
          {profile?.is_admin && (
            <NavLink
              to="/admin"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block ${linkClasses(isActive)}`
              }
            >
              Admin
            </NavLink>
          )}
        </div>
      )}
    </nav>
  );
}
