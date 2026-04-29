import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { PenTool, CheckCircle, Loader2, Type, Upload, Trash2, Download, MousePointer2, X, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Document, Page } from 'react-pdf';
import Draggable from 'react-draggable';

interface DocumentData {
  id: string;
  filename: string;
  senderEmail: string;
  signerEmail: string;
  status: string;
  pdfBase64: string;
}

interface StampedSignature {
  id: string;
  image: string;
  x: number;
  y: number;
  scale: number;
  pageNumber: number;
  mode: SigMode;
}

type SigMode = 'draw' | 'type' | 'upload';

const DraggableSignature = ({ 
  sig, 
  isSelected,
  onDragStop, 
  onRemove,
  onSelect
}: { 
  sig: StampedSignature; 
  isSelected: boolean;
  onDragStop: (x: number, y: number) => void; 
  onRemove: () => void;
  onSelect: () => void;
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: sig.x, y: sig.y }}
      onStart={() => setIsDragging(true)}
      onStop={(_, data) => {
        setIsDragging(false);
        onDragStop(data.x, data.y);
      }}
    >
      <div 
        ref={nodeRef}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className={`absolute top-0 left-0 cursor-move border-2 p-1 z-50 group/sig 
          ${isSelected ? 'border-blue-600 bg-blue-100/30 ring-4 ring-blue-500/20 shadow-lg' : 'border-dashed border-blue-400 bg-blue-50/20'}
          ${isDragging ? 'opacity-50 scale-95' : 'transition-all'}`}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className={`absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-md z-[60] 
            ${isSelected || !isDragging ? 'opacity-100' : 'opacity-0'}`}
        >
          <Trash2 size={12} />
        </button>
        <img 
          src={sig.image} 
          style={{ height: `${48 * sig.scale}px` }} 
          className="object-contain pointer-events-none" 
        />
      </div>
    </Draggable>
  );
};

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
  const [signatureScale, setSignatureScale] = useState(1);

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [stampedSignatures, setStampedSignatures] = useState<StampedSignature[]>([]);
  const [selectedSigId, setSelectedSigId] = useState<string | null>(null);

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const sigPad = useRef<SignatureCanvas>(null);
  const typeCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/document/${id}`);
        const data = await response.json();
        if (data.success) {
          setDoc(data.document);
          if (data.document.status === 'SIGNED') setSigned(true);
        } else {
          setError('Document not found.');
        }
      } catch (err) {
        setError('Failed to load document.');
      } finally {
        setLoading(false);
      }
    };
    fetchDocument();
  }, [id]);

  const resetInputs = () => {
    sigPad.current?.clear();
    setTypedName('');
    setUploadedImage(null);
    setSignatureScale(1);
  };

  const handleModeChange = (newMode: SigMode) => {
    setMode(newMode);
    setSelectedSigId(null);
    resetInputs();
  };

  const getSignatureImage = (): string | null => {
    if (mode === 'draw') return sigPad.current?.isEmpty() ? null : sigPad.current?.getCanvas().toDataURL('image/png') || null;
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
    return uploadedImage;
  };

  const handleInsert = () => {
    const img = getSignatureImage();
    if (!img) return toast.error('Provide a signature first.');
    
    const newId = crypto.randomUUID();
    const newSig: StampedSignature = {
      id: newId,
      image: img,
      x: 50,
      y: 50,
      scale: signatureScale,
      pageNumber: currentPage,
      mode: mode
    };
    
    setStampedSignatures([...stampedSignatures, newSig]);
    setSelectedSigId(newId); 
    resetInputs();
    toast.success('Signature added!');
  };

  const updateSigPosition = (id: string, x: number, y: number) => {
    setStampedSignatures(prev => prev.map(s => s.id === id ? { ...s, x, y } : s));
  };

  const removeSignature = (id: string) => {
    if (selectedSigId === id) setSelectedSigId(null);
    setStampedSignatures(stampedSignatures.filter(s => s.id !== id));
  };

  const handleSigSelection = (sig: StampedSignature) => {
    setSelectedSigId(sig.id);
    setMode(sig.mode);
  };

  const handleSign = async () => {
    if (stampedSignatures.length === 0) return toast.error('Please place at least one signature.');
    setIsSubmitting(true);
    const signingToast = toast.loading('Finalizing signatures...');
    try {
      const payload = {
        signatures: stampedSignatures.map(sig => ({
          ...sig,
          renderedWidth: pdfContainerRef.current?.offsetWidth || 500
        }))
      };
      const response = await fetch(`http://localhost:3000/api/sign/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Document signed!', { id: signingToast });
        setSigned(true);
      }
    } catch (err) {
      toast.error('Error occurred.', { id: signingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
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
      }
    } catch (err) {
      toast.error('Download failed.');
    }
  };

  const selectedSig = stampedSignatures.find(s => s.id === selectedSigId);
  const activeScale = selectedSig ? selectedSig.scale : signatureScale;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50"><Loader2 className="animate-spin" size={40} /></div>;

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md border border-zinc-100">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-2xl font-bold mb-2">Success!</h2>
          <p className="text-zinc-500 mb-6 text-sm">Your signatures are finalized.</p>
          <button onClick={handleDownload} className="w-full py-3 bg-zinc-900 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"><Download size={18} />Download PDF</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-zinc-200 overflow-hidden font-sans text-zinc-900">
      
      <div className="flex-[2] overflow-auto p-4 md:p-8 flex flex-col items-center justify-center gap-4">
        
        <div className="flex items-center gap-4 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-zinc-300 z-10">
          <button 
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="p-1 hover:bg-zinc-100 rounded-full disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-xs font-bold text-zinc-600 uppercase tracking-tighter">Page {currentPage} of {numPages}</span>
          <button 
            disabled={currentPage >= numPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="p-1 hover:bg-zinc-100 rounded-full disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div 
          ref={pdfContainerRef}
          onClick={() => { setSelectedSigId(null); resetInputs(); }}
          className="relative bg-white shadow-2xl group w-fit h-fit cursor-crosshair"
        >
          <Document 
            file={`data:application/pdf;base64,${doc?.pdfBase64}`}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<Loader2 className="animate-spin mt-10 text-zinc-500" size={32} />}
          >
            <Page 
              pageNumber={currentPage} 
              renderTextLayer={false} 
              renderAnnotationLayer={false} 
              className="pointer-events-none" 
            />
          </Document>

          {stampedSignatures.filter(s => s.pageNumber === currentPage).map((sig) => (
            <DraggableSignature 
              key={sig.id}
              sig={sig}
              isSelected={selectedSigId === sig.id}
              onDragStop={(x, y) => updateSigPosition(sig.id, x, y)}
              onRemove={() => removeSignature(sig.id)}
              onSelect={() => handleSigSelection(sig)}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 bg-white p-6 md:p-8 overflow-y-auto flex flex-col gap-6 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] border-l border-zinc-200">
        <div className="border border-zinc-100 rounded-xl p-6 bg-zinc-50">
          <h3 className="font-bold text-lg mb-4 flex justify-between items-center tracking-tight">
            {selectedSigId ? 'Editing Placed Signature' : 'Create New Signature'}
            {selectedSigId && <button onClick={() => { setSelectedSigId(null); resetInputs(); }} className="text-zinc-400 hover:text-zinc-900 transition-colors"><X size={16} /></button>}
          </h3>
          
          <div className="flex bg-zinc-200 p-1 rounded-lg mb-4">
            {(['draw', 'type', 'upload'] as SigMode[]).map((m) => (
              <button key={m} onClick={() => handleModeChange(m)} className={`flex-1 py-2 text-xs font-bold rounded-md uppercase transition-all ${mode === m ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>{m}</button>
            ))}
          </div>

          <div className="border-2 border-dashed border-zinc-300 rounded-lg h-40 bg-white mb-4 flex items-center justify-center overflow-hidden relative shadow-inner">
            {selectedSigId && selectedSig ? (
              <div className="flex flex-col items-center gap-2">
                <img src={selectedSig.image} alt="Selected" className="max-h-24 object-contain drop-shadow-sm" />
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest animate-pulse">Selected on Document</span>
              </div>
            ) : (
              <>
                {mode === 'draw' && <SignatureCanvas ref={sigPad} canvasProps={{ className: 'w-full h-full' }} />}
                {mode === 'type' && (
                  <div className="w-full px-4 text-center">
                    <input type="text" value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder="Type name..." className="w-full text-2xl text-center focus:outline-none mb-2 bg-transparent" style={{ fontFamily }} />
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setFontFamily("'Dancing Script', cursive")} className={`text-[9px] px-2 py-1 rounded ${fontFamily.includes('Dancing') ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-600'}`}>CLASSIC</button>
                      <button onClick={() => setFontFamily("'Pacifico', cursive")} className={`text-[9px] px-2 py-1 rounded ${fontFamily.includes('Pacifico') ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-600'}`}>BOLD</button>
                    </div>
                    <canvas ref={typeCanvasRef} width={500} height={200} className="hidden" />
                  </div>
                )}
                {mode === 'upload' && (
                  <label className="cursor-pointer flex flex-col items-center gap-2 w-full h-full justify-center">
                    {uploadedImage ? <img src={uploadedImage} alt="Preview" className="max-h-full max-w-full object-contain p-2" /> : <><Upload className="text-zinc-400" /><span className="text-xs italic underline">Click to upload image</span></>}
                    <input type="file" accept="image/*" onChange={(e) => {
                      const reader = new FileReader();
                      reader.onload = () => setUploadedImage(reader.result as string);
                      if (e.target.files?.[0]) reader.readAsDataURL(e.target.files[0]);
                    }} className="hidden" />
                  </label>
                )}
              </>
            )}
          </div>

          <div className="space-y-4">
            {selectedSigId && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-2">Move Signature to Page</label>
                <div className="flex gap-2 items-center bg-white border border-zinc-200 p-2 rounded-lg">
                  <FileText size={14} className="text-zinc-400" />
                  <select 
                    className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
                    value={selectedSig?.pageNumber}
                    onChange={(e) => {
                      const newPage = parseInt(e.target.value);
                      setStampedSignatures(prev => prev.map(s => s.id === selectedSigId ? { ...s, pageNumber: newPage } : s));
                      setCurrentPage(newPage);
                    }}
                  >
                    {Array.from(new Array(numPages), (_, i) => (
                      <option key={i + 1} value={i + 1}>Page {i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center justify-between text-[10px] font-bold uppercase text-zinc-500 mb-2 text-left">
                <span>Scaling (0.5 - 5.0)</span>
                {selectedSigId && <span className="text-blue-600 flex items-center gap-1 font-black"><MousePointer2 size={10} /> Active</span>}
              </label>
              <input 
                type="range" min="0.5" max="5.0" step="0.1" value={activeScale} 
                onChange={(e) => {
                  const newScale = parseFloat(e.target.value);
                  if (selectedSigId) {
                    setStampedSignatures(prev => prev.map(s => s.id === selectedSigId ? { ...s, scale: newScale } : s));
                  } else {
                    setSignatureScale(newScale);
                  }
                }} 
                className="w-full accent-zinc-900" 
              />
            </div>
            
            <div className="flex gap-2 pt-2 border-t border-zinc-200">
              <button onClick={() => { setSelectedSigId(null); resetInputs(); }} className="flex-1 py-3 border border-zinc-200 rounded-lg text-sm font-medium bg-white hover:bg-zinc-100 transition-colors">Clear</button>
              <button onClick={handleInsert} disabled={!!selectedSigId} className="flex-[2] py-3 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50">Add to Document</button>
            </div>
          </div>
        </div>

        {stampedSignatures.length > 0 && (
          <div className="mt-auto space-y-3">
             <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-[10px] leading-relaxed flex items-start gap-2">
              <div className="mt-0.5 font-bold underline shrink-0">Tip:</div>
              <p>Signatures save automatically across pages. Switch pages using the viewer controls to add more.</p>
            </div>
            <button onClick={handleSign} disabled={isSubmitting} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Complete Document'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
