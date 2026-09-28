import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "Home", icon: "⌂", end: true },
  { to: "/path", label: "Path", icon: "☰" },
  { to: "/practice", label: "Practice", icon: "◎" },
  { to: "/progress", label: "Progress", icon: "◫" },
  { to: "/settings", label: "Settings", icon: "⚙" },
] as const;

export function TabBar() {
  return (
    <nav className="tab-bar" aria-label="Main">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={"end" in t ? t.end : false}
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          <span className="tab-icon" aria-hidden>
            {t.icon}
          </span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
