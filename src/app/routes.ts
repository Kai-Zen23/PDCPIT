import { createBrowserRouter } from "react-router";
import { MainMenu } from "./components/MainMenu";
import { Lobby } from "./components/Lobby";
import { Waiting } from "./components/Waiting";
import { Gameplay } from "./components/Gameplay";
import { Victory } from "./components/Victory";
import { Defeat } from "./components/Defeat";
import { AnonymousMatchmaking } from "./components/AnonymousMatchmaking";
import { MatchFound } from "./components/MatchFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainMenu,
  },
  {
    path: "/matchmaking",
    Component: AnonymousMatchmaking,
  },
  {
    path: "/match-found",
    Component: MatchFound,
  },
  {
    path: "/lobby",
    Component: Lobby,
  },
  {
    path: "/waiting",
    Component: Waiting,
  },
  {
    path: "/game",
    Component: Gameplay,
  },
  {
    path: "/victory",
    Component: Victory,
  },
  {
    path: "/defeat",
    Component: Defeat,
  },
]);
