import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [senderEmail, setSenderEmail] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !senderEmail || !signerEmail) return;

    setStatus('loading');
    const loadingToast = toast.loading('Uploading and sending document...');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('senderEmail', senderEmail);
    formData.append('signerEmail', signerEmail);

    try {
      const response = await fetch('http://localhost:3000/api/request', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success('Request sent successfully!', { id: loadingToast });
        setStatus('success');
      } else {
        toast.error('Upload failed. Please check the file and try again.', { id: loadingToast });
        setStatus('error');
      }
    } catch (err) {
      toast.error('Network error. Is the backend running?', { id: loadingToast });
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center border border-zinc-100">
          <CheckCircle className="mx-auto mb-4 text-green-500" size={64} />
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Success!</h2>
          <p className="text-zinc-500 mb-6">The document has been uploaded and an email has been sent to the signer.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium transition-colors"
          >
            Send Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md border border-zinc-100">
        <h1 className="text-2xl font-bold text-zinc-900 text-center">Request a Signature</h1>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors duration-200 text-center flex flex-col items-center justify-center min-h-[160px]
              ${isDragActive ? 'border-zinc-900 bg-zinc-100' : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50'}`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex flex-col items-center gap-2 text-zinc-900">
                <FileText size={32} />
                <p className="font-medium truncate max-w-xs">{file.name}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-zinc-500">
                <UploadCloud size={40} className="text-zinc-400" />
                <p className="text-sm">Drag & drop a PDF here, or click to select</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Your Email (Sender)"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              required
              className="w-full p-3 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
            />
            
            <input
              type="email"
              placeholder="Signer's Email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              required
              className="w-full p-3 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={!file || status === 'loading'} 
            className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Sending...
              </>
            ) : 'Send for Signature'}
          </button>
          
          {status === 'error' && (
            <p className="text-red-500 text-sm text-center font-medium">Something went wrong. Please try again.</p>
          )}
        </form>
      </div>
    </div>
  );
}
