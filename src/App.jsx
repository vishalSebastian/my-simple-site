import { Routes, Route, Link, NavLink } from 'react-router-dom';
import Home from './pages/Home.jsx';
import DelayedMessage from './pages/DelayedMessage.jsx';
import DynamicControls from './pages/DynamicControls.jsx';
import ProgressBar from './pages/ProgressBar.jsx';
import Login from './pages/Login.jsx';
import LearnLocators from './pages/LearnLocators.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="brand" data-testid="brand">VP's QA Practice</Link>
        <nav>
          <NavLink to="/learn-locators">Learn Locators</NavLink>
          <NavLink to="/delay">Delayed Message</NavLink>
          <NavLink to="/dynamic-controls">Dynamic Controls</NavLink>
          <NavLink to="/progress-bar">Progress Bar</NavLink>
          <NavLink to="/login">Login</NavLink>
        </nav>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/learn-locators" element={<LearnLocators />} />
          <Route path="/delay" element={<DelayedMessage />} />
          <Route path="/dynamic-controls" element={<DynamicControls />} />
          <Route path="/progress-bar" element={<ProgressBar />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<h1>Page not found</h1>} />
        </Routes>
      </main>
    </div>
  );
}
