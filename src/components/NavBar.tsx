import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/dashboard", label: "Predict" },
  { to: "/standings", label: "Standings" },
  { to: "/history", label: "History" },
  { to: "/about", label: "About" },
];

export default function NavBar() {
  const { profile } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-3xl mx-auto flex items-center justify-between h-12 px-4">
        {/* Left — nav links */}
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm rounded-md transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          {profile?.is_admin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm rounded-md transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`
              }
            >
              Admin
            </NavLink>
          )}
        </div>

        {/* Right — user name */}
        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
          {profile?.display_name}
        </span>
      </div>
    </nav>
  );
}
