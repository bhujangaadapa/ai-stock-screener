import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreStockService } from '../services/firestore-stock.service';
import { AiScreenerService, AIScreenResult } from '../services/ai-screener.service';
import { Stock, ScreenerViewMode, StockFilterCriteria, SectorPerformance } from '../models/stock.model';
import { StockChartModalComponent } from './stock-chart-modal.component';
import { StockDetailModalComponent } from './stock-detail-modal.component';
import { StrategyLifecycleComponent } from './strategy-lifecycle.component';
import { GroupInsightsComponent } from './group-insights.component';
import { GroupTradeInsight } from '../models/group-insight.model';

@Component({
  selector: 'app-stock-scanner',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StockChartModalComponent,
    StockDetailModalComponent,
    StrategyLifecycleComponent,
    GroupInsightsComponent
  ],
  template: `
    <div class="scanner-root">
      <!-- 1. Ticker Tape Marquee -->
      <div class="ticker-tape">
        <div class="tape-track">
          <div *ngFor="let index of marketIndices" class="tape-item">
            <span class="tape-sym">{{ index.name }}</span>
            <span class="tape-val">{{ index.value }}</span>
            <span class="tape-change" [ngClass]="index.change >= 0 ? 'bull' : 'bear'">
              {{ index.change >= 0 ? '+' : '' }}{{ index.change.toFixed(2) }}%
            </span>
          </div>
          <!-- Repeat items to produce seamless marquee loop -->
          <div *ngFor="let index of marketIndices" class="tape-item">
            <span class="tape-sym">{{ index.name }}</span>
            <span class="tape-val">{{ index.value }}</span>
            <span class="tape-change" [ngClass]="index.change >= 0 ? 'bull' : 'bear'">
              {{ index.change >= 0 ? '+' : '' }}{{ index.change.toFixed(2) }}%
            </span>
          </div>
        </div>
      </div>

      <!-- Main Container -->
      <div class="scanner-container">
        <!-- 2. Header & Branding -->
        <header class="app-header">
          <div class="brand-left">
            <div class="logo-box">
              <span class="logo-icon">⚡</span>
            </div>
            <div>
              <div class="brand-title-row">
                <h1 class="brand-title">AURA <span class="highlight">AI</span></h1>
                <span class="pro-tag">QUANT SCANNER</span>
              </div>
              <p class="brand-subtitle">
                Institutional-grade AI stock screening • Multi-factor Danelfin models • Real-time Firebase sync
              </p>
            </div>
          </div>

          <div class="header-actions">
            <!-- Firestore Status & Seeder Button -->
            <div class="firestore-status-badge" [class.synced]="stockService.isFirestoreSynced()">
              <span class="status-pulse"></span>
              {{ stockService.isFirestoreSynced() ? 'Firestore Live Sync' : 'In-Memory / Local Cache' }}
            </div>
            <button 
              class="seed-btn" 
              [disabled]="stockService.isSeeding()" 
              (click)="stockService.seedFirestoreDatabase()"
              title="Upload 100+ stock dataset to Firebase Cloud Firestore">
              <span *ngIf="!stockService.isSeeding()">⚡ Seed Firestore</span>
              <span *ngIf="stockService.isSeeding()">⏳ Seeding...</span>
            </button>
          </div>
        </header>

        <!-- Notification Banner if Seeding Message -->
        <div *ngIf="stockService.seedMessage()" class="seed-notification">
          {{ stockService.seedMessage() }}
        </div>

        <!-- 3. Conversational AI Prompt Bar -->
        <div class="ai-hero-box">
          <div class="ai-input-wrap">
            <span class="ai-wand">🤖</span>
            <input 
              type="text" 
              class="ai-input" 
              placeholder="Ask AI to screen stocks (e.g. 'Undervalued tech with P/E < 25', 'Safe dividend yield > 3.5%', 'Breakouts near 52W high')..." 
              [(ngModel)]="aiSearchQuery"
              (keyup.enter)="executeAiQuery()" />
            <button class="ai-search-btn" (click)="executeAiQuery()">
              Analyze & Screen
            </button>
          </div>

          <!-- Quick AI Suggestion Chips -->
          <div class="suggestion-chips">
            <span class="chips-label">Quick Prompts:</span>
            <button 
              *ngFor="let prompt of samplePrompts" 
              class="chip-btn" 
              (click)="selectPrompt(prompt)">
              {{ prompt }}
            </button>
          </div>

          <!-- Active AI Strategy Banner -->
          <div *ngIf="activeAiSummary()" class="ai-active-strategy">
            <div class="strategy-text">
              <span class="sparkle">✨</span>
              <span>{{ activeAiSummary() }}</span>
              <span class="count-tag">{{ filteredStocks().length }} matching stocks</span>
            </div>
            <button class="clear-ai-btn" (click)="clearAiFilter()">✕ Clear AI Filter</button>
          </div>
        </div>

        <!-- 4. Macro Pulse Bar -->
        <div class="macro-bar">
          <div class="macro-card">
            <span class="m-label">Market Sentiment</span>
            <div class="sentiment-indicator">
              <span class="sentiment-val">74</span>
              <span class="sentiment-badge greed">GREED</span>
            </div>
          </div>
          <div class="macro-card">
            <span class="m-label">Market Breadth</span>
            <div class="breadth-val">
              <span class="bull">▲ 76% Advancing</span>
              <span class="bear">▼ 24% Decliners</span>
            </div>
          </div>
          <div class="macro-card">
            <span class="m-label">Top Sector Today</span>
            <div class="sector-lead">
              <strong>Technology</strong>
              <span class="bull">+1.84%</span>
            </div>
          </div>
          <div class="macro-card">
            <span class="m-label">AI High-Conviction (9+)</span>
            <div class="top-picks-count">
              <strong>{{ highConvictionCount() }}</strong> Equities
            </div>
          </div>
        </div>

        <!-- 5. Main View Tabs -->
        <div class="view-tabs-bar">
          <div class="left-tabs">
            <button 
              class="view-tab-btn" 
              [class.active]="currentMainTab() === 'screener'" 
              (click)="currentMainTab.set('screener')">
              🔍 AI Screener Table
            </button>
            <button 
              class="view-tab-btn" 
              [class.active]="currentMainTab() === 'heatmap'" 
              (click)="currentMainTab.set('heatmap')">
              🗺️ Sector Heatmap
            </button>
            <button 
              class="view-tab-btn" 
              [class.active]="currentMainTab() === 'watchlist'" 
              (click)="currentMainTab.set('watchlist')">
              ⭐ Watchlist ({{ stockService.watchlist().length }})
            </button>
            <button 
              class="view-tab-btn" 
              [class.active]="currentMainTab() === 'strategy'" 
              (click)="currentMainTab.set('strategy')">
              🚀 Strategy Lifecycle & Lab
            </button>
            <button 
              class="view-tab-btn wa-tab-btn" 
              [class.active]="currentMainTab() === 'insights'" 
              (click)="currentMainTab.set('insights')">
              💬 WhatsApp & Group Insights
            </button>
          </div>

          <!-- Controls for Screener view -->
          <div class="right-controls" *ngIf="currentMainTab() === 'screener'">
            <button class="export-btn" (click)="exportCsv()">
              ⬇️ Export CSV
            </button>
          </div>
        </div>

        <!-- ================= VIEW 1: SCREENER TABLE ================= -->
        <div *ngIf="currentMainTab() === 'screener'" class="screener-section">
          <!-- Screener Sub-Nav & Filters -->
          <div class="table-controls-bar">
            <!-- View Mode Switcher -->
            <div class="subview-buttons">
              <button 
                *ngFor="let mode of viewModes" 
                class="subview-btn" 
                [class.active]="activeViewMode() === mode.key"
                (click)="activeViewMode.set(mode.key)">
                {{ mode.label }}
              </button>
            </div>

            <!-- Manual Filter Inputs -->
            <div class="filter-inputs">
              <select class="filter-select" [(ngModel)]="selectedSector" (change)="applyFilters()">
                <option value="">All Sectors ({{ allSectors.length }})</option>
                <option *ngFor="let s of allSectors" [value]="s">{{ s }}</option>
              </select>

              <select class="filter-select" [(ngModel)]="selectedMinScore" (change)="applyFilters()">
                <option [ngValue]="0">All AI Scores</option>
                <option [ngValue]="9">Score 9+ (Strong Buy)</option>
                <option [ngValue]="8">Score 8+ (Buy)</option>
                <option [ngValue]="7">Score 7+ (Outperform)</option>
              </select>

              <input 
                type="text" 
                class="filter-search" 
                placeholder="Search symbol, name..." 
                [(ngModel)]="manualSearchText"
                (input)="applyFilters()" />
            </div>
          </div>

          <!-- Multi-View Finviz-Style Table -->
          <div class="table-wrapper">
            <table class="finviz-table">
              <thead>
                <tr>
                  <th (click)="toggleSort('symbol')" class="sortable">Ticker</th>
                  <th (click)="toggleSort('name')" class="sortable">Company Name</th>
                  <th (click)="toggleSort('sector')" class="sortable">Sector</th>
                  <th (click)="toggleSort('price')" class="sortable text-right">Price</th>
                  <th (click)="toggleSort('changePercent')" class="sortable text-right">Change %</th>
                  <th (click)="toggleSort('aiScore.overall')" class="sortable text-center">AI Score</th>

                  <!-- Dynamic Columns based on activeViewMode -->
                  <!-- OVERVIEW -->
                  <ng-container *ngIf="activeViewMode() === 'overview'">
                    <th (click)="toggleSort('marketCap')" class="sortable text-right">Market Cap</th>
                    <th (click)="toggleSort('pe')" class="sortable text-right">P/E</th>
                    <th (click)="toggleSort('rsi14')" class="sortable text-right">RSI(14)</th>
                    <th (click)="toggleSort('volume')" class="sortable text-right">Volume</th>
                    <th class="text-center">Trend</th>
                  </ng-container>

                  <!-- VALUATION -->
                  <ng-container *ngIf="activeViewMode() === 'valuation'">
                    <th (click)="toggleSort('pe')" class="sortable text-right">P/E</th>
                    <th (click)="toggleSort('forwardPe')" class="sortable text-right">Fwd P/E</th>
                    <th (click)="toggleSort('peg')" class="sortable text-right">PEG</th>
                    <th (click)="toggleSort('ps')" class="sortable text-right">P/S</th>
                    <th (click)="toggleSort('targetPrice')" class="sortable text-right">Target Price</th>
                    <th class="text-right">Upside %</th>
                  </ng-container>

                  <!-- TECHNICALS -->
                  <ng-container *ngIf="activeViewMode() === 'technicals'">
                    <th (click)="toggleSort('rsi14')" class="sortable text-right">RSI (14)</th>
                    <th (click)="toggleSort('sma50')" class="sortable text-right">SMA 50</th>
                    <th (click)="toggleSort('sma200')" class="sortable text-right">SMA 200</th>
                    <th (click)="toggleSort('beta')" class="sortable text-right">Beta</th>
                    <th class="text-center">52W Range</th>
                  </ng-container>

                  <!-- FINANCIALS -->
                  <ng-container *ngIf="activeViewMode() === 'financials'">
                    <th (click)="toggleSort('roe')" class="sortable text-right">ROE</th>
                    <th (click)="toggleSort('debtToEquity')" class="sortable text-right">Debt/Eq</th>
                    <th (click)="toggleSort('freeCashFlow')" class="sortable text-right">FCF ($B)</th>
                    <th (click)="toggleSort('epsGrowth')" class="sortable text-right">EPS Growth</th>
                    <th (click)="toggleSort('dividendYield')" class="sortable text-right">Div Yield</th>
                  </ng-container>

                  <!-- ACTIONS -->
                  <th class="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let stock of filteredStocks()" class="stock-row" (click)="openAiDossier(stock)">
                  <!-- Ticker & Watchlist Star -->
                  <td>
                    <div class="ticker-col">
                      <button 
                        class="star-btn" 
                        [class.starred]="stockService.isInWatchlist(stock.symbol)" 
                        (click)="toggleWatchlist($event, stock.symbol)"
                        title="Toggle Watchlist">
                        {{ stockService.isInWatchlist(stock.symbol) ? 'â˜…' : '☆' }}
                      </button>
                      <span class="ticker-sym">{{ stock.symbol }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="name-cell">
                      <span class="full-name">{{ stock.name }}</span>
                      <span *ngIf="stock.aiReasonTag" class="reason-pill">{{ stock.aiReasonTag }}</span>
                    </div>
                  </td>
                  <td><span class="sector-badge">{{ stock.sector }}</span></td>
                  <td class="text-right font-bold">\${{ stock.price.toFixed(2) }}</td>
                  <td class="text-right">
                    <span class="change-tag" [ngClass]="stock.change >= 0 ? 'bull' : 'bear'">
                      {{ stock.change >= 0 ? '+' : '' }}{{ stock.changePercent.toFixed(2) }}%
                    </span>
                  </td>
                  <!-- AI Score Badge (Danelfin-style) -->
                  <td class="text-center">
                    <span class="ai-score-pill" [ngClass]="getScorePillClass(stock.aiScore.overall)">
                      <strong>{{ stock.aiScore.overall }}</strong>/10
                    </span>
                  </td>

                  <!-- OVERVIEW VIEW COLUMNS -->
                  <ng-container *ngIf="activeViewMode() === 'overview'">
                    <td class="text-right font-num">\${{ stock.marketCap }}B</td>
                    <td class="text-right font-num">{{ stock.pe.toFixed(1) }}</td>
                    <td class="text-right font-num" [style.color]="stock.rsi14 < 35 ? '#10b981' : (stock.rsi14 > 70 ? '#ef4444' : '#cbd5e1')">
                      {{ stock.rsi14.toFixed(1) }}
                    </td>
                    <td class="text-right font-num">{{ formatVolume(stock.volume) }}</td>
                    <td class="text-center">
                      <svg class="sparkline-svg" viewBox="0 0 60 20">
                        <polyline 
                          [attr.points]="getSparklinePoints(stock.sparkline)" 
                          fill="none" 
                          [attr.stroke]="stock.change >= 0 ? '#10b981' : '#ef4444'" 
                          stroke-width="1.8" />
                      </svg>
                    </td>
                  </ng-container>

                  <!-- VALUATION VIEW COLUMNS -->
                  <ng-container *ngIf="activeViewMode() === 'valuation'">
                    <td class="text-right font-num">{{ stock.pe.toFixed(1) }}</td>
                    <td class="text-right font-num">{{ stock.forwardPe.toFixed(1) }}</td>
                    <td class="text-right font-num" [style.color]="stock.peg < 1.2 ? '#10b981' : '#cbd5e1'">{{ stock.peg.toFixed(2) }}</td>
                    <td class="text-right font-num">{{ stock.ps.toFixed(1) }}</td>
                    <td class="text-right font-num">\${{ stock.targetPrice.toFixed(2) }}</td>
                    <td class="text-right font-num" [style.color]="stock.targetPrice > stock.price ? '#10b981' : '#ef4444'">
                      {{ getUpsidePct(stock.targetPrice, stock.price) }}
                    </td>
                  </ng-container>

                  <!-- TECHNICALS VIEW COLUMNS -->
                  <ng-container *ngIf="activeViewMode() === 'technicals'">
                    <td class="text-right font-num">{{ stock.rsi14.toFixed(1) }}</td>
                    <td class="text-right font-num">\${{ stock.sma50.toFixed(2) }}</td>
                    <td class="text-right font-num">\${{ stock.sma200.toFixed(2) }}</td>
                    <td class="text-right font-num">{{ stock.beta.toFixed(2) }}</td>
                    <td class="text-center">
                      <div class="range-bar-wrap">
                        <div class="range-track">
                          <div class="range-dot" [style.left.%]="get52wPercent(stock)"></div>
                        </div>
                      </div>
                    </td>
                  </ng-container>

                  <!-- FINANCIALS VIEW COLUMNS -->
                  <ng-container *ngIf="activeViewMode() === 'financials'">
                    <td class="text-right font-num">{{ stock.roe.toFixed(1) }}%</td>
                    <td class="text-right font-num" [style.color]="stock.debtToEquity < 0.6 ? '#10b981' : '#cbd5e1'">{{ stock.debtToEquity.toFixed(2) }}</td>
                    <td class="text-right font-num">\${{ stock.freeCashFlow }}B</td>
                    <td class="text-right font-num" [style.color]="stock.epsGrowth > 20 ? '#10b981' : '#cbd5e1'">{{ stock.epsGrowth.toFixed(1) }}%</td>
                    <td class="text-right font-num font-bold" [style.color]="stock.dividendYield >= 2.5 ? '#10b981' : '#94a3b8'">
                      {{ stock.dividendYield.toFixed(2) }}%
                    </td>
                  </ng-container>

                  <!-- ACTION BUTTONS -->
                  <td class="text-center" (click)="$event.stopPropagation()">
                    <div class="actions-cell">
                      <button class="action-btn chart-action" (click)="openChart(stock)" title="Interactive Candlestick Chart">
                        📊 Chart
                      </button>
                      <button class="action-btn ai-action" (click)="openAiDossier(stock)" title="AI Conviction Dossier">
                        🧠 Dossier
                      </button>
                      <button class="action-btn strategy-action" (click)="launchStrategyLab(stock)" title="Launch Strategy Lifecycle & Backtest Lab">
                        ⚡ Strategy
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ================= VIEW 2: SECTOR HEATMAP ================= -->
        <div *ngIf="currentMainTab() === 'heatmap'" class="heatmap-section">
          <div class="heatmap-header">
            <h3>S&P 500 Sector Performance & Breadth</h3>
            <p>Visual market map of all 11 sectors. Click any sector card to filter the AI Screener table.</p>
          </div>
          <div class="heatmap-grid">
            <div 
              *ngFor="let s of sectorPerformanceList" 
              class="sector-card" 
              [ngClass]="getSectorTheme(s.changePercent)"
              (click)="filterBySector(s.name)">
              <div class="sc-top">
                <span class="sc-name">{{ s.name }}</span>
                <span class="sc-change" [ngClass]="s.changePercent >= 0 ? 'bull' : 'bear'">
                  {{ s.changePercent >= 0 ? '+' : '' }}{{ s.changePercent.toFixed(2) }}%
                </span>
              </div>
              <div class="sc-bottom">
                <span class="sc-top-stock">Lead: <strong>{{ s.topStock }}</strong></span>
                <span class="sc-count">{{ s.stockCount }} tracked</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ================= VIEW 3: WATCHLIST ================= -->
        <div *ngIf="currentMainTab() === 'watchlist'" class="watchlist-section">
          <div class="wl-header">
            <div>
              <h3>Personal Watchlist ({{ stockService.watchlist().length }} Equities)</h3>
              <p>Real-time tracked tickers synchronized with your cloud account.</p>
            </div>
          </div>

          <div *ngIf="watchlistStocks().length === 0" class="empty-wl">
            <span class="empty-icon">☆</span>
            <p>Your watchlist is currently empty. Star tickers in the AI Screener to monitor them here.</p>
          </div>

          <div *ngIf="watchlistStocks().length > 0" class="table-wrapper">
            <table class="finviz-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Company</th>
                  <th>Sector</th>
                  <th class="text-right">Price</th>
                  <th class="text-right">Daily Change</th>
                  <th class="text-center">AI Score</th>
                  <th class="text-right">DCF Fair Value</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let stock of watchlistStocks()" class="stock-row" (click)="openAiDossier(stock)">
                  <td>
                    <div class="ticker-col">
                      <span class="star-btn starred" (click)="toggleWatchlist($event, stock.symbol)">â˜…</span>
                      <span class="ticker-sym">{{ stock.symbol }}</span>
                    </div>
                  </td>
                  <td>{{ stock.name }}</td>
                  <td><span class="sector-badge">{{ stock.sector }}</span></td>
                  <td class="text-right font-bold">\${{ stock.price.toFixed(2) }}</td>
                  <td class="text-right">
                    <span class="change-tag" [ngClass]="stock.change >= 0 ? 'bull' : 'bear'">
                      {{ stock.change >= 0 ? '+' : '' }}{{ stock.changePercent.toFixed(2) }}%
                    </span>
                  </td>
                  <td class="text-center">
                    <span class="ai-score-pill" [ngClass]="getScorePillClass(stock.aiScore.overall)">
                      {{ stock.aiScore.overall }}/10
                    </span>
                  </td>
                  <td class="text-right font-num" [style.color]="stock.aiScore.fairValue > stock.price ? '#10b981' : '#ef4444'">
                    \${{ stock.aiScore.fairValue.toFixed(2) }}
                  </td>
                  <td class="text-center" (click)="$event.stopPropagation()">
                    <div class="actions-cell">
                      <button class="action-btn chart-action" (click)="openChart(stock)">📊 Chart</button>
                      <button class="action-btn" (click)="stockService.toggleWatchlist(stock.symbol)" style="color: #ef4444;">✕ Remove</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ================= VIEW 4: STRATEGY LIFECYCLE LAB ================= -->
        <div *ngIf="currentMainTab() === 'strategy'" class="strategy-section">
          <app-strategy-lifecycle></app-strategy-lifecycle>
        </div>

        <!-- ================= VIEW 5: WHATSAPP & GROUP INSIGHTS ================= -->
        <div *ngIf="currentMainTab() === 'insights'" class="insights-section">
          <app-group-insights 
            (launchQuantLab)="handleLaunchInsightStrategy($event)"
            (inspectChart)="handleInspectInsightChart($event)">
          </app-group-insights>
        </div>
      </div>

      <!-- Modals -->
      <app-stock-chart-modal 
        *ngIf="selectedChartStock()" 
        [stock]="selectedChartStock()!" 
        (close)="selectedChartStock.set(null)">
      </app-stock-chart-modal>

      <app-stock-detail-modal 
        *ngIf="selectedDossierStock()" 
        [stock]="selectedDossierStock()!" 
        (close)="selectedDossierStock.set(null)">
      </app-stock-detail-modal>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      background: #030712;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
    }
    .scanner-root {
      width: 100%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* 1. Ticker Tape */
    .ticker-tape {
      width: 100%;
      height: 38px;
      background: #090e17;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      overflow: hidden;
      display: flex;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .tape-track {
      display: flex;
      align-items: center;
      white-space: nowrap;
      animation: marquee 45s linear infinite;
    }
    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .tape-item {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0 1.25rem;
      font-size: 0.78rem;
      font-weight: 600;
      border-right: 1px solid rgba(255, 255, 255, 0.05);
    }
    .tape-sym { color: #94a3b8; }
    .tape-val { color: #f8fafc; font-weight: 700; }
    .tape-change.bull { color: #10b981; }
    .tape-change.bear { color: #ef4444; }

    /* Main Container */
    .scanner-container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 1.5rem 1.25rem 3rem;
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* Header */
    .app-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .logo-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
    }
    .brand-title-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .brand-title {
      font-size: 1.75rem;
      font-weight: 900;
      letter-spacing: -0.04rem;
      margin: 0;
      color: #f8fafc;
    }
    .brand-title .highlight {
      background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .pro-tag {
      font-size: 0.65rem;
      font-weight: 800;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      padding: 0.2rem 0.5rem;
      border-radius: 0.35rem;
      border: 1px solid rgba(56, 189, 248, 0.3);
      letter-spacing: 0.05rem;
    }
    .brand-subtitle {
      font-size: 0.85rem;
      color: #94a3b8;
      margin: 0.2rem 0 0;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .firestore-status-badge {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.05);
      padding: 0.4rem 0.8rem;
      border-radius: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .firestore-status-badge.synced {
      color: #10b981;
      border-color: rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.1);
    }
    .status-pulse {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #94a3b8;
    }
    .firestore-status-badge.synced .status-pulse {
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }
    .seed-btn {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      border: none;
      padding: 0.45rem 1rem;
      border-radius: 0.6rem;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
      transition: all 0.2s;
    }
    .seed-btn:hover:not(:disabled) {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }
    .seed-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .seed-notification {
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      padding: 0.65rem 1.25rem;
      border-radius: 0.6rem;
      font-size: 0.82rem;
      font-weight: 600;
    }

    /* 3. Hero AI Search Box */
    .ai-hero-box {
      background: radial-gradient(circle at 50% 0%, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.6) 100%);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 1.25rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.6);
    }
    .ai-input-wrap {
      display: flex;
      align-items: center;
      background: #090e17;
      border: 1px solid rgba(56, 189, 248, 0.4);
      border-radius: 0.85rem;
      padding: 0.4rem 0.5rem 0.4rem 1rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }
    .ai-wand { font-size: 1.3rem; margin-right: 0.75rem; }
    .ai-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #f8fafc;
      font-size: 0.95rem;
    }
    .ai-input::placeholder { color: #64748b; }
    .ai-search-btn {
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      color: white;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 0.6rem;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
      transition: all 0.2s;
    }
    .ai-search-btn:hover { filter: brightness(1.15); }
    .suggestion-chips {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .chips-label { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }
    .chip-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      padding: 0.35rem 0.75rem;
      border-radius: 2rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .chip-btn:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: rgba(56, 189, 248, 0.35);
      color: #38bdf8;
    }
    .ai-active-strategy {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 0.5rem 1rem;
      border-radius: 0.6rem;
      font-size: 0.82rem;
      color: #38bdf8;
    }
    .strategy-text { display: flex; align-items: center; gap: 0.6rem; }
    .count-tag {
      background: #0284c7;
      color: white;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 1rem;
    }
    .clear-ai-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .clear-ai-btn:hover { color: #f87171; }

    /* 4. Macro Pulse Bar */
    .macro-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 1rem;
    }
    .macro-card {
      background: #090e17;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 0.85rem;
      padding: 0.85rem 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .m-label { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }
    .sentiment-indicator { display: flex; align-items: center; gap: 0.5rem; }
    .sentiment-val { font-size: 1.25rem; font-weight: 900; color: #f8fafc; }
    .sentiment-badge.greed {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.15rem 0.45rem;
      border-radius: 0.35rem;
    }
    .breadth-val { display: flex; gap: 0.75rem; font-size: 0.85rem; font-weight: 700; }
    .sector-lead { display: flex; gap: 0.5rem; align-items: center; font-size: 0.95rem; }
    .top-picks-count { font-size: 1.1rem; color: #38bdf8; }

    /* 5. View Tabs Bar */
    .view-tabs-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 0.75rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .left-tabs { display: flex; gap: 0.5rem; }
    .view-tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: #94a3b8;
      padding: 0.5rem 1rem;
      border-radius: 0.6rem;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .view-tab-btn:hover { color: #f8fafc; }
    .view-tab-btn.active {
      background: rgba(56, 189, 248, 0.12);
      border-color: rgba(56, 189, 248, 0.3);
      color: #38bdf8;
    }
    .export-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      padding: 0.45rem 0.9rem;
      border-radius: 0.5rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .export-btn:hover { background: rgba(255, 255, 255, 0.1); color: white; }

    /* Controls Bar within Screener */
    .table-controls-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 0.85rem;
    }
    .subview-buttons { display: flex; gap: 0.35rem; }
    .subview-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      padding: 0.35rem 0.75rem;
      border-radius: 0.4rem;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      text-transform: capitalize;
    }
    .subview-btn:hover, .subview-btn.active {
      background: #0284c7;
      color: white;
      border-color: #0284c7;
    }
    .filter-inputs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .filter-select, .filter-search {
      background: #090e17;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      padding: 0.35rem 0.75rem;
      border-radius: 0.4rem;
      font-size: 0.8rem;
      outline: none;
    }
    .filter-search { width: 170px; }

    /* Finviz Table */
    .table-wrapper {
      width: 100%;
      overflow-x: auto;
      background: #090e17;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.85rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .finviz-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
      text-align: left;
    }
    .finviz-table th {
      background: #0f172a;
      color: #94a3b8;
      font-weight: 700;
      padding: 0.75rem 0.85rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      white-space: nowrap;
      user-select: none;
    }
    .finviz-table th.sortable { cursor: pointer; }
    .finviz-table th.sortable:hover { color: #38bdf8; }
    .finviz-table td {
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      white-space: nowrap;
    }
    .stock-row { cursor: pointer; transition: background 0.15s; }
    .stock-row:hover { background: rgba(56, 189, 248, 0.06); }

    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .font-num { font-variant-numeric: tabular-nums; }
    .bull { color: #10b981; }
    .bear { color: #ef4444; }

    .ticker-col { display: flex; align-items: center; gap: 0.4rem; }
    .star-btn {
      background: transparent;
      border: none;
      font-size: 1.1rem;
      color: #64748b;
      cursor: pointer;
      padding: 0;
    }
    .star-btn.starred { color: #f59e0b; }
    .ticker-sym {
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.08);
      padding: 0.15rem 0.4rem;
      border-radius: 0.3rem;
    }
    .name-cell { display: flex; flex-direction: column; gap: 0.15rem; }
    .full-name { font-weight: 600; color: #f1f5f9; }
    .reason-pill {
      font-size: 0.68rem;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      padding: 0.1rem 0.35rem;
      border-radius: 0.25rem;
      display: inline-block;
      width: fit-content;
    }
    .sector-badge {
      font-size: 0.72rem;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.04);
      padding: 0.2rem 0.45rem;
      border-radius: 0.3rem;
    }
    .change-tag {
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 0.3rem;
      display: inline-block;
    }
    .change-tag.bull { background: rgba(16, 185, 129, 0.12); }
    .change-tag.bear { background: rgba(239, 68, 68, 0.12); }

    /* Danelfin AI Score Pill */
    .ai-score-pill {
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: 1rem;
      display: inline-block;
    }
    .score-strong-buy { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4); }
    .score-buy { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); }
    .score-hold { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); }
    .score-sell { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); }

    .sparkline-svg { width: 60px; height: 20px; }
    .range-bar-wrap { width: 70px; margin: 0 auto; }
    .range-track {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      position: relative;
    }
    .range-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #38bdf8;
      position: absolute;
      top: -2px;
      transform: translateX(-50%);
    }

    .actions-cell { display: flex; gap: 0.35rem; justify-content: center; }
    .action-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      padding: 0.25rem 0.55rem;
      border-radius: 0.35rem;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .action-btn:hover { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
    .chart-action:hover { border-color: #38bdf8; }
    .ai-action:hover { border-color: #a855f7; color: #c084fc; }
    .strategy-action:hover { border-color: #a855f7; color: #c084fc; }

    /* Heatmap Grid */
    .heatmap-section { display: flex; flex-direction: column; gap: 1rem; }
    .heatmap-header h3 { font-size: 1.2rem; margin: 0; }
    .heatmap-header p { font-size: 0.85rem; color: #94a3b8; margin: 0.2rem 0 0; }
    .heatmap-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
    }
    .sector-card {
      padding: 1.2rem;
      border-radius: 0.85rem;
      border: 1px solid;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .sector-card:hover { transform: translateY(-2px); }
    .sector-card.bull-dark { background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.3); }
    .sector-card.bull-light { background: rgba(16, 185, 129, 0.06); border-color: rgba(16, 185, 129, 0.2); }
    .sector-card.bear-light { background: rgba(239, 68, 68, 0.06); border-color: rgba(239, 68, 68, 0.2); }
    .sector-card.bear-dark { background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.3); }
    .sc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .sc-name { font-size: 1rem; font-weight: 700; color: #f8fafc; }
    .sc-change { font-size: 1rem; font-weight: 800; }
    .sc-bottom { display: flex; justify-content: space-between; font-size: 0.78rem; color: #94a3b8; }

    /* Watchlist Section */
    .empty-wl {
      text-align: center;
      padding: 4rem 1rem;
      background: #090e17;
      border-radius: 0.85rem;
      border: 1px dashed rgba(255, 255, 255, 0.1);
    }
    .empty-icon { font-size: 2.5rem; color: #64748b; }
    .empty-wl p { color: #94a3b8; font-size: 0.9rem; margin-top: 0.5rem; }
  `]
})
export class StockScannerComponent {
  readonly stockService = inject(FirestoreStockService);
  readonly aiScreener = inject(AiScreenerService);

