import '../globals.css';

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

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
          background: 'linear-gradient(135deg, #10b981, #00d4ff)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 40,
        }}>✓</div>

        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Payment Successful!</h1>
        <p style={{ color: '#94a3b8', marginBottom: 24, lineHeight: 1.6 }}>
          Your API credits have been added to your account and are ready to use.
        </p>

        <div style={{
          background: 'rgba(0, 212, 255, 0.1)',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          borderRadius: 12, padding: 20, marginBottom: 24,
        }}>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Credits Added
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#00d4ff' }}>1,000,000</div>
        </div>

        <p style={{ fontSize: 12, color: '#4a5568', fontFamily: 'monospace', marginBottom: 24 }}>
          Session: {session_id}
        </p>

        <a href="/" style={{
          display: 'inline-block', padding: '14px 28px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 10, color: '#fff', textDecoration: 'none', fontWeight: 500,
        }}>Back to NeonAI</a>
      </div>
    </div>
  );
}
