import { lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "./App.css";

const CharacterModel = lazy(() => import("./components/Character"));
const MainContainer = lazy(() => import("./components/MainContainer"));
const RecruiterChatbot = lazy(() => import("./components/RecruiterChatbot"));
import { LoadingProvider } from "./context/LoadingProvider";

const App = () => {
  return (
    <>
      <LoadingProvider>
        <Suspense>
          <MainContainer>
            <Suspense>
              <CharacterModel />
            </Suspense>
          </MainContainer>
        </Suspense>
      </LoadingProvider>
      <Suspense>
        <RecruiterChatbot />
      </Suspense>
      <Analytics />
      <SpeedInsights />
    </>
  );
};

export default App;
