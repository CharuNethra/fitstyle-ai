import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { StoreProvider } from './context/StoreContext.jsx';
import { CatalogProvider } from './context/CatalogContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CatalogProvider>
        <AuthProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </AuthProvider>
      </CatalogProvider>
    </BrowserRouter>
  </StrictMode>,
);
