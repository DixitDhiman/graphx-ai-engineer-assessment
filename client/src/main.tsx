import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Check, Download, Play, X, WandSparkles } from 'lucide-react';
import './style.css';

type Product = {
  source_id: string;
  raw_input: Record<string, string>;
  status: string; attempts: number;
  output?: Record
  <string, unknown>;
  validation_errors?: string[];
  usage: { estimated_cost_usd: number };
  last_response?: string
};
type Run = {
  id: string; status: string; dry_run: boolean; products: Product[]; total_usage: {
    estimated_cost_usd:
    number; input_tokens: number; output_tokens: number
  }
};

function App() {
  const [run, setRun] = useState<Run | null>(null); const [selected, setSelected] = useState<Product | null>(null);
  const [dryRun, setDryRun] = useState(false); const [loading, setLoading] = useState(false); const [filter,
    setFilter] = useState('all'); const [editing, setEditing] = useState(false); const [editText, setEditText] =
      useState('');
  useEffect(() => {
    if (!run || !['running', 'review'].includes(run.status)) return; const timer =
      setInterval(async () => {
        const next = await fetch(`/api/runs/${run.id}`).then((response) => response.json());
        setRun(next);
      }, 1000); return () => clearInterval(timer);
  }, [run?.id, run?.status]);
  async function start() {
    setLoading(true); const response = await fetch('/api/runs', {
      method: 'POST', headers:
        { 'Content-Type': 'application/json' }, body: JSON.stringify({ dryRun, concurrency: 3 })
    }); setRun(await
      response.json()); setLoading(false);
  }
  async function decide(decision: string) {
    if (!run || !selected) return; let output = selected.output; if
      (decision === 'edit') { try { output = JSON.parse(editText); } catch { return; } } await
        fetch(`/api/runs/${run.id}/products/${selected.source_id}/decision`, {
          method: 'POST', headers: {
            'Content-Type': 'application/json'
          }, body: JSON.stringify({ decision, output })
        }); setSelected(null);
    setEditing(false); const next = await fetch(`/api/runs/${run.id}`).then((response) => response.json());
    setRun(next);
  }
  const products = run?.products.filter((item) => filter === 'all' || item.status === filter) ?? [];
  const count = (status: string) => run?.products.filter((item) => item.status === status).length ?? 0;
  return <main>
    <header>
      <div className="brand"><span className="mark">
        <WandSparkles size={18} />
      </span>
        <div><strong>QUICKPRINT PRO</strong><small>CATALOG WORKBENCH</small></div>
      </div>
      <div className="header-meta"><span className="pulse" /> <span>AI enrichment agent</span><button
        className="primary" onClick={start} disabled={loading}>
        <Play size={15} />{loading ? 'Starting...' : 'New enrichment run'}
      </button></div>
    </header>
    <section className="intro">
      <div>
        <p className="eyebrow">TENANT ONBOARDING / 01</p>
        <h1>Make every product<br /><em>ready to sell.</em></h1>
        <p className="lede">Turn messy source listings into a sharp, searchable catalog. Every draft is
          schema-checked, costed, and placed in your hands before it ships.</p>
      </div>
      <aside>
        <div className="control-row"><label>Run mode</label><button className={dryRun ? 'toggle on' : 'toggle'}
          onClick={() => setDryRun(!dryRun)}><span />{dryRun ? 'Dry run' : 'Live enrichment'}</button></div>
        <div className="tenant"><span>SHOP PROFILE</span><b>QuickPrint Pro</b><small>Austin, TX · Small business
          focus</small></div>
      </aside>
    </section>{run && <>
      <section className="stats">
        <div><span>CATALOG ROWS</span><b>{run.products.length}</b></div>
        <div><span>READY FOR REVIEW</span><b>{count('ready')}</b></div>
        <div><span>APPROVED</span><b>{count('approved')}</b></div>
        <div><span>EST. RUN COST</span><b>${run.total_usage.estimated_cost_usd.toFixed(3)}</b></div>
      </section>
      <section className="workspace">
        <nav className="filters">{['all', 'ready', 'approved', 'rejected', 'failed'].map((item) => <button
          className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item}<sup>{item
            === 'all' ? run.products.length : count(item)}</sup></button>)}</nav>
        <div className="product-list">{products.map((product) => <button className="product"
          key={product.source_id} onClick={() => setSelected(product)}><span
            className="product-id">#{product.source_id.padStart(2,
              '0')}</span><span><b>{String(product.output?.name ??
                product.raw_input.name)}</b><small>{String(product.output?.category ??
                  product.raw_input.description)}</small></span><span className={`status
                    ${product.status}`}>{product.status}</span><span className="chevron">›</span></button>)}</div>
      </section>{selected && <div className="drawer-backdrop" onClick={() => setSelected(null)}><aside
        className="drawer" onClick={(event) => event.stopPropagation()}><button className="close" onClick={() =>
          setSelected(null)}>
          <X />
        </button>
        <p className="eyebrow">PRODUCT #{selected.source_id.padStart(2, '0')}</p>
        <h2>{String(selected.output?.name ?? selected.raw_input.name)}</h2>
        <div className="trace"><span>ATTEMPTS <b>{selected.attempts}/3</b></span><span>COST
          <b>${selected.usage.estimated_cost_usd.toFixed(3)}</b></span></div>{selected.output ?
            <pre>{JSON.stringify(selected.output, null, 2)}</pre> : <div className="error">
              {selected.validation_errors?.join('\n')}</div>}<div className="actions"><button onClick={() =>
                decide('reject')}>
                <X size={16} />Reject
              </button><button className="approve" onClick={() => decide('approve')}>
            <Check size={16} />Approve draft
          </button></div>
      </aside>
      </div>}
    </>}{!run && <div className="empty">
      <WandSparkles size={26} />
      <h2>Your catalog is waiting.</h2>
      <p>Start a run to bring the sample product feed into review.</p>
    </div>}<footer><span>GRAPHX / AGENT OPERATIONS</span><a href={run ? `/api/runs/${run.id}/export` : '#'}>
      <Download size={14} /> Export approved JSON
    </a></footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode>
  <App />
</React.StrictMode>);