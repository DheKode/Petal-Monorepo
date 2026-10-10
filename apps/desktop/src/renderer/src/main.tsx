import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@petal/ui/styles.css';
import './shell.css';
import './app.css';
import './home.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
