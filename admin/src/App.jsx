import { useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage";
import ConsoleLayout from "./ConsoleLayout";
import { getAdminToken, clearAdminToken, setOnAdminSessionExpired } from "./api/token";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => {
    clearLegacyToken();
    return !!getAdminToken();
  });

  useEffect(() => {
    setOnAdminSessionExpired(() => setLoggedIn(false));
    return () => setOnAdminSessionExpired(null);
  }, []);

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <ConsoleLayout
      onLogout={() => {
        clearAdminToken();
        setLoggedIn(false);
      }}
    />
  );
}

// 이전 버전이 localStorage에 남긴 토큰 제거
function clearLegacyToken() {
  try {
    localStorage.removeItem("adminToken");
  } catch {
    /* 무시 */
  }
}
