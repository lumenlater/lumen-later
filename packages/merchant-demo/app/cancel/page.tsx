import '../globals.css';

export default function CancelPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 20, padding: 60, textAlign: 'center',
        maxWidth: 450, backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          width: 80, height: 80,
          background: 'rgba(251, 191, 36, 0.2)',
          border: '2px solid rgba(251, 191, 36, 0.5)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 40,
        }}>✕</div>

        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Payment Cancelled</h1>
        <p style={{ color: '#94a3b8', marginBottom: 32, lineHeight: 1.6 }}>
          No worries! Your order has been cancelled. Feel free to try again when you&apos;re ready.
        </p>

        <a href="/" style={{
          display: 'inline-block', padding: '14px 28px',
          background: 'linear-gradient(135deg, #7c3aed 0%, #00d4ff 100%)',
          borderRadius: 10, color: '#fff', textDecoration: 'none', fontWeight: 500,
        }}>Back to NeonAI</a>
      </div>
    </div>
  );
}
