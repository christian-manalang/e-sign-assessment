import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { PenTool, CheckCircle, Loader2, Type, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentData {
  id: string;
  filename: string;
  senderEmail: string;
  signerEmail: string;
  status: string;
  pdfBase64: string;
}

type SigMode = 'draw' | 'type' | 'upload';

export default function SignPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signed, setSigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mode, setMode] = useState<SigMode>('draw');
  const [typedName, setTypedName] = useState('');
  const [fontFamily, setFontFamily] = useState("'Dancing Script', cursive");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  const sigPad = useRef<SignatureCanvas>(null);
  const typeCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/document/${id}`);
        const data = await response.json();
        
        if (data.success) {
          setDoc(data.document);

          if (data.document.status === 'SIGNED') {
            setSigned(true);
          }
        } else {
          setError('Document not found or link is invalid.');
        }
      } catch (err) {
        setError('Failed to load document.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  const handleClear = () => {
    if (mode === 'draw') sigPad.current?.clear();
    if (mode === 'type') setTypedName('');
    if (mode === 'upload') setUploadedImage(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getSignatureImage = (): string | null => {
    if (mode === 'draw') {
      return sigPad.current?.isEmpty() ? null : sigPad.current?.getCanvas().toDataURL('image/png') || null;
    }
    
    if (mode === 'type') {
      if (!typedName) return null;
      const canvas = typeCanvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'black';
      ctx.font = `60px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
      
      return canvas.toDataURL('image/png');
    }

    if (mode === 'upload') {
      return uploadedImage;
    }

    return null;
  };

  const handleSign = async () => {
    const signatureBase64 = getSignatureImage();
    
    if (!signatureBase64) {
      toast.error('Please provide a signature first.');
      return;
    }

    setIsSubmitting(true);
    const signingToast = toast.loading('Stamping document...');

    try {
      const response = await fetch(`http://localhost:3000/api/sign/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signatureBase64 }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Document signed successfully!', { id: signingToast });
        setSigned(true);
      } else {
        toast.error('Failed to apply signature.', { id: signingToast });
      }
    } catch (err) {
      toast.error('An error occurred during submission.', { id: signingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    const downloadToast = toast.loading('Preparing your PDF...');
    try {
      const response = await fetch(`http://localhost:3000/api/document/${id}`);
      const data = await response.json();
      
      if (data.success && data.document.pdfBase64) {
        const byteCharacters = atob(data.document.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `signed_${data.document.filename}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download started!', { id: downloadToast });
      } else {
        toast.error('Could not retrieve the file.', { id: downloadToast });
      }
    } catch (err) {
      toast.error('Error downloading document.', { id: downloadToast });
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 text-zinc-500 gap-3">
      <Loader2 className="animate-spin" size={40} />
      <p className="font-medium">Loading document...</p>
    </div>
  );

  if (error) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-red-500 font-medium">{error}</div>;
  if (!doc) return null;

  if (signed) {
    const isAlreadySigned = doc.status === 'SIGNED';

    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 font-sans text-zinc-900">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center border border-zinc-100">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-2xl font-bold mb-2">
            {isAlreadySigned ? 'Document Signed' : 'Thank You!'}
          </h2>
          <p className="text-zinc-500 mb-6 text-sm">
            {isAlreadySigned 
              ? 'This document was previously signed and is available for download.' 
              : 'Your signature has been securely captured and applied to the document.'}
          </p>
          <button 
            onClick={handleDownload} 
            className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium transition-colors"
          >
            Download Signed Document
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-zinc-50 font-sans text-zinc-900">
      <div className="flex-[2] p-4 md:p-8 flex flex-col h-[50vh] md:h-screen">
        <h2 className="text-xl md:text-2xl font-bold mb-1 truncate">Review Document: {doc.filename}</h2>
        <p className="text-zinc-500 text-sm md:text-base mb-4 truncate">Requested by: {doc.senderEmail}</p>
        <iframe 
          src={`data:application/pdf;base64,${doc.pdfBase64}`} 
          className="flex-1 w-full border border-zinc-200 rounded-xl shadow-sm bg-white" 
          title="PDF Viewer" 
        />
      </div>

      <div className="flex-1 p-4 md:p-8 border-t md:border-t-0 md:border-l border-zinc-200 bg-white flex flex-col justify-center h-[50vh] md:h-screen overflow-y-auto">
        <div className="p-6 md:p-8 rounded-xl border border-zinc-100 bg-zinc-50 text-center shadow-sm">
          
          <div className="flex bg-zinc-200 p-1 rounded-lg mb-6">
            {(['draw', 'type', 'upload'] as SigMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all uppercase tracking-wider flex items-center justify-center gap-2
                  ${mode === m ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                {m === 'draw' && <PenTool size={14} />}
                {m === 'type' && <Type size={14} />}
                {m === 'upload' && <Upload size={14} />}
                {m}
              </button>
            ))}
          </div>

          <div className="border-2 border-dashed border-zinc-300 rounded-lg h-48 bg-white mb-6 relative overflow-hidden flex items-center justify-center">
            {mode === 'draw' && (
              <SignatureCanvas 
                ref={sigPad} 
                canvasProps={{ className: 'w-full h-full absolute inset-0' }}
              />
            )}
            
            {mode === 'type' && (
              <div className="w-full px-6">
                <input
                  type="text"
                  placeholder="Type your name..."
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="w-full bg-transparent border-b border-zinc-300 text-center text-3xl focus:outline-none mb-4"
                  style={{ fontFamily }}
                />
                <div className="flex justify-center gap-4">
                  <button onClick={() => setFontFamily("'Dancing Script', cursive")} className={`text-[10px] font-bold px-2 py-1 rounded ${fontFamily.includes('Dancing') ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-600'}`}>CLASSIC</button>
                  <button onClick={() => setFontFamily("'Pacifico', cursive")} className={`text-[10px] font-bold px-2 py-1 rounded ${fontFamily.includes('Pacifico') ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-600'}`}>BOLD</button>
                </div>
                <canvas ref={typeCanvasRef} width={500} height={200} className="hidden" />
              </div>
            )}

            {mode === 'upload' && (
              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                {uploadedImage ? (
                  <img src={uploadedImage} alt="Uploaded signature" className="max-h-full max-w-full object-contain" />
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-500 italic underline">Click to upload signature</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handleClear} 
              disabled={isSubmitting} 
              className="flex-1 py-3 px-4 rounded-lg border border-zinc-200 bg-white text-zinc-700 font-medium hover:bg-zinc-100 transition-colors disabled:opacity-50"
              >
                Clear
            </button>
            <button
              onClick={handleSign} 
              disabled={isSubmitting} 
              className="flex-[2] py-3 px-4 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="animate-spin" size={18} />}
              {isSubmitting ? 'Signing...' : 'Submit Signature'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
