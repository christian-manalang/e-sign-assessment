import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { PenTool, CheckCircle } from 'lucide-react';

interface DocumentData {
  id: string;
  filename: string;
  senderEmail: string;
  signerEmail: string;
  status: string;
  pdfBase64: string;
}

export default function SignPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signed, setSigned] = useState(false);
  
  const sigPad = useRef<SignatureCanvas>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/document/${id}`);
        const data = await response.json();
        
        if (data.success) {
          setDoc(data.document);
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
    sigPad.current?.clear();
  };

  const handleSign = async () => {
    if (sigPad.current?.isEmpty()) {
      alert('Please provide a signature first.');
      return;
    }

    const signatureBase64 = sigPad.current?.getCanvas().toDataURL('image/png');
    
    console.log("Captured Signature:", signatureBase64);
    
    setSigned(true);
  };

  if (loading) return <div style={styles.center}>Loading document...</div>;
  if (error) return <div style={styles.center}>{error}</div>;
  if (!doc) return null;

  if (signed) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <CheckCircle size={64} color="green" />
          <h2>Thank You!</h2>
          <p>Your signature has been securely captured.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.pdfSection}>
        <h2 style={styles.title}>Review Document: {doc.filename}</h2>
        <p style={styles.subtitle}>Requested by: {doc.senderEmail}</p>
        
        <iframe 
          src={`data:application/pdf;base64,${doc.pdfBase64}`} 
          style={styles.iframe}
          title="PDF Viewer"
        />
      </div>

      <div style={styles.signSection}>
        <div style={styles.card}>
          <h3><PenTool size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }}/> Sign Here</h3>
          <p style={styles.subtitle}>Draw your signature in the box below.</p>
          
          <div style={styles.canvasContainer}>
            <SignatureCanvas 
              ref={sigPad}
              canvasProps={{ className: 'sigCanvas', style: { width: '100%', height: '100%' } }}
            />
          </div>
          
          <div style={styles.buttonRow}>
            <button onClick={handleClear} style={styles.clearBtn}>Clear</button>
            <button onClick={handleSign} style={styles.signBtn}>Submit Signature</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'sans-serif' },
  container: { display: 'flex', flexDirection: 'row' as const, height: '100vh', backgroundColor: '#f4f4f5', fontFamily: 'sans-serif' },
  pdfSection: { flex: 2, padding: '2rem', display: 'flex', flexDirection: 'column' as const },
  signSection: { flex: 1, padding: '2rem', borderLeft: '1px solid #ddd', backgroundColor: '#fff', display: 'flex', flexDirection: 'column' as const, justifyContent: 'center' },
  title: { margin: '0 0 0.5rem 0' },
  subtitle: { color: '#666', margin: '0 0 1.5rem 0' },
  iframe: { flex: 1, width: '100%', border: '1px solid #ccc', borderRadius: '8px' },
  card: { padding: '2rem', borderRadius: '12px', border: '1px solid #eaeaea', backgroundColor: '#fafafa', textAlign: 'center' as const },
  canvasContainer: { border: '2px dashed #ccc', borderRadius: '8px', height: '200px', backgroundColor: '#fff', marginBottom: '1rem' },
  buttonRow: { display: 'flex', gap: '1rem', justifyContent: 'space-between' },
  clearBtn: { flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold' },
  signBtn: { flex: 2, padding: '0.75rem', borderRadius: '6px', border: 'none', backgroundColor: '#000', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }
};