  // Active View Tabs
  readonly currentMainTab = signal<'screener' | 'heatmap' | 'watchlist' | 'strategy' | 'insights'>('screener');
  readonly activeViewMode = signal<ScreenerViewMode>('overview');

  // AI & Search state
  aiSearchQuery = '';
  activeAiSummary = signal<string>('');
  private activeCriteria = signal<StockFilterCriteria>({});

  // Manual Filter inputs
  selectedSector = '';
  selectedMinScore = 0;
  manualSearchText = '';

  // Sort State
  sortColumn = signal<string>('aiScore.overall');
  sortAsc = signal<boolean>(false);

  // Modals
  selectedChartStock = signal<Stock | null>(null);
  selectedDossierStock = signal<Stock | null>(null);

  // Market indices ticker
  readonly marketIndices = [
    { name: 'S&P 500', value: '5,864.20', change: 0.42 },
    { name: 'NASDAQ', value: '20,412.50', change: 0.85 },
    { name: 'DOW JONES', value: '42,860.10', change: -0.12 },
    { name: 'RUSSELL 2000', value: '2,240.80', change: 0.65 },
    { name: '10Y TREASURY', value: '4.08%', change: -0.80 },
    { name: 'VIX VOLATILITY', value: '14.82', change: -3.40 },
    { name: 'BITCOIN', value: '\$66,450', change: 2.10 }
  ];

