import React from 'react';
import './App.css';

import { Tooltip } from 'react-tooltip'

import { GenerateContextProvider } from './api/GenerateContext';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="App">
      <Tooltip id="tooltip" />
      <GenerateContextProvider>
        <Dashboard />
      </GenerateContextProvider>
    </div>
  );
}

export default App;
