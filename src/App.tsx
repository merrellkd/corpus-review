import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import WorkspacePage from './ui/pages/WorkspacePage';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<div>Welcome to Corpus Review</div>} />
          <Route path="/workspace/:projectId" element={<WorkspacePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;