import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Stock } from '../models/stock.model';

@Component({
  selector: 'app-stock-detail-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-left">
            <div class="ticker-pill">{{ stock.symbol }}</div>
            <div>
              <h2 class="title">{{ stock.name }}</h2>
              <div class="meta-row">
                <span class="price">\${{ stock.price.toFixed(2) }}</span>
                <span class="change" [ngClass]="stock.change >= 0 ? 'bull' : 'bear'">
                  {{ stock.change >= 0 ? '+' : '' }}\${{ stock.change.toFixed(2) }}
                  ({{ stock.changePercent >= 0 ? '+' : '' }}{{ stock.changePercent.toFixed(2) }}%)
                </span>
                <span class="sector">{{ stock.sector }} â€¢ {{ stock.industry }}</span>
              </div>
            </div>
          </div>
          <button class="close-btn" (click)="close.emit()">âœ•</button>
        </div>

        <!-- Body Scrollable -->
        <div class="modal-body">
          <!-- AI Conviction Banner (Danelfin-style) -->
          <div class="ai-banner" [ngClass]="getScoreTheme(stock.aiScore.overall)">
            <div class="banner-left">
              <div class="ai-score-circle">
                <span class="score-num">{{ stock.aiScore.overall }}</span>
                <span class="score-max">/10</span>
              </div>
              <div>
                <div class="banner-tag">AI QUANT CONVICTION</div>
                <h3 class="verdict-title">{{ stock.aiScore.verdict }}</h3>
                <p class="prob-desc">
                  Estimated <strong>{{ stock.aiScore.winProbability }}%</strong> probability of outperforming the S&P 500 index over the next 60 trading days based on multi-factor machine learning regression.
                </p>
              </div>
            </div>
          </div>

          <!-- 4-Pillar Score Cards Grid -->
          <div class="pillars-grid">
            <div class="pillar-card">
              <div class="pillar-header">
                <span class="pillar-name">ðŸ“ˆ Technical</span>
                <span class="pillar-score" [style.color]="getScoreColor(stock.aiScore.technicalScore)">{{ stock.aiScore.technicalScore }}/10</span>
              </div>
              <div class="meter-bar">
                <div class="meter-fill" [style.width.%]="stock.aiScore.technicalScore * 10" [style.background]="getScoreColor(stock.aiScore.technicalScore)"></div>
              </div>
              <p class="pillar-hint">Price > 50 DMA, RSI 14 at {{ stock.rsi14.toFixed(0) }}, volume confirmation.</p>
            </div>

            <div class="pillar-card">
              <div class="pillar-header">
                <span class="pillar-name">ðŸ’Ž Fundamental</span>
                <span class="pillar-score" [style.color]="getScoreColor(stock.aiScore.fundamentalScore)">{{ stock.aiScore.fundamentalScore }}/10</span>
              </div>
              <div class="meter-bar">
                <div class="meter-fill" [style.width.%]="stock.aiScore.fundamentalScore * 10" [style.background]="getScoreColor(stock.aiScore.fundamentalScore)"></div>
              </div>
              <p class="pillar-hint">PEG of {{ stock.peg.toFixed(2) }}, ROE of {{ stock.roe.toFixed(1) }}%, FCF margin.</p>
            </div>

            <div class="pillar-card">
              <div class="pillar-header">
                <span class="pillar-name">ðŸŽ¯ Sentiment</span>
                <span class="pillar-score" [style.color]="getScoreColor(stock.aiScore.sentimentScore)">{{ stock.aiScore.sentimentScore }}/10</span>
              </div>
              <div class="meter-bar">
                <div class="meter-fill" [style.width.%]="stock.aiScore.sentimentScore * 10" [style.background]="getScoreColor(stock.aiScore.sentimentScore)"></div>
              </div>
              <p class="pillar-hint">Analyst Rating: {{ stock.analystRating }} with target upside.</p>
            </div>

            <div class="pillar-card">
              <div class="pillar-header">
                <span class="pillar-name">ðŸ›¡ï¸ Risk / Quality</span>
                <span class="pillar-score" [style.color]="getScoreColor(stock.aiScore.riskScore)">{{ stock.aiScore.riskScore }}/10</span>
              </div>
              <div class="meter-bar">
                <div class="meter-fill" [style.width.%]="stock.aiScore.riskScore * 10" [style.background]="getScoreColor(stock.aiScore.riskScore)"></div>
              </div>
              <p class="pillar-hint">Beta at {{ stock.beta.toFixed(2) }}, Debt/Equity ratio of {{ stock.debtToEquity.toFixed(2) }}.</p>
            </div>
          </div>

          <!-- Valuation Compass -->
          <div class="section-card valuation-compass">
            <h4 class="section-heading">ðŸ§­ Valuation Compass & DCF Model</h4>
            <div class="compass-metrics">
              <div class="compass-item">
                <span class="c-label">Current Market Price</span>
                <span class="c-val">\${{ stock.price.toFixed(2) }}</span>
              </div>
              <div class="compass-item">
                <span class="c-label">AI Calculated Fair Value</span>
                <span class="c-val fair" [style.color]="stock.aiScore.fairValue > stock.price ? '#10b981' : '#ef4444'">
                  \${{ stock.aiScore.fairValue.toFixed(2) }}
                  <small>({{ getUpsidePct(stock.aiScore.fairValue, stock.price) }})</small>
                </span>
              </div>
              <div class="compass-item">
                <span class="c-label">Wall St Consensus Target</span>
                <span class="c-val target" [style.color]="stock.targetPrice > stock.price ? '#38bdf8' : '#94a3b8'">
                  \${{ stock.targetPrice.toFixed(2) }}
                  <small>({{ getUpsidePct(stock.targetPrice, stock.price) }})</small>
                </span>
              </div>
            </div>
          </div>

          <!-- Bullish Catalysts & Bearish Risks -->
          <div class="theses-grid">
            <div class="thesis-card bull">
              <h4 class="thesis-title">ðŸŸ¢ AI Bullish Catalysts</h4>
              <ul class="thesis-list">
                <li *ngFor="let item of stock.aiScore.bullishCatalysts">{{ item }}</li>
              </ul>
            </div>
            <div class="thesis-card bear">
              <h4 class="thesis-title">ðŸ”´ Key Downside Risks & Vulnerabilities</h4>
              <ul class="thesis-list">
                <li *ngFor="let item of stock.aiScore.bearishRisks">{{ item }}</li>
              </ul>
            </div>
          </div>

          <!-- Institutional Key Financial Ratios Table -->
          <div class="section-card">
            <h4 class="section-heading">ðŸ“Š Fundamental & Technical Matrix</h4>
            <div class="stats-grid">
              <div class="stat-cell"><span class="k">Market Cap</span><span class="v">\${{ stock.marketCap }}B</span></div>
              <div class="stat-cell"><span class="k">Trailing P/E</span><span class="v">{{ stock.pe.toFixed(1) }}</span></div>
              <div class="stat-cell"><span class="k">Forward P/E</span><span class="v">{{ stock.forwardPe.toFixed(1) }}</span></div>
              <div class="stat-cell"><span class="k">PEG Ratio</span><span class="v">{{ stock.peg.toFixed(2) }}</span></div>
              <div class="stat-cell"><span class="k">Price / Sales</span><span class="v">{{ stock.ps.toFixed(1) }}</span></div>
              <div class="stat-cell"><span class="k">Price / Book</span><span class="v">{{ stock.pb.toFixed(1) }}</span></div>
              <div class="stat-cell"><span class="k">ROE</span><span class="v">{{ stock.roe.toFixed(1) }}%</span></div>
              <div class="stat-cell"><span class="k">Free Cash Flow</span><span class="v">\${{ stock.freeCashFlow }}B</span></div>
              <div class="stat-cell"><span class="k">Debt / Equity</span><span class="v">{{ stock.debtToEquity.toFixed(2) }}</span></div>
              <div class="stat-cell"><span class="k">Dividend Yield</span><span class="v">{{ stock.dividendYield.toFixed(2) }}%</span></div>
              <div class="stat-cell"><span class="k">EPS Growth YoY</span><span class="v">{{ stock.epsGrowth.toFixed(1) }}%</span></div>
              <div class="stat-cell"><span class="k">RSI (14)</span><span class="v">{{ stock.rsi14.toFixed(1) }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(3, 7, 18, 0.88);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
    }
    .modal-container {
      width: 100%;
      max-width: 880px;
      max-height: 90vh;
      background: #0b0f17;
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 1.25rem;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(56, 189, 248, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: modalFadeIn 0.2s ease-out;
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: rgba(15, 23, 42, 0.8);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .ticker-pill {
      font-size: 1.3rem;
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      padding: 0.45rem 0.9rem;
      border-radius: 0.6rem;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
    }
    .meta-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.25rem;
    }
    .price {
      font-size: 1.25rem;
      font-weight: 800;
      color: #f8fafc;
    }
    .change {
      font-size: 0.85rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 0.35rem;
    }
    .change.bull { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .change.bear { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
    .sector { font-size: 0.8rem; color: #94a3b8; }
    .close-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1rem;
    }
    .close-btn:hover { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* AI Conviction Banner */
    .ai-banner {
      padding: 1.25rem 1.5rem;
      border-radius: 1rem;
      border: 1px solid;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .ai-banner.theme-strong-buy {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%);
      border-color: rgba(16, 185, 129, 0.4);
    }
    .ai-banner.theme-buy {
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%);
      border-color: rgba(56, 189, 248, 0.4);
    }
    .ai-banner.theme-hold {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%);
      border-color: rgba(245, 158, 11, 0.4);
    }
    .ai-banner.theme-sell {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%);
      border-color: rgba(239, 68, 68, 0.4);
    }
    .banner-left {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .ai-score-circle {
      display: flex;
      align-items: baseline;
      justify-content: center;
      background: rgba(0, 0, 0, 0.4);
      padding: 0.75rem 1rem;
      border-radius: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .score-num {
      font-size: 2.2rem;
      font-weight: 900;
      color: #f8fafc;
    }
    .score-max {
      font-size: 1rem;
      color: #94a3b8;
      margin-left: 2px;
    }
    .banner-tag {
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.08rem;
      color: #38bdf8;
      text-transform: uppercase;
    }
    .verdict-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #f8fafc;
      margin: 0.1rem 0 0.35rem;
    }
    .prob-desc {
      font-size: 0.85rem;
      color: #cbd5e1;
      margin: 0;
      line-height: 1.4;
    }

    /* Pillars Grid */
    .pillars-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.85rem;
    }
    .pillar-card {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 0.75rem;
      padding: 0.85rem 1rem;
    }
    .pillar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
    }
    .pillar-name { font-size: 0.82rem; font-weight: 700; color: #cbd5e1; }
    .pillar-score { font-size: 0.95rem; font-weight: 800; }
    .meter-bar {
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 0.4rem;
    }
    .meter-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
    .pillar-hint { font-size: 0.72rem; color: #94a3b8; margin: 0; line-height: 1.3; }

    /* Valuation Compass */
    .section-card {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 0.85rem;
      padding: 1rem 1.25rem;
    }
    .section-heading {
      font-size: 0.9rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0 0 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04rem;
    }
    .compass-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    .compass-item {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .c-label { font-size: 0.78rem; color: #94a3b8; }
    .c-val { font-size: 1.15rem; font-weight: 800; color: #f8fafc; }
    .c-val small { font-size: 0.8rem; font-weight: 600; margin-left: 0.35rem; }

    /* Bull/Bear Theses */
    .theses-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 640px) {
      .theses-grid { grid-template-columns: 1fr; }
    }
    .thesis-card {
      padding: 1rem 1.25rem;
      border-radius: 0.85rem;
      border: 1px solid;
    }
    .thesis-card.bull {
      background: rgba(16, 185, 129, 0.05);
      border-color: rgba(16, 185, 129, 0.2);
    }
    .thesis-card.bear {
      background: rgba(239, 68, 68, 0.05);
      border-color: rgba(239, 68, 68, 0.2);
    }
    .thesis-title {
      font-size: 0.85rem;
      font-weight: 700;
      margin: 0 0 0.6rem;
      color: #f1f5f9;
    }
    .thesis-list {
      margin: 0;
      padding-left: 1.2rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .thesis-list li {
      font-size: 0.8rem;
      color: #cbd5e1;
      line-height: 1.35;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.75rem;
    }
    .stat-cell {
      background: rgba(255, 255, 255, 0.03);
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .stat-cell .k { font-size: 0.72rem; color: #94a3b8; }
    .stat-cell .v { font-size: 0.95rem; font-weight: 700; color: #f8fafc; }
  `]
})
export class StockDetailModalComponent {
  @Input({ required: true }) stock!: Stock;
  @Output() close = new EventEmitter<void>();

  getScoreTheme(score: number): string {
    if (score >= 9) return 'theme-strong-buy';
    if (score >= 7) return 'theme-buy';
    if (score >= 5) return 'theme-hold';
    return 'theme-sell';
  }

  getScoreColor(score: number): string {
    if (score >= 8) return '#10b981';
    if (score >= 6) return '#38bdf8';
    if (score >= 4) return '#f59e0b';
    return '#ef4444';
  }

  getUpsidePct(target: number, current: number): string {
    if (!current) return '0%';
    const pct = ((target - current) / current) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  }
}

