import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@petal/ui/styles.css';
import './brand-fonts.css';
import './shell.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
