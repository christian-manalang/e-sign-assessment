import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, CheckCircle } from 'lucide-react';

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
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <CheckCircle size={64} color="green" />
          <h2>Success!</h2>
          <p>The document has been uploaded and an email has been sent to the signer.</p>
          <button onClick={() => window.location.reload()} style={styles.button}>Send Another</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Request a Signature</h1>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div {...getRootProps()} style={{ ...styles.dropzone, borderColor: isDragActive ? 'blue' : '#ccc' }}>
            <input {...getInputProps()} />
            {file ? (
              <div style={styles.fileBox}>
                <FileText size={32} />
                <p>{file.name}</p>
              </div>
            ) : (
              <div style={styles.fileBox}>
                <UploadCloud size={48} color="#666" />
                <p>Drag & drop a PDF here, or click to select</p>
              </div>
            )}
          </div>

          <input
            type="email"
            placeholder="Your Email (Sender)"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            required
            style={styles.input}
          />
          
          <input
            type="email"
            placeholder="Signer's Email"
            value={signerEmail}
            onChange={(e) => setSignerEmail(e.target.value)}
            required
            style={styles.input}
          />

          <button 
            type="submit" 
            disabled={!file || status === 'loading'} 
            style={{...styles.button, opacity: (!file || status === 'loading') ? 0.5 : 1}}
          >
            {status === 'loading' ? 'Sending...' : 'Send for Signature'}
          </button>
          {status === 'error' && <p style={{color: 'red'}}>Something went wrong. Please try again.</p>}
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f4f4f5', fontFamily: 'sans-serif' },
  card: { backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '500px', textAlign: 'center' as const },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '1rem', marginTop: '1.5rem' },
  dropzone: { border: '2px dashed', borderRadius: '8px', padding: '2rem', cursor: 'pointer', backgroundColor: '#fafafa', transition: 'border 0.2s ease' },
  fileBox: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '0.5rem', color: '#555' },
  input: { padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' },
  button: { padding: '0.75rem', borderRadius: '6px', border: 'none', backgroundColor: '#000', color: '#fff', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem' }
};