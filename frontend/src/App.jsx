import { useEffect } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { ToastProvider } from "./components/Toast";
import { useHashRoute } from "./lib/router";
import { usePageMeta } from "./lib/usePageMeta";
import LandingPage from "./pages/LandingPage";
import CoachPage from "./pages/CoachPage";
import NotFoundPage from "./pages/NotFoundPage";

const PAGE_META = {
  "/": {
    title: "VoiceCareer AI — AI Voice Career Coach & Mock Interviewer",
    description:
      "VoiceCareer AI is an AI-powered voice career coach. Discover your ideal career path, practice adaptive mock interviews, and build a personalized career roadmap by speaking.",
  },
  "/coach": {
    title: "Voice Coach — VoiceCareer AI",
    description:
      "Start a voice session with the VoiceCareer AI coach: ask career questions, rehearse mock interviews, and get instant personalized feedback.",
  },
};

const NOT_FOUND_META = {
  title: "Page Not Found — VoiceCareer AI",
  description: "The page you're looking for doesn't exist.",
};

export default function App() {
  const route = useHashRoute();

  const meta = PAGE_META[route] || NOT_FOUND_META;
  usePageMeta(meta.title, meta.description);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);

  let page;
  if (route === "/") page = <LandingPage />;
  else if (route === "/coach") page = <CoachPage />;
  else page = <NotFoundPage />;

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{page}</main>
        <Footer />
      </div>
    </ToastProvider>
  );
}