import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Stock } from '../models/stock.model';
import { TosIntegrationService } from '../services/tos-integration.service';

@Component({
  selector: 'app-tos-action-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="brand-badge">
            <span class="tos-icon">🟢</span>
            <div>
              <div class="header-tag">THINKORSWIM • SCHWAB INTEGRATION</div>
              <h2 class="title">Execute & Chart {{ stock.symbol }}</h2>
            </div>
          </div>
          <button class="close-btn" (click)="close.emit()">✕</button>
        </div>

        <!-- Stock Summary Bar -->
        <div class="stock-summary-bar">
          <div class="sym-box">
            <span class="sym">{{ stock.symbol }}</span>
            <span class="name">{{ stock.name }}</span>
          </div>
          <div class="price-box">
            <span class="price">\${{ stock.price.toFixed(2) }}</span>
            <span class="change" [ngClass]="stock.change >= 0 ? 'bull' : 'bear'">
              {{ stock.change >= 0 ? '+' : '' }}{{ stock.changePercent.toFixed(2) }}%
            </span>
          </div>
          <div class="ai-box">
            <span class="ai-label">AI Score</span>
            <span class="ai-val">{{ stock.aiScore.overall }}/10</span>
          </div>
          <div class="fv-box">
            <span class="fv-label">Fair Value</span>
            <span class="fv-val">\${{ stock.aiScore.fairValue.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Primary Action Cards -->
        <div class="action-cards-grid">
          <!-- 1. ThinkorSwim Web -->
          <div class="action-card" (click)="launchTosWeb()">
            <div class="card-icon web-icon">🌐</div>
            <div class="card-content">
              <h4>Open ThinkorSwim Web</h4>
              <p>Launch live TOS browser terminal for {{ stock.symbol }} on tos.schwab.com.</p>
            </div>
            <button class="card-action-btn btn-tos">Launch TOS Web ›</button>
          </div>

          <!-- 2. Schwab Trade Ticket -->
          <div class="action-card" (click)="launchSchwabTicket()">
            <div class="card-icon schwab-icon">💼</div>
            <div class="card-content">
              <h4>Direct Schwab Order Ticket</h4>
              <p>Jump straight into Charles Schwab order execution pre-keyed for {{ stock.symbol }}.</p>
            </div>
            <button class="card-action-btn btn-schwab">Open Ticket ›</button>
          </div>

          <!-- 3. Desktop TOS Protocol -->
          <div class="action-card" (click)="launchDesktopTos()">
            <div class="card-icon desktop-icon">🖥️</div>
            <div class="card-content">
              <h4>ThinkorSwim Desktop Client</h4>
              <p>Invoke installed ThinkorSwim desktop application via local protocol handler.</p>
            </div>
            <button class="card-action-btn btn-desktop">Launch Desktop ›</button>
          </div>
        </div>

        <!-- thinkScript Order Generator Section -->
        <div class="order-generator-box">
          <div class="og-header">
            <span class="og-title">📋 thinkScript 1-Click Order Command</span>
            <span class="og-badge">Bracket Order Ready</span>
          </div>
          <p class="og-desc">
            Copy and paste directly into the ThinkorSwim Trade tab or Order Entry bar:
          </p>
          <div class="code-box">
            <code>{{ generatedOrderCommand }}</code>
            <button class="copy-btn" [class.copied]="copied()" (click)="copyCommand()">
              {{ copied() ? '✓ Copied!' : '📋 Copy Order' }}
            </button>
          </div>
        </div>

        <!-- KRK Group Guidance Card -->
        <div class="pro-tip-box">
          <div class="tip-header">
            <span class="tip-badge">KRK Group Strategy Note</span>
            <span class="tip-meta">200 SMA & Earnings Absorption</span>
          </div>
          <p class="tip-body">
            {{ getStrategyGuidance() }}
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.82);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .modal-card {
      background: #090e17;
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 1.25rem;
      width: 100%;
      max-width: 680px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(16, 185, 129, 0.15);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-badge {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .tos-icon { font-size: 1.75rem; }
    .header-tag {
      font-size: 0.68rem;
      font-weight: 800;
      color: #10b981;
      letter-spacing: 0.05rem;
    }
    .title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #f8fafc;
      margin: 0;
    }
    .close-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .close-btn:hover { background: rgba(255, 255, 255, 0.15); color: white; }

    /* Stock Summary Bar */
    .stock-summary-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.75rem;
      padding: 0.75rem 1.25rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .sym-box { display: flex; flex-direction: column; }
    .sym { font-size: 1.2rem; font-weight: 900; color: #f8fafc; }
    .name { font-size: 0.75rem; color: #94a3b8; }
    .price-box { display: flex; flex-direction: column; align-items: flex-end; }
    .price { font-size: 1.15rem; font-weight: 800; color: #f8fafc; }
    .bull { color: #10b981; }
    .bear { color: #ef4444; }
    .ai-box, .fv-box { display: flex; flex-direction: column; align-items: center; }
    .ai-label, .fv-label { font-size: 0.68rem; color: #94a3b8; text-transform: uppercase; }
    .ai-val { font-size: 1rem; font-weight: 800; color: #38bdf8; }
    .fv-val { font-size: 1rem; font-weight: 800; color: #10b981; }

    /* Action Cards */
    .action-cards-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .action-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.85rem;
      padding: 0.9rem 1.15rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .action-card:hover {
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.35);
      transform: translateX(3px);
    }
    .card-icon {
      font-size: 1.5rem;
      width: 44px;
      height: 44px;
      border-radius: 0.65rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
    }
    .card-content { flex: 1; }
    .card-content h4 { margin: 0; font-size: 0.95rem; font-weight: 700; color: #f8fafc; }
    .card-content p { margin: 0.2rem 0 0; font-size: 0.78rem; color: #94a3b8; }
    .card-action-btn {
      padding: 0.45rem 0.9rem;
      border-radius: 0.5rem;
      font-size: 0.78rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .btn-tos { background: #10b981; color: #042f2e; }
    .btn-schwab { background: #0284c7; color: white; }
    .btn-desktop { background: #475569; color: white; }

    /* Order Generator Box */
    .order-generator-box {
      background: #030712;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.85rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .og-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .og-title { font-size: 0.85rem; font-weight: 700; color: #f1f5f9; }
    .og-badge {
      font-size: 0.65rem;
      font-weight: 800;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      padding: 0.15rem 0.45rem;
      border-radius: 0.35rem;
    }
    .og-desc { font-size: 0.76rem; color: #94a3b8; margin: 0; }
    .code-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 0.5rem;
      padding: 0.5rem 0.85rem;
      gap: 0.75rem;
    }
    .code-box code {
      font-family: monospace;
      font-size: 0.82rem;
      color: #38bdf8;
      overflow-x: auto;
      white-space: nowrap;
    }
    .copy-btn {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      padding: 0.35rem 0.75rem;
      border-radius: 0.4rem;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .copy-btn:hover { background: #334155; color: white; }
    .copy-btn.copied { background: #10b981; color: #042f2e; border-color: #10b981; }

    /* Pro Tip Box */
    .pro-tip-box {
      background: rgba(168, 85, 247, 0.08);
      border: 1px solid rgba(168, 85, 247, 0.25);
      border-radius: 0.75rem;
      padding: 0.85rem 1rem;
    }
    .tip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
    }
    .tip-badge { font-size: 0.72rem; font-weight: 800; color: #c084fc; text-transform: uppercase; }
    .tip-meta { font-size: 0.72rem; color: #94a3b8; }
    .tip-body { font-size: 0.8rem; color: #cbd5e1; margin: 0; line-height: 1.4; }
  `]
})
export class TosActionModalComponent {
  @Input({ required: true }) stock!: Stock;
  @Output() close = new EventEmitter<void>();

  private tosService = inject(TosIntegrationService);
  copied = signal<boolean>(false);

  get generatedOrderCommand(): string {
    return this.tosService.generateOrderCommand(this.stock.symbol, this.stock.price, this.stock.targetPrice);
  }

  launchTosWeb(): void {
    this.tosService.openThinkorSwimWeb(this.stock.symbol);
  }

  launchSchwabTicket(): void {
    this.tosService.openSchwabTradeTicket(this.stock.symbol);
  }

  launchDesktopTos(): void {
    // Attempt custom protocol handler for installed desktop app
    window.location.href = `tos://symbol/${this.stock.symbol.toUpperCase()}`;
    // Fallback to web after small delay if user doesn't have protocol handler registered
    setTimeout(() => {
      this.tosService.openThinkorSwimWeb(this.stock.symbol);
    }, 1200);
  }

  async copyCommand(): Promise<void> {
    const ok = await this.tosService.copyOrderCommandToClipboard(this.stock.symbol, this.stock.price, this.stock.targetPrice);
    if (ok) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    }
  }

  getStrategyGuidance(): string {
    if (this.stock.rsi14 < 42) {
      return `RSI is oversold at ${this.stock.rsi14.toFixed(0)}. In ThinkorSwim, set alert for 15-minute MACD histogram crossover above zero to confirm buyer absorption before triggering the limit order.`;
    } else if (this.stock.price >= this.stock.high52w * 0.95) {
      return `Near 52-week high resistance ($${this.stock.high52w.toFixed(2)}). Watch Volume Profile on TOS desktop; enter on volume expansion through the breakout level with a trail stop under the 20 EMA.`;
    } else {
      return `Trading between 50 SMA ($${this.stock.sma50.toFixed(2)}) and 200 SMA ($${this.stock.sma200.toFixed(2)}). Key swing support sits near $${this.stock.sma200.toFixed(2)}. Structure bracket order with stop loss 3% below the 200 SMA.`;
    }
  }
}