  readonly samplePrompts = [
    '🔥 Top AI Buys (Score 9+)',
    '💎 Undervalued Tech (P/E < 25)',
    '📈 Breakouts Near 52W High',
    '💰 Safe Dividend Yields > 3%',
    '📉 Oversold Dip-Buys (RSI < 40)',
    '⚡ High Growth Semis (EPS > 20%)'
  ];

  readonly viewModes: { key: ScreenerViewMode; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'valuation', label: 'Valuation' },
    { key: 'technicals', label: 'Technicals' },
    { key: 'financials', label: 'Financials' }
  ];

  readonly allSectors = [
    'Technology',
    'Healthcare',
    'Financials',
    'Consumer Discretionary',
    'Consumer Staples',
    'Energy',
    'Industrials',
    'Utilities',
    'Materials',
    'Communication Services'
  ];

  // Filtered & Sorted Stocks computed signal
  filteredStocks = computed(() => {
    let list = this.stockService.stocks();
    const criteria = { ...this.activeCriteria() };

    // Apply manual search text if provided
    if (this.manualSearchText.trim()) {
      criteria.search = this.manualSearchText.trim();
    }
    if (this.selectedSector) {
      criteria.sector = this.selectedSector;
    }
    if (this.selectedMinScore > 0) {
      criteria.minAiScore = this.selectedMinScore;
    }

    // Filter using AI Screener engine
    list = this.aiScreener.filterStocks(list, criteria);

    // Sort
    const col = this.sortColumn();
    const asc = this.sortAsc();
    return [...list].sort((a, b) => {
      let aVal = this.getNestedValue(a, col);
      let bVal = this.getNestedValue(b, col);
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return asc ? -1 : 1;
      if (aVal > bVal) return asc ? 1 : -1;
      return 0;
    });
  });

  watchlistStocks = computed(() => {
    const list = this.stockService.stocks();
    const wl = this.stockService.watchlist();
    return list.filter(s => wl.includes(s.symbol));
  });

  highConvictionCount = computed(() => {
    return this.stockService.stocks().filter(s => s.aiScore.overall >= 9).length;
  });

  sectorPerformanceList = computed(() => {
    const stocks = this.stockService.stocks();
    const sectorMap: { [key: string]: { totalChange: number; count: number; topStock: Stock | null } } = {};

    for (const s of stocks) {
      if (!sectorMap[s.sector]) {
        sectorMap[s.sector] = { totalChange: 0, count: 0, topStock: null };
      }
      sectorMap[s.sector].totalChange += s.changePercent;
      sectorMap[s.sector].count += 1;
      if (!sectorMap[s.sector].topStock || s.changePercent > (sectorMap[s.sector].topStock?.changePercent || -999)) {
        sectorMap[s.sector].topStock = s;
      }
    }

    return Object.keys(sectorMap).map(sec => ({
      name: sec,
      changePercent: sectorMap[sec].count > 0 ? (sectorMap[sec].totalChange / sectorMap[sec].count) : 0,
      weight: sectorMap[sec].count * 3,
      topStock: sectorMap[sec].topStock?.symbol || '',
      stockCount: sectorMap[sec].count
    })).sort((a, b) => b.changePercent - a.changePercent);
  });

  // Query Execution
  executeAiQuery() {
    if (!this.aiSearchQuery.trim()) {
      this.clearAiFilter();
      return;
    }
    const result = this.aiScreener.parsePrompt(this.aiSearchQuery);
    this.activeCriteria.set(result.criteria);
    this.activeAiSummary.set(result.summary);
  }

  selectPrompt(promptText: string) {
    this.aiSearchQuery = promptText;
    this.executeAiQuery();
  }

  clearAiFilter() {
    this.aiSearchQuery = '';
    this.activeCriteria.set({});
    this.activeAiSummary.set('');
  }

  applyFilters() {
    // Triggers computed update automatically via reactive signals
  }

  filterBySector(sector: string) {
    this.selectedSector = sector;
    this.currentMainTab.set('screener');
  }

  toggleSort(column: string) {
    if (this.sortColumn() === column) {
      this.sortAsc.set(!this.sortAsc());
    } else {
      this.sortColumn.set(column);
      this.sortAsc.set(false); // default descending
    }
  }

  toggleWatchlist(event: MouseEvent, symbol: string) {
    event.stopPropagation();
    this.stockService.toggleWatchlist(symbol);
  }

  openChart(stock: Stock) {
    this.selectedChartStock.set(stock);
  }

  openAiDossier(stock: Stock) {
    this.selectedDossierStock.set(stock);
  }

  launchStrategyLab(stock: Stock) {
    this.currentMainTab.set('strategy');
  }

  handleLaunchInsightStrategy(insight: GroupTradeInsight) {
    this.currentMainTab.set('strategy');
  }

  handleInspectInsightChart(insight: GroupTradeInsight) {
    const found = this.stockService.stocks().find(s => s.symbol.toUpperCase() === insight.symbol.toUpperCase());
    if (found) {
      this.selectedChartStock.set(found);
    } else {
      const fallback = this.stockService.stocks()[0];
      if (fallback) {
        this.selectedChartStock.set({
          ...fallback,
          symbol: insight.symbol,
          name: insight.symbol === 'SPY' ? 'SPDR S&P 500 ETF Trust' : insight.symbol,
          price: insight.currentPriceAtPost || 582.40,
          sector: 'Indices & ETFs',
          sma50: 568.20,
          sma200: insight.triggerPrice || 554.00,
          rsi14: 48.2
        });
      }
    }
  }

  getScorePillClass(score: number): string {
    if (score >= 9) return 'score-strong-buy';
    if (score >= 7) return 'score-buy';
    if (score >= 5) return 'score-hold';
    return 'score-sell';
  }

  getSectorTheme(change: number): string {
    if (change >= 1.2) return 'bull-dark';
    if (change > 0) return 'bull-light';
    if (change <= -1.2) return 'bear-dark';
    return 'bear-light';
  }

  getUpsidePct(target: number, current: number): string {
    if (!current) return '0%';
    const pct = ((target - current) / current) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  }

  get52wPercent(stock: Stock): number {
    const range = stock.high52w - stock.low52w;
    if (range <= 0) return 50;
    return Math.min(100, Math.max(0, ((stock.price - stock.low52w) / range) * 100));
  }

  getSparklinePoints(points: number[]): string {
    if (!points || points.length === 0) return '';
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 60;
    const height = 18;

    return points.map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * height + 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  formatVolume(v: number): string {
    if (v >= 1000000000) return (v / 1000000000).toFixed(1) + 'B';
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
    return v.toString();
  }

  exportCsv() {
    const list = this.filteredStocks();
    if (list.length === 0) return;

    const headers = ['Symbol', 'Name', 'Sector', 'Price', 'Change %', 'AI Score', 'Market Cap (B)', 'P/E', 'RSI14', 'Target Price'];
    const rows = list.map(s => [
      s.symbol,
      `"${s.name}"`,
      `"${s.sector}"`,
      s.price,
      s.changePercent,
      s.aiScore.overall,
      s.marketCap,
      s.pe,
      s.rsi14,
      s.targetPrice
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ai_stock_screener_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }
}

