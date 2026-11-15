import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import ConsoleLayout from "./ConsoleLayout";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("adminToken"));

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <ConsoleLayout
      onLogout={() => {
        localStorage.removeItem("adminToken");
        setLoggedIn(false);
      }}
    />
  );
}
