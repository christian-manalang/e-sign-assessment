import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import UploadPage from './pages/UploadPage';
import SignPage from './pages/SignPage';
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

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