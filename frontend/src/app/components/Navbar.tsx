import { Shield, Menu, X, Moon, Sun } from "../../components/Icons";
import { useState } from "react";

type Page = "home" | "history" | "tips" | "about" | "dashboard";
type ThemeMode = "light" | "dark";

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export function Navbar({ currentPage, onNavigate, theme, onToggleTheme }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems: { id: Page; label: string }[] = [
    { id: "home", label: "Inicio" },
    { id: "history", label: "Historial" },
    { id: "tips", label: "Consejos" },
    { id: "dashboard", label: "Estadísticas" },
    { id: "about", label: "Acerca de" },
  ];

  return (
    <nav className="factify-header factify-enter">
      <div className="factify-shell">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => onNavigate("home")} className="flex items-center gap-2.5 group">
            <div className="factify-logo-mark">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="factify-brand-name">Factify</span>
          </button>

          <div className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`factify-nav-link ${currentPage === item.id ? "factify-nav-link--active" : ""}`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={onToggleTheme}
              className="factify-icon-btn ml-1"
              title={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
              aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <div className="md:hidden flex items-center gap-0.5">
            <button
              onClick={onToggleTheme}
              className="factify-icon-btn"
              title={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
              aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className="factify-icon-btn" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-700 py-2 pb-3 flex flex-col gap-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMenuOpen(false);
                }}
                className={`factify-nav-link text-left ${currentPage === item.id ? "factify-nav-link--active" : ""}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
