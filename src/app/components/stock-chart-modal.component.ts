import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Stock, HistoricalCandle } from '../models/stock.model';

@Component({
  selector: 'app-stock-chart-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="stock-info">
            <div class="ticker-badge">{{ stock.symbol }}</div>
            <div>
              <h2 class="stock-title">{{ stock.name }}</h2>
              <div class="price-row">
                <span class="stock-price">\${{ stock.price.toFixed(2) }}</span>
                <span class="change-tag" [ngClass]="stock.change >= 0 ? 'bull' : 'bear'">
                  {{ stock.change >= 0 ? '+' : '' }}\${{ stock.change.toFixed(2) }}
                  ({{ stock.changePercent >= 0 ? '+' : '' }}{{ stock.changePercent.toFixed(2) }}%)
                </span>
                <span class="sector-tag">{{ stock.sector }} â€¢ {{ stock.industry }}</span>
              </div>
            </div>
          </div>
          <button class="close-btn" (click)="close.emit()">âœ•</button>
        </div>

        <!-- Controls Bar -->
        <div class="chart-controls">
          <div class="timeframe-buttons">
            <button 
              *ngFor="let tf of timeframes" 
              class="tf-btn" 
              [class.active]="selectedTimeframe() === tf"
              (click)="selectedTimeframe.set(tf)">
              {{ tf }}
            </button>
          </div>

          <div class="indicator-toggles">
            <label class="toggle-label sma20">
              <input type="checkbox" [checked]="showSma20()" (change)="showSma20.set(!showSma20())">
              <span class="color-dot sma20-dot"></span> SMA 20
            </label>
            <label class="toggle-label sma50">
              <input type="checkbox" [checked]="showSma50()" (change)="showSma50.set(!showSma50())">
              <span class="color-dot sma50-dot"></span> SMA 50
            </label>
            <label class="toggle-label sma200">
              <input type="checkbox" [checked]="showSma200()" (change)="showSma200.set(!showSma200())">
              <span class="color-dot sma200-dot"></span> SMA 200
            </label>
            <label class="toggle-label rsi">
              <input type="checkbox" [checked]="showRsi()" (change)="showRsi.set(!showRsi())">
              <span class="color-dot rsi-dot"></span> RSI (14)
            </label>
          </div>
        </div>

        <!-- Chart Canvas / SVG Area -->
        <div class="chart-viewport" (mousemove)="onMouseMove($event)" (mouseleave)="hoveredCandle.set(null)">
          <!-- Hover HUD -->
          <div class="hover-hud" *ngIf="hoveredCandle()">
            <span><strong>Date:</strong> {{ hoveredCandle()?.date }}</span>
            <span><strong>O:</strong> \${{ hoveredCandle()?.open?.toFixed(2) }}</span>
            <span><strong>H:</strong> \${{ hoveredCandle()?.high?.toFixed(2) }}</span>
            <span><strong>L:</strong> \${{ hoveredCandle()?.low?.toFixed(2) }}</span>
            <span><strong>C:</strong> \${{ hoveredCandle()?.close?.toFixed(2) }}</span>
            <span><strong>Vol:</strong> {{ formatVolume(hoveredCandle()?.volume || 0) }}</span>
          </div>

          <!-- Main SVG Candlestick Chart -->
          <svg class="main-svg" [attr.viewBox]="'0 0 ' + chartWidth + ' ' + mainChartHeight">
            <!-- Grid Lines -->
            <line *ngFor="let gl of gridLines()" [attr.x1]="0" [attr.y1]="gl.y" [attr.x2]="chartWidth" [attr.y2]="gl.y" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3" />
            <text *ngFor="let gl of gridLines()" [attr.x]="chartWidth - 55" [attr.y]="gl.y - 4" fill="#64748b" font-size="10">\${{ gl.val.toFixed(1) }}</text>

            <!-- Volume Bars (Translucent Bottom) -->
            <rect 
              *ngFor="let c of candleRenderData()" 
              [attr.x]="c.x - c.width / 2" 
              [attr.y]="mainChartHeight - c.volHeight" 
              [attr.width]="c.width" 
              [attr.height]="c.volHeight" 
              [attr.fill]="c.close >= c.open ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'" />

            <!-- Candlestick Wicks -->
            <line 
              *ngFor="let c of candleRenderData()" 
              [attr.x1]="c.x" 
              [attr.y1]="c.highY" 
              [attr.x2]="c.x" 
              [attr.y2]="c.lowY" 
              [attr.stroke]="c.close >= c.open ? '#10b981' : '#ef4444'" 
              stroke-width="1.2" />

            <!-- Candlestick Bodies -->
            <rect 
              *ngFor="let c of candleRenderData()" 
              [attr.x]="c.x - c.width / 2" 
              [attr.y]="c.bodyY" 
              [attr.width]="c.width" 
              [attr.height]="c.bodyHeight" 
              [attr.fill]="c.close >= c.open ? '#10b981' : '#ef4444'" 
              rx="1" />

            <!-- SMA 20 Line -->
            <path *ngIf="showSma20() && sma20Path()" [attr.d]="sma20Path()" fill="none" stroke="#f59e0b" stroke-width="1.6" />
            <!-- SMA 50 Line -->
            <path *ngIf="showSma50() && sma50Path()" [attr.d]="sma50Path()" fill="none" stroke="#38bdf8" stroke-width="1.6" />
            <!-- SMA 200 Line -->
            <path *ngIf="showSma200() && sma200Path()" [attr.d]="sma200Path()" fill="none" stroke="#c084fc" stroke-width="1.6" />

            <!-- Crosshair Line on Hover -->
            <line *ngIf="hoverX() !== null" [attr.x1]="hoverX()" [attr.y1]="0" [attr.x2]="hoverX()" [attr.y2]="mainChartHeight" stroke="rgba(255,255,255,0.3)" stroke-dasharray="2,2" />
          </svg>

          <!-- RSI Oscillator Sub-chart -->
          <div class="rsi-container" *ngIf="showRsi()">
            <div class="rsi-header">
              <span>RSI (14): <strong [style.color]="stock.rsi14 < 35 ? '#10b981' : (stock.rsi14 > 70 ? '#ef4444' : '#38bdf8')">{{ stock.rsi14.toFixed(1) }}</strong></span>
              <span class="rsi-levels">Overbought (70) | Oversold (30)</span>
            </div>
            <svg class="rsi-svg" [attr.viewBox]="'0 0 ' + chartWidth + ' 70'">
              <!-- Guides -->
              <line [attr.x1]="0" y1="21" [attr.x2]="chartWidth" y2="21" stroke="rgba(239, 68, 68, 0.4)" stroke-dasharray="3,3" />
              <line [attr.x1]="0" y1="49" [attr.x2]="chartWidth" y2="49" stroke="rgba(16, 185, 129, 0.4)" stroke-dasharray="3,3" />
              <!-- RSI Line -->
              <path [attr.d]="rsiPath()" fill="none" stroke="#38bdf8" stroke-width="1.8" />
            </svg>
          </div>
        </div>

        <!-- Footer / Key Technical Metrics -->
        <div class="modal-footer">
          <div class="tech-pill"><span>52W High:</span> <strong>\${{ stock.high52w.toFixed(2) }}</strong></div>
          <div class="tech-pill"><span>52W Low:</span> <strong>\${{ stock.low52w.toFixed(2) }}</strong></div>
          <div class="tech-pill"><span>SMA 50:</span> <strong>\${{ stock.sma50.toFixed(2) }}</strong></div>
          <div class="tech-pill"><span>SMA 200:</span> <strong>\${{ stock.sma200.toFixed(2) }}</strong></div>
          <div class="tech-pill"><span>Beta:</span> <strong>{{ stock.beta.toFixed(2) }}</strong></div>
          <div class="tech-pill"><span>Avg Vol:</span> <strong>{{ formatVolume(stock.avgVolume) }}</strong></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(3, 7, 18, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
    }
    .modal-container {
      width: 100%;
      max-width: 950px;
      background: #0b0f17;
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 1.25rem;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(56, 189, 248, 0.15);
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
      background: rgba(15, 23, 42, 0.6);
    }
    .stock-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .ticker-badge {
      font-size: 1.25rem;
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      padding: 0.4rem 0.85rem;
      border-radius: 0.6rem;
      border: 1px solid rgba(56, 189, 248, 0.3);
      letter-spacing: 0.05rem;
    }
    .stock-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
    }
    .price-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.25rem;
    }
    .stock-price {
      font-size: 1.2rem;
      font-weight: 800;
      color: #f8fafc;
    }
    .change-tag {
      font-size: 0.85rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 0.35rem;
    }
    .change-tag.bull {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }
    .change-tag.bear {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }
    .sector-tag {
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .close-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s;
    }
    .close-btn:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    .chart-controls {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1.5rem;
      background: #0f172a;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      gap: 1rem;
    }
    .timeframe-buttons {
      display: flex;
      gap: 0.35rem;
    }
    .tf-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      padding: 0.35rem 0.75rem;
      border-radius: 0.4rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .tf-btn:hover, .tf-btn.active {
      background: #38bdf8;
      color: #040914;
      font-weight: 700;
    }
    .indicator-toggles {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .toggle-label {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #cbd5e1;
      cursor: pointer;
    }
    .color-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .sma20-dot { background: #f59e0b; }
    .sma50-dot { background: #38bdf8; }
    .sma200-dot { background: #c084fc; }
    .rsi-dot { background: #38bdf8; }

    .chart-viewport {
      position: relative;
      background: #060a12;
      padding: 1rem 1.5rem 0.5rem;
    }
    .hover-hud {
      position: absolute;
      top: 1rem;
      left: 1.5rem;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 0.35rem 0.75rem;
      border-radius: 0.5rem;
      display: flex;
      gap: 0.85rem;
      font-size: 0.78rem;
      color: #94a3b8;
      pointer-events: none;
      z-index: 10;
    }
    .hover-hud strong {
      color: #f1f5f9;
    }
    .main-svg {
      width: 100%;
      height: 330px;
      overflow: visible;
    }
    .rsi-container {
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .rsi-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #94a3b8;
      margin-bottom: 0.2rem;
    }
    .rsi-svg {
      width: 100%;
      height: 65px;
    }
    .modal-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 0.85rem 1.5rem;
      background: #0f172a;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .tech-pill {
      background: rgba(255, 255, 255, 0.04);
      padding: 0.3rem 0.65rem;
      border-radius: 0.4rem;
      font-size: 0.78rem;
      color: #94a3b8;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .tech-pill strong {
      color: #e2e8f0;
      margin-left: 0.25rem;
    }
  `]
})
export class StockChartModalComponent {
  @Input({ required: true }) stock!: Stock;
  @Output() close = new EventEmitter<void>();

  readonly chartWidth = 900;
  readonly mainChartHeight = 310;
  readonly timeframes = ['1W', '1M', '3M', '6M', '1Y'];
  readonly selectedTimeframe = signal<string>('3M');

  readonly showSma20 = signal(true);
  readonly showSma50 = signal(true);
  readonly showSma200 = signal(false);
  readonly showRsi = signal(true);

  readonly hoveredCandle = signal<HistoricalCandle | null>(null);
  readonly hoverX = signal<number | null>(null);

  onBackdropClick(event: MouseEvent) {
    this.close.emit();
  }

  // Filter candles based on selected timeframe
  candlesForTimeframe = computed(() => {
    const all = this.stock.candles || [];
    const tf = this.selectedTimeframe();
    let count = 60;
    if (tf === '1W') count = 5;
    else if (tf === '1M') count = 22;
    else if (tf === '3M') count = 65;
    else if (tf === '6M') count = 80;
    else if (tf === '1Y') count = all.length;
    return all.slice(-count);
  });

  priceBounds = computed(() => {
    const list = this.candlesForTimeframe();
    if (list.length === 0) return { min: 100, max: 150 };
    let min = Infinity;
    let max = -Infinity;
    for (const c of list) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    }
    const pad = (max - min) * 0.08 || 5;
    return { min: min - pad, max: max + pad };
  });

  gridLines = computed(() => {
    const { min, max } = this.priceBounds();
    const step = (max - min) / 4;
    return [0, 1, 2, 3, 4].map(i => {
      const val = min + step * i;
      const y = this.mainChartHeight - ((val - min) / (max - min)) * (this.mainChartHeight - 40) - 20;
      return { val, y };
    });
  });

  candleRenderData = computed(() => {
    const list = this.candlesForTimeframe();
    if (list.length === 0) return [];
    const { min, max } = this.priceBounds();
    const availableWidth = this.chartWidth - 70;
    const spacing = availableWidth / list.length;
    const candleWidth = Math.max(3, Math.min(18, spacing * 0.7));

    let maxVol = 1;
    for (const c of list) {
      if (c.volume > maxVol) maxVol = c.volume;
    }

    return list.map((c, i) => {
      const x = 20 + i * spacing + spacing / 2;
      const toY = (val: number) => this.mainChartHeight - ((val - min) / (max - min)) * (this.mainChartHeight - 50) - 25;
      const highY = toY(c.high);
      const lowY = toY(c.low);
      const openY = toY(c.open);
      const closeY = toY(c.close);
      const bodyY = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(openY - closeY));
      const volHeight = (c.volume / maxVol) * 45;

      return {
        ...c,
        x,
        width: candleWidth,
        highY,
        lowY,
        bodyY,
        bodyHeight,
        volHeight
      };
    });
  });

  sma20Path = computed(() => this.buildSmaPath(20));
  sma50Path = computed(() => this.buildSmaPath(50));
  sma200Path = computed(() => this.buildSmaPath(200));

  private buildSmaPath(period: number): string {
    const candles = this.candleRenderData();
    if (candles.length < 5) return '';
    const { min, max } = this.priceBounds();

    let d = '';
    for (let i = 0; i < candles.length; i++) {
      const slice = candles.slice(Math.max(0, i - period + 1), i + 1);
      const avg = slice.reduce((acc, curr) => acc + curr.close, 0) / slice.length;
      const y = this.mainChartHeight - ((avg - min) / (max - min)) * (this.mainChartHeight - 50) - 25;
      const x = candles[i].x;
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  }

  rsiPath = computed(() => {
    const candles = this.candleRenderData();
    if (candles.length === 0) return '';
    let d = '';
    for (let i = 0; i < candles.length; i++) {
      // Synthetic oscillating RSI tied to short-term candle momentum
      const rsiVal = Math.min(90, Math.max(15, this.stock.rsi14 + Math.sin(i * 0.4) * 12));
      const y = 70 - (rsiVal / 100) * 70;
      const x = candles[i].x;
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  });

  onMouseMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const candles = this.candleRenderData();
    if (candles.length === 0) return;

    let closest = candles[0];
    let minDiff = Infinity;
    for (const c of candles) {
      const diff = Math.abs(c.x - (mouseX * (this.chartWidth / rect.width)));
      if (diff < minDiff) {
        minDiff = diff;
        closest = c;
      }
    }
    this.hoveredCandle.set(closest);
    this.hoverX.set(closest.x);
  }

  formatVolume(v: number): string {
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
    return v.toString();
  }
}

