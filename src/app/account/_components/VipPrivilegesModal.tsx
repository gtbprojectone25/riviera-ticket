'use client'

import React, { useEffect } from 'react'

type Props = {
  onClose: () => void
}

export function VipPrivilegesModal({ onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[#07090f] w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-2xl relative shadow-2xl border border-[rgba(255,255,255,0.1)] custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
        style={{
          '--bg': '#07090f',
          '--bg2': '#0c0e18',
          '--card': '#0e1120',
          '--border': 'rgba(255,255,255,0.06)',
          '--border2': 'rgba(255,255,255,0.10)',
          '--blue': '#2457f5',
          '--blue-dim': 'rgba(36,87,245,0.12)',
          '--blue-glow': 'rgba(36,87,245,0.3)',
          '--text': '#edf0fa',
          '--text2': '#7e8bab',
          '--text3': '#3e4560',
          '--gold': '#c9a84c',
          '--gold-dim': 'rgba(201,168,76,0.1)',
          '--font-display': 'var(--font-syne), sans-serif',
          '--font-body': 'var(--font-poppins), sans-serif',
          '--font-mono': 'var(--font-dm-mono), monospace',
        } as React.CSSProperties}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-20 bg-black/20 p-2 rounded-full backdrop-blur-md"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        <div className="main">
          {/* Header */}
          <div className="section-header a1">
            <div className="section-eyebrow">VIP Exclusive</div>
            <div className="section-title">Privileges for<br/><span>VIP holders</span></div>
            <div className="section-sub">Every VIP ticket includes a curated collection of limited-edition collectibles, unavailable anywhere else.</div>
          </div>

          {/* Items List */}
          <div className="items-list">

            {/* Trireme Scale Model */}
            <div className="item-card a2">
              <div className="item-image">
                <img src="https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80&fit=crop" alt="Trireme Scale Model" />
                <div className="item-image-overlay"></div>
                <div className="img-sub">Scale Model</div>
              </div>
              <div className="item-body">
                <div className="item-top">
                  <div className="item-name">TRIREME — THE ODYSSEY</div>
                  <span className="item-badge">VIP Only</span>
                </div>
                <div className="item-footer">
                  <div className="item-included">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Included with VIP
                  </div>
                  <button className="btn-learn">
                    Learn More
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Spartan Bracelet */}
            <div className="item-card a3">
              <div className="item-image" style={{background:'#060a10'}}>
                <img src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80&fit=crop" alt="Spartan Bracelet" />
                <div className="item-image-overlay"></div>
                <div className="img-sub">Bracelet</div>
              </div>
              <div className="item-body">
                <div className="item-top">
                  <div className="item-name">SPARTAN BRACELET</div>
                  <span className="item-badge">VIP Only</span>
                </div>
                <div className="item-type">Wearable Collectible · Limited Edition</div>
                <div className="item-desc">Forged in brushed stainless steel, engraved with ancient Greek inscriptions. A wearable piece of cinematic history, numbered and certified.</div>
                <div className="item-footer">
                  <div className="item-included">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Included with VIP
                  </div>
                  <button className="btn-learn">
                    Learn More
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Spartan Helmet LEGO */}
            <div className="item-card a4">
              <div className="item-image" style={{background:'#08060a'}}>
                <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&fit=crop" alt="Spartan Helmet LEGO" />
                <div className="item-image-overlay"></div>
                <div className="img-sub">Helmet</div>
              </div>
              <div className="item-body">
                <div className="item-top">
                  <div className="item-name">SPARTAN HELMET LEGO</div>
                  <span className="item-badge">VIP Only</span>
                </div>
                <div className="item-type">Collectible Set · Official LEGO</div>
                <div className="item-desc">An exclusive LEGO set designed in partnership with the film. 892 pieces, numbered certificate of authenticity, and collector&apos;s display stand included.</div>
                <div className="item-footer">
                  <div className="item-included">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Included with VIP
                  </div>
                  <button className="btn-learn">
                    Learn More
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Odysseia Olive Oil */}
            <div className="item-card a5">
              <div className="item-image" style={{background:'#060a06'}}>
                <img src="https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80&fit=crop" alt="Odysseia Olive Oil" />
                <div className="item-image-overlay"></div>
                <div className="img-sub">Olive Oil</div>
              </div>
              <div className="item-body">
                <div className="item-top">
                  <div className="item-name">ODYSSEIA OLIVE OIL</div>
                  <span className="item-badge">VIP Only</span>
                </div>
                <div className="item-type">Limited Edition · Extra Virgin</div>
                <div className="item-desc">Cold-pressed extra virgin olive oil from ancient Greek groves in Ithaca. Bottled in an exclusive edition vessel engraved with scenes from Homer&apos;s epic.</div>
                <div className="item-footer">
                  <div className="item-included">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Included with VIP
                  </div>
                  <button className="btn-learn">
                    Learn More
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        <style jsx global>{`
          .main {
            padding: 36px 20px 60px;
            position: relative; z-index: 1;
            font-family: var(--font-body);
            color: var(--text);
          }
          
          .section-header {
            text-align: center;
            margin-bottom: 36px;
          }

          .section-eyebrow {
            display: inline-flex; align-items: center; gap: 8px;
            font-size: 9px; font-weight: 600;
            letter-spacing: 3px; text-transform: uppercase;
            color: var(--gold);
            margin-bottom: 14px;
          }

          .section-eyebrow::before,
          .section-eyebrow::after {
            content: '';
            width: 24px; height: 1px;
            background: linear-gradient(90deg, transparent, rgba(201,168,76,0.5));
          }
          .section-eyebrow::after {
            background: linear-gradient(90deg, rgba(201,168,76,0.5), transparent);
          }

          .section-title {
            font-family: var(--font-display);
            font-size: 26px; font-weight: 800;
            letter-spacing: 0.5px;
            line-height: 1.2;
            color: var(--text);
            margin-bottom: 10px;
          }

          .section-title span {
            background: linear-gradient(135deg, #7eb0ff, #4a80ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .section-sub {
            font-size: 12.5px; color: var(--text2);
            font-weight: 300; line-height: 1.6;
            max-width: 300px; margin: 0 auto;
          }

          .items-list {
            display: flex; flex-direction: column; gap: 14px;
          }

          .item-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 20px;
            overflow: hidden;
            position: relative;
            transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
            cursor: pointer;
          }

          .item-card:hover {
            transform: translateY(-3px);
            border-color: rgba(80,130,255,0.2);
            box-shadow: 0 16px 48px rgba(0,0,0,0.4);
          }

          .item-card::before {
            content: '';
            position: absolute; top: 0; left: 0; right: 0; height: 1px;
            background: linear-gradient(90deg,
              transparent,
              rgba(80,140,255,0.4) 40%,
              rgba(160,200,255,0.6) 50%,
              rgba(80,140,255,0.4) 60%,
              transparent
            );
            opacity: 0; transition: opacity 0.3s;
            z-index: 2;
          }

          .item-card:hover::before { opacity: 1; }

          .item-image {
            position: relative;
            height: 220px;
            overflow: hidden;
            background: #050810;
          }

          .item-image img {
            width: 100%; height: 100%;
            object-fit: cover;
            display: block;
            opacity: 0.85;
            transition: transform 0.5s, opacity 0.3s;
            filter: saturate(0.8) contrast(1.05);
          }

          .item-card:hover .item-image img {
            transform: scale(1.04);
            opacity: 0.95;
          }

          .item-image-overlay {
            position: absolute; inset: 0;
            background: linear-gradient(
              to bottom,
              rgba(7,9,15,0.1) 0%,
              transparent 30%,
              transparent 50%,
              rgba(7,9,15,0.8) 85%,
              rgba(14,17,32,1) 100%
            );
            z-index: 1;
          }

          .item-image .img-sub {
            position: absolute;
            bottom: 14px; left: 0; right: 0;
            text-align: center;
            font-family: var(--font-display);
            font-size: 10px; letter-spacing: 4px;
            color: rgba(255,255,255,0.3);
            text-transform: uppercase;
            z-index: 2;
          }

          .item-body {
            padding: 18px 20px 20px;
          }

          .item-top {
            display: flex; align-items: flex-start; justify-content: space-between;
            margin-bottom: 8px;
          }

          .item-name {
            font-family: var(--font-display);
            font-size: 17px; font-weight: 700;
            letter-spacing: 1.5px;
            color: var(--text);
            line-height: 1.2;
          }

          .item-badge {
            display: inline-flex; align-items: center;
            padding: 3px 9px;
            background: var(--gold-dim);
            border: 1px solid rgba(201,168,76,0.2);
            border-radius: 20px;
            font-size: 9px; font-weight: 600;
            letter-spacing: 1.5px; text-transform: uppercase;
            color: var(--gold);
            flex-shrink: 0; margin-left: 10px; margin-top: 2px;
          }

          .item-type {
            font-size: 10px; font-weight: 500;
            letter-spacing: 2px; text-transform: uppercase;
            color: var(--text3);
            margin-bottom: 12px;
          }

          .item-desc {
            font-size: 12px; color: var(--text2);
            line-height: 1.65; font-weight: 300;
            margin-bottom: 16px;
          }

          .item-footer {
            display: flex; align-items: center; justify-content: space-between;
            padding-top: 14px;
            border-top: 1px solid var(--border);
          }

          .item-included {
            display: flex; align-items: center; gap: 6px;
            font-size: 11px; color: rgba(120,190,120,0.7);
            font-weight: 500;
          }

          .item-included svg { color: rgba(80,200,120,0.8); }

          .btn-learn {
            display: flex; align-items: center; gap: 5px;
            padding: 8px 16px;
            background: transparent;
            border: 1px solid rgba(80,130,255,0.25);
            border-radius: 8px;
            font-family: var(--font-body);
            font-size: 11.5px; font-weight: 600;
            letter-spacing: 0.5px;
            color: #7eb0ff; cursor: pointer;
            transition: all 0.2s;
          }

          .btn-learn:hover {
            background: rgba(36,87,245,0.1);
            border-color: rgba(80,130,255,0.4);
          }

          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          .a1 { animation: fadeUp 0.4s ease forwards; }
          .a2 { animation: fadeUp 0.4s 0.08s ease forwards; opacity: 0; }
          .a3 { animation: fadeUp 0.4s 0.16s ease forwards; opacity: 0; }
          .a4 { animation: fadeUp 0.4s 0.24s ease forwards; opacity: 0; }
          .a5 { animation: fadeUp 0.4s 0.32s ease forwards; opacity: 0; }
        `}</style>
      </div>
    </div>
  )
}
