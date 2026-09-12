import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Closet from "./pages/Closet";
import TryOn from "./pages/TryOn";
import Gallery from "./pages/Gallery";
import Profile from "./pages/Profile";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/closet" component={Closet} />
    <Route path="/try-on" component={TryOn} />
    <Route path="/gallery" component={Gallery} />
    <Route path="/profile" component={Profile} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
