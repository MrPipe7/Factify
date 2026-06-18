import { useEffect, useState } from "react";
import { Navbar } from "./components/Navbar";
import { HomePage } from "./components/HomePage";
import { ResultPage } from "./components/ResultPage";
import { TipsPage } from "./components/TipsPage";
import { HistoryPage } from "./components/HistoryPage";
import { AboutPage } from "./components/AboutPage";
import { AdminEvaluationPage } from "./components/AdminEvaluationPage";
import { AnalysisResult } from "./utils/analyzer";

type Page = "home" | "result" | "history" | "tips" | "about";
type ThemeMode = "light" | "dark";

const HISTORY_STORAGE_KEY = "factify.history.v1";
const THEME_STORAGE_KEY = "factify.theme.v1";

function loadHistory(): AnalysisResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Omit<AnalysisResult, "timestamp"> & { timestamp: string }>;
    return parsed.map((item) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  } catch {
    return [];
  }
}

function loadTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";

  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>(loadHistory);
  const [theme, setTheme] = useState<ThemeMode>(loadTheme);

  useEffect(() => {
    try {
      const serializableHistory = history.map((item) => ({
        ...item,
        timestamp: item.timestamp.toISOString(),
      }));
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(serializableHistory));
    } catch {
      // Ignore storage errors in environments with restricted storage.
    }
  }, [history]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors in environments with restricted storage.
    }

    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleResult = (result: AnalysisResult) => {
    const enrichedResult: AnalysisResult = {
      ...result,
      timestamp: new Date(),
    };

    setCurrentResult(enrichedResult);
    setHistory((prev) => [...prev, enrichedResult]);
    setCurrentPage("result");
  };

  const handleAnalyzeAgain = () => {
    setCurrentResult(null);
    setCurrentPage("home");
  };

  const handleNavigate = (page: "home" | "history" | "tips" | "about") => {
    if (page === "home") {
      setCurrentResult(null);
    }
    setCurrentPage(page);
  };

  const handleSelectHistoryResult = (result: AnalysisResult) => {
    setCurrentResult(result);
    setCurrentPage("result");
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const navPage = currentPage === "result" ? "home" : currentPage;

  const isAdminRoute =
    typeof window !== "undefined" && window.location.pathname === "/admin/evaluation";

  if (isAdminRoute) {
    return <AdminEvaluationPage />;
  }

  return (
    <div className="min-h-screen flex flex-col factify-app-bg factify-mesh transition-colors">
      <Navbar
        currentPage={navPage}
        onNavigate={handleNavigate}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1">
        <div key={currentPage} className="factify-page-enter">
        {currentPage === "home" && (
          <HomePage onResult={handleResult} onNavigateTips={() => setCurrentPage("tips")} />
        )}
        {currentPage === "result" && currentResult && (
          <ResultPage result={currentResult} onAnalyzeAgain={handleAnalyzeAgain} />
        )}
        {currentPage === "history" && (
          <HistoryPage
            history={history}
            onSelectResult={handleSelectHistoryResult}
            onClearHistory={handleClearHistory}
            onAnalyzeNew={() => setCurrentPage("home")}
          />
        )}
        {currentPage === "tips" && <TipsPage />}
        {currentPage === "about" && <AboutPage />}
        </div>
      </main>

      <footer className="factify-footer">
        <div className="factify-shell flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="factify-logo-mark w-6 h-6 rounded-md">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span style={{ fontSize: "0.875rem" }} className="text-gray-500 dark:text-gray-400">
              <strong className="text-gray-700 dark:text-gray-200">Factify</strong> — Plataforma de verificación de noticias
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentPage("about")} className="factify-footer-link">
              Acerca de
            </button>
            <button onClick={() => setCurrentPage("tips")} className="factify-footer-link">
              Consejos
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
