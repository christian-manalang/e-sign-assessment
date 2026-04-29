import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // <-- NEW
import UploadPage from './pages/UploadPage';
import SignPage from './pages/SignPage';

function App() {
  return (
    <BrowserRouter>
    <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/sign/:id" element={<SignPage />} /> 
      </Routes>
    </BrowserRouter>
  );
}

export default App;