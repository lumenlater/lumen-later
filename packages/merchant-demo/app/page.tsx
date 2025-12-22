import './globals.css';
import { Logo } from './components/Logo';

export default function Home() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 24, fontWeight: 700 }}>
          <Logo size={40} />
          <span>NeonAI</span>
        </div>
        <nav style={{ display: 'flex', gap: 24 }}>
          <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>Docs</a>
          <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>Pricing</a>
          <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>API</a>
        </nav>
      </header>

      {/* Hero */}
      <section style={{ textAlign: 'center', marginBottom: 60 }}>
        <h1 style={{
          fontSize: 48, fontWeight: 700, marginBottom: 16,
          background: 'linear-gradient(135deg, #fff 0%, #00d4ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>Power Your Apps with AI</h1>
        <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 500, margin: '0 auto' }}>
          Access GPT-4, Claude, and more through a single unified API. Pay with crypto, scale instantly.
        </p>
      </section>

      {/* Product Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 20, padding: 40, maxWidth: 500, margin: '0 auto',
        backdropFilter: 'blur(10px)',
      }}>
        <span style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
          padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20,
        }}>Most Popular</span>

        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Pro Credits Pack</h2>
        <p style={{ color: '#94a3b8', marginBottom: 24, lineHeight: 1.6 }}>
          1,000,000 API credits for all models. Perfect for startups and growing projects.
        </p>

        <ul style={{ listStyle: 'none', marginBottom: 30 }}>
          {['Access to GPT-4, Claude 3.5, Gemini Pro', '99.9% uptime SLA', 'Priority support', 'No rate limits'].map((f) => (
            <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 14, color: '#cbd5e1' }}>
              <span style={{ color: '#00d4ff', fontWeight: 'bold' }}>✓</span> {f}
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 24 }}>
          <span style={{ fontSize: 42, fontWeight: 700 }}>100</span>
          <span style={{ fontSize: 18, color: '#94a3b8' }}>USDC</span>
          <span style={{ fontSize: 14, color: '#64748b' }}>/ 1M credits</span>
        </div>

        <form action="/api/checkout" method="POST">
          <input type="hidden" name="product" value="pro-credits-pack" />
          <input type="hidden" name="amount" value="100" />

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>
              Your Stellar Wallet Address
            </label>
            <input
              type="text"
              name="userAddress"
              placeholder="G..."
              required
              style={{
                width: '100%', padding: '14px 16px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 10, color: '#fff', fontSize: 14,
                fontFamily: 'SF Mono, monospace',
              }}
            />
          </div>

          <button type="submit" style={{
            width: '100%', padding: '16px 24px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #00d4ff 100%)',
            border: 'none', borderRadius: 12, color: '#fff',
            fontSize: 16, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span>Buy Now, Pay Later</span>
            <span>→</span>
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 30, fontSize: 12, color: '#64748b' }}>
          Powered by <a href="#" style={{ color: '#00d4ff', textDecoration: 'none' }}>LumenLater</a> · Split into 4 payments
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 60,
        marginTop: 60, paddingTop: 40,
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        {[
          { value: '50M+', label: 'API Calls / Day' },
          { value: '12K+', label: 'Developers' },
          { value: '99.9%', label: 'Uptime' },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#00d4ff' }}>{s.value}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
