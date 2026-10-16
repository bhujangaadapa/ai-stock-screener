import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupInsightsService } from '../services/group-insights.service';
import { GroupTradeInsight, TradeDirection, InsightStatus, InsightSource } from '../models/group-insight.model';

@Component({
  selector: 'app-group-insights',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="insights-root">
      
      <!-- Top Hero Banner -->
      <div class="insights-banner">
        <div class="banner-left">
          <div class="wa-badge">
            <span class="wa-dot"></span>
            COMMUNITY & WHATSAPP TRADING DESK
          </div>
          <h2 class="banner-title">Group Trade Calls & Chart Insights</h2>
          <p class="banner-sub">
            Capture, track, and quantitatively backtest trade setups shared by your trading group members.
          </p>
        </div>

        <div class="banner-stats">
          <div class="stat-pill">
            <span class="stat-num">{{ service.totalCount() }}</span>
            <span class="stat-lbl">Total Insights</span>
          </div>
          <div class="stat-pill highlight-gold">
            <span class="stat-num">{{ service.pendingCount() }}</span>
            <span class="stat-lbl">Pending Triggers</span>
          </div>
          <div class="stat-pill highlight-green">
            <span class="stat-num">{{ service.activeCount() }}</span>
            <span class="stat-lbl">Active Swings</span>
          </div>
          <div class="stat-pill highlight-cyan">
            <span class="stat-num">78.5%</span>
            <span class="stat-lbl">Group Win Rate</span>
          </div>
        </div>
      </div>

      <!-- Action & Filter Bar -->
      <div class="filter-actions-bar">
        <div class="left-filters">
          <!-- Search input -->
          <div class="search-input-wrap">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              class="search-field" 
              placeholder="Search ticker, member, or keyword..." 
              [(ngModel)]="searchKeyword" />
          </div>

          <!-- Status Filter Pills -->
          <div class="filter-pills">
            <button 
              class="pill-btn" 
              [class.active]="statusFilter() === 'ALL'" 
              (click)="statusFilter.set('ALL')">
              All ({{ service.totalCount() }})
            </button>
            <button 
              class="pill-btn" 
              [class.active]="statusFilter() === 'PENDING_TRIGGER'" 
              (click)="statusFilter.set('PENDING_TRIGGER')">
              ⏳ Pending Triggers ({{ service.pendingCount() }})
            </button>
            <button 
              class="pill-btn" 
              [class.active]="statusFilter() === 'ACTIVE'" 
              (click)="statusFilter.set('ACTIVE')">
              🟢 Active In Play ({{ service.activeCount() }})
            </button>
            <button 
              class="pill-btn" 
              [class.active]="statusFilter() === 'TARGET_HIT'" 
              (click)="statusFilter.set('TARGET_HIT')">
              🎯 Target Hit ({{ service.targetHitCount() }})
            </button>
          </div>
        </div>

        <!-- Right Action Button -->
        <div class="right-actions">
          <button class="add-call-btn" (click)="showAddModal.set(!showAddModal())">
            <span class="plus">+</span>
            <span>{{ showAddModal() ? 'Close Form' : 'Log WhatsApp Insight' }}</span>
          </button>
        </div>
      </div>

      <!-- Quick Add Form Drawer (Collapsible) -->
      <div *ngIf="showAddModal()" class="add-form-drawer">
        <div class="form-header">
          <h3>📝 Log Member Trade Insight from WhatsApp / Telegram</h3>
          <span class="form-sub">Record the member's setup, trigger condition, and target to monitor or test.</span>
        </div>

        <div class="form-grid">
          <!-- Member & Contact -->
          <div class="form-group">
            <label>Member Name / Sender:</label>
            <input type="text" class="form-ctrl" placeholder="e.g. ~ ~KRK or JohnD" [(ngModel)]="newMember" />
          </div>

          <div class="form-group">
            <label>Phone / Handle (Optional):</label>
            <input type="text" class="form-ctrl" placeholder="e.g. +1 (716) 430-4227" [(ngModel)]="newPhone" />
          </div>

          <!-- Symbol & Direction -->
          <div class="form-group">
            <label>Stock Ticker Symbol:</label>
            <input type="text" class="form-ctrl uppercase-field" placeholder="e.g. SPY, NVDA, TSLA" [(ngModel)]="newSymbol" />
          </div>

          <div class="form-group">
            <label>Trade Direction:</label>
            <select class="form-ctrl" [(ngModel)]="newDirection">
              <option value="LONG">🟢 LONG (Buy Setup)</option>
              <option value="SHORT">🔴 SHORT (Sell / Put)</option>
              <option value="WATCH">👀 WATCHLIST (Key Level)</option>
            </select>
          </div>

          <!-- Setup & Trigger -->
          <div class="form-group full-width">
            <label>Setup Pattern / Economic Thesis:</label>
            <input type="text" class="form-ctrl" placeholder="e.g. Trendline Breakdown to 200 MA Retest, Bull Flag, 50 SMA Bounce" [(ngModel)]="newSetupType" />
          </div>

          <!-- Raw WhatsApp Message text -->
          <div class="form-group full-width">
            <label>Verbatim Message Text (from Chat):</label>
            <textarea class="form-ctrl text-area" rows="2" placeholder="Paste the exact WhatsApp / Discord message text..." [(ngModel)]="newMessageText"></textarea>
          </div>

          <!-- Price Levels -->
          <div class="form-group">
            <label>Current Price ($):</label>
            <input type="number" step="0.5" class="form-ctrl" placeholder="e.g. 582.40" [(ngModel)]="newCurrentPrice" />
          </div>

          <div class="form-group">
            <label>Trigger Entry Zone ($):</label>
            <input type="number" step="0.5" class="form-ctrl" placeholder="e.g. 554.00 (200 MA level)" [(ngModel)]="newTriggerPrice" />
          </div>

          <div class="form-group">
            <label>Target / Take Profit ($):</label>
            <input type="number" step="0.5" class="form-ctrl" placeholder="e.g. 605.00" [(ngModel)]="newTargetPrice" />
          </div>

          <div class="form-group">
            <label>Stop Loss ($):</label>
            <input type="number" step="0.5" class="form-ctrl" placeholder="e.g. 544.50" [(ngModel)]="newStopLossPrice" />
          </div>
        </div>

        <div class="form-actions">
          <button class="submit-btn" (click)="saveNewInsight()">
            ✓ Save Insight to Feed
          </button>
          <button class="cancel-btn" (click)="showAddModal.set(false)">
            Cancel
          </button>
        </div>
      </div>

      <!-- Educational Concept Callout (Focused on KRK's SPY 200 MA Trade) -->
      <div class="concept-explainer-box">
        <div class="explainer-header">
          <div class="tag-row">
            <span class="concept-tag">MASTERING THE CONCEPTS</span>
            <span class="concept-subtag">Case Study: ~ ~KRK's SPY 200 MA Retest Call</span>
          </div>
        </div>
        
        <div class="explainer-content-grid">
          <div class="concept-card">
            <div class="concept-icon">📐</div>
            <div class="concept-body">
              <h4>1. Ascending Trendline Breakdown</h4>
              <p>
                An upward trendline connects sequential swing lows. When SPY drops below this diagonal line, short-term momentum stops. Rather than a disaster, institutional traders view it as healthy pullback liquidity.
              </p>
            </div>
          </div>

          <div class="concept-card">
            <div class="concept-icon">🎯</div>
            <div class="concept-body">
              <h4>2. The 200-Day Moving Average (200 MA)</h4>
              <p>
                The 200 SMA is Wall Street's definitive benchmark. In a bull market, when price drops down to touch the rising 200 MA, pension funds and quants systematically rebalance and buy the dip.
              </p>
            </div>
          </div>

          <div class="concept-card">
            <div class="concept-icon">🛡️</div>
            <div class="concept-body">
              <h4>3. Asymmetric Risk/Reward</h4>
              <p>
                KRK's setup has great asymmetry: entering at the 200 MA (~$554) with a stop just below it (~$544.50 = risking 1.7%) targeting previous all-time highs (~$605 = reward 9.2%). That's a <strong>5.4-to-1 Reward-to-Risk ratio</strong>!
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Trade Insights Feed Cards Grid -->
      <div class="insights-feed-grid">
        <div *ngFor="let item of filteredInsights()" class="insight-card" [class.featured-krk]="item.id === 'krk-spy-200ma-01'">
          
          <!-- Card Header -->
          <div class="card-header-bar">
            <div class="sender-info">
              <div class="sender-avatar">{{ item.member.slice(0, 2).replace('~', '').trim() || 'KR' }}</div>
              <div class="sender-meta">
                <div class="sender-name-row">
                  <span class="sender-name">{{ item.member }}</span>
                  <span *ngIf="item.id === 'krk-spy-200ma-01'" class="verified-pill">⭐ Featured WhatsApp Call</span>
                </div>
                <div class="sender-sub">
                  <span>{{ item.channelName || 'WhatsApp Group' }}</span>
                  <span class="bullet">•</span>
                  <span>{{ item.date }} at {{ item.time }}</span>
                </div>
              </div>
            </div>

            <!-- Status Pill -->
            <div class="status-badge" [ngClass]="getStatusClass(item.status)">
              <span class="status-dot"></span>
              {{ getStatusLabel(item.status) }}
            </div>
          </div>

          <!-- Ticker & Direction Ribbon -->
          <div class="ticker-ribbon">
            <div class="ticker-left">
              <span class="ticker-symbol">{{ item.symbol }}</span>
              <span class="direction-tag" [class.long]="item.direction === 'LONG'" [class.short]="item.direction === 'SHORT'">
                {{ item.direction === 'LONG' ? '▲ LONG' : '▼ SHORT' }}
              </span>
              <span class="setup-name">{{ item.setupType }}</span>
            </div>

            <div class="ticker-price">
              <span class="price-sub">Current:</span>
              <span class="price-val">\${{ item.currentPriceAtPost | number:'1.2-2' }}</span>
            </div>
          </div>

          <!-- WhatsApp Chat Bubble Quote -->
          <div class="chat-bubble-quote">
            <div class="bubble-header">
              <span class="wa-icon">💬</span>
              <span class="bubble-title">WhatsApp Original Message:</span>
            </div>
            <p class="bubble-text">"{{ item.messageText }}"</p>
          </div>

          <!-- Chart Indicator Analysis Note -->
          <div class="notes-box">
            <span class="notes-tag">CHART ANALYSIS:</span>
            <p class="notes-text">{{ item.chartNotes }}</p>
          </div>

          <!-- Key Price Levels Target Grid -->
          <div class="levels-grid">
            <div class="level-box">
              <span class="lvl-label">Entry Trigger</span>
              <span class="lvl-val gold">\${{ item.triggerPrice ? (item.triggerPrice | number:'1.2-2') : 'At Market' }}</span>
              <span class="lvl-sub">200 MA Level</span>
            </div>

            <div class="level-box">
              <span class="lvl-label">Take Profit</span>
              <span class="lvl-val green">\${{ item.targetPrice ? (item.targetPrice | number:'1.2-2') : '--' }}</span>
              <span class="lvl-sub">+{{ calculateReturnTarget(item) }}% Target</span>
            </div>

            <div class="level-box">
              <span class="lvl-label">Stop Loss</span>
              <span class="lvl-val red">\${{ item.stopLossPrice ? (item.stopLossPrice | number:'1.2-2') : '--' }}</span>
              <span class="lvl-sub">-{{ calculateRiskStop(item) }}% Risk</span>
            </div>

            <div class="level-box">
              <span class="lvl-label">Risk/Reward</span>
              <span class="lvl-val cyan">{{ calculateRiskRewardRatio(item) }}</span>
              <span class="lvl-sub">R:R Ratio</span>
            </div>
          </div>

          <!-- Tags -->
          <div class="tags-row" *ngIf="item.tags && item.tags.length > 0">
            <span *ngFor="let tag of item.tags" class="tag-chip">#{{ tag }}</span>
          </div>

          <!-- Card Actions Footer -->
          <div class="card-footer-actions">
            <div class="left-actions">
              <button class="upvote-btn" (click)="service.upvote(item.id)">
                <span>👍</span>
                <span>{{ item.votesUp }} agree</span>
              </button>

              <!-- Quick Status Selector -->
              <select 
                class="status-select" 
                [ngModel]="item.status" 
                (ngModelChange)="service.updateStatus(item.id, $event)">
                <option value="PENDING_TRIGGER">⏳ Pending Trigger</option>
                <option value="ACTIVE">🟢 Active In Position</option>
                <option value="TARGET_HIT">🎯 Target Hit</option>
                <option value="STOPPED_OUT">❌ Stopped Out</option>
                <option value="INVALIDATED">⚪ Invalidated</option>
              </select>
            </div>

            <div class="right-actions">
              <button class="action-btn lab-btn" (click)="onLaunchQuantLab(item)" title="Test this setup in Strategy Engine">
                🚀 Test in Quant Lab
              </button>
              <button class="action-btn chart-btn" (click)="onInspectChart(item)" title="View live candlestick chart with 200 MA">
                📊 View Chart
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  `,
  styles: [`
    .insights-root {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 4px;
    }

    /* Banner */
    .insights-banner {
      background: linear-gradient(135deg, #064e3b 0%, #062f26 50%, #031e18 100%);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 12px;
      padding: 22px 26px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }

    .wa-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #34d399;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: 8px;
    }

    .wa-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    .banner-title {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 6px 0;
    }

    .banner-sub {
      font-size: 13px;
      color: #a7f3d0;
      margin: 0;
      max-width: 600px;
    }

    .banner-stats {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .stat-pill {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 90px;
    }

    .stat-pill.highlight-gold {
      border-color: rgba(245, 158, 11, 0.4);
      background: rgba(245, 158, 11, 0.1);
    }
    .stat-pill.highlight-gold .stat-num { color: #fbbf24; }

    .stat-pill.highlight-green {
      border-color: rgba(16, 185, 129, 0.4);
      background: rgba(16, 185, 129, 0.1);
    }
    .stat-pill.highlight-green .stat-num { color: #34d399; }

    .stat-pill.highlight-cyan {
      border-color: rgba(56, 189, 248, 0.4);
      background: rgba(56, 189, 248, 0.1);
    }
    .stat-pill.highlight-cyan .stat-num { color: #38bdf8; }

    .stat-num {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
    }

    .stat-lbl {
      font-size: 11px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 2px;
    }

    /* Filters Bar */
    .filter-actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
      background: #111827;
      border: 1px solid #1f2937;
      padding: 12px 16px;
      border-radius: 10px;
    }

    .left-filters {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .search-input-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 6px;
      padding: 6px 12px;
      min-width: 250px;
    }

    .search-icon { font-size: 14px; }

    .search-field {
      background: transparent;
      border: none;
      color: #f3f4f6;
      font-size: 13px;
      width: 100%;
      outline: none;
    }

    .filter-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .pill-btn {
      background: #1f2937;
      border: 1px solid #374151;
      color: #9ca3af;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .pill-btn:hover {
      background: #374151;
      color: #f3f4f6;
    }

    .pill-btn.active {
      background: #065f46;
      border-color: #10b981;
      color: #34d399;
    }

    .add-call-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
    }

    .add-call-btn:hover {
      background: #059669;
    }

    .add-call-btn .plus {
      font-size: 16px;
      font-weight: 800;
    }

    /* Add Form Drawer */
    .add-form-drawer {
      background: #111827;
      border: 1px solid #10b981;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }

    .form-header h3 {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 4px 0;
    }

    .form-sub {
      font-size: 12px;
      color: #9ca3af;
      display: block;
      margin-bottom: 16px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      font-size: 12px;
      font-weight: 600;
      color: #d1d5db;
    }

    .form-ctrl {
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 6px;
      padding: 8px 12px;
      color: #f9fafb;
      font-size: 13px;
      outline: none;
    }

    .form-ctrl:focus {
      border-color: #10b981;
    }

    .uppercase-field {
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .text-area {
      resize: vertical;
      line-height: 1.4;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 18px;
    }

    .submit-btn {
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 9px 20px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .submit-btn:hover { background: #059669; }

    .cancel-btn {
      background: #374151;
      color: #d1d5db;
      border: none;
      padding: 9px 16px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
    }

    /* Concept Explainer Box */
    .concept-explainer-box {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 16px 20px;
    }

    .explainer-header {
      margin-bottom: 12px;
    }

    .concept-tag {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 3px 8px;
      border-radius: 4px;
      margin-right: 8px;
    }

    .concept-subtag {
      font-size: 13px;
      font-weight: 700;
      color: #f1f5f9;
    }

    .explainer-content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
    }

    .concept-card {
      display: flex;
      gap: 12px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 12px;
    }

    .concept-icon {
      font-size: 22px;
      line-height: 1;
    }

    .concept-body h4 {
      font-size: 13px;
      font-weight: 700;
      color: #e2e8f0;
      margin: 0 0 4px 0;
    }

    .concept-body p {
      font-size: 12px;
      line-height: 1.4;
      color: #94a3b8;
      margin: 0;
    }

    /* Insights Feed Grid */
    .insights-feed-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
      gap: 18px;
    }

    .insight-card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
      transition: transform 0.2s, border-color 0.2s;
    }

    .insight-card:hover {
      border-color: #374151;
      transform: translateY(-2px);
    }

    .insight-card.featured-krk {
      border: 1px solid rgba(16, 185, 129, 0.5);
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.15);
    }

    .card-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }

    .sender-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .sender-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #065f46;
      color: #34d399;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
      border: 1px solid #10b981;
    }

    .sender-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sender-name {
      font-size: 14px;
      font-weight: 700;
      color: #f9fafb;
    }

    .verified-pill {
      font-size: 10px;
      font-weight: 700;
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
      padding: 2px 6px;
      border-radius: 10px;
    }

    .sender-sub {
      font-size: 11px;
      color: #9ca3af;
      display: flex;
      gap: 4px;
      align-items: center;
      margin-top: 1px;
    }

    .bullet { font-size: 8px; }

    /* Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .status-badge.pending {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
    }

    .status-badge.active {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }

    .status-badge.target {
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
    }

    .status-badge.stopped {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    /* Ticker Ribbon */
    .ticker-ribbon {
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .ticker-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .ticker-symbol {
      font-size: 16px;
      font-weight: 800;
      color: #ffffff;
      background: #111827;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #4b5563;
    }

    .direction-tag {
      font-size: 11px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .direction-tag.long {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
    }

    .direction-tag.short {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }

    .setup-name {
      font-size: 12px;
      font-weight: 600;
      color: #cbd5e1;
    }

    .ticker-price {
      text-align: right;
    }

    .price-sub {
      font-size: 11px;
      color: #9ca3af;
      margin-right: 4px;
    }

    .price-val {
      font-size: 15px;
      font-weight: 700;
      color: #f3f4f6;
    }

    /* WhatsApp Bubble Quote */
    .chat-bubble-quote {
      background: #022c22;
      border-left: 3px solid #10b981;
      border-radius: 0 8px 8px 0;
      padding: 10px 14px;
    }

    .bubble-header {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 700;
      color: #34d399;
      margin-bottom: 4px;
    }

    .bubble-text {
      font-size: 13px;
      font-style: italic;
      color: #ecfdf5;
      margin: 0;
      line-height: 1.4;
    }

    /* Notes Box */
    .notes-box {
      font-size: 12px;
      color: #9ca3af;
      background: #1a2233;
      border-radius: 6px;
      padding: 8px 12px;
    }

    .notes-tag {
      font-size: 10px;
      font-weight: 800;
      color: #38bdf8;
      margin-right: 6px;
    }

    .notes-text {
      margin: 4px 0 0 0;
      line-height: 1.35;
      color: #cbd5e1;
    }

    /* Levels Grid */
    .levels-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .level-box {
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 6px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .lvl-label {
      font-size: 10px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .lvl-val {
      font-size: 13px;
      font-weight: 800;
      margin: 2px 0;
    }

    .lvl-val.gold { color: #fbbf24; }
    .lvl-val.green { color: #34d399; }
    .lvl-val.red { color: #f87171; }
    .lvl-val.cyan { color: #38bdf8; }

    .lvl-sub {
      font-size: 9px;
      color: #6b7280;
    }

    /* Tags */
    .tags-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .tag-chip {
      font-size: 10px;
      background: #1e293b;
      color: #94a3b8;
      padding: 2px 8px;
      border-radius: 4px;
    }

    /* Card Actions Footer */
    .card-footer-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      border-top: 1px solid #1f2937;
      padding-top: 12px;
      margin-top: 2px;
      flex-wrap: wrap;
    }

    .left-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .upvote-btn {
      background: #1f2937;
      border: 1px solid #374151;
      color: #d1d5db;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: background 0.15s;
    }

    .upvote-btn:hover {
      background: #374151;
      color: #ffffff;
    }

    .status-select {
      background: #1f2937;
      border: 1px solid #374151;
      color: #9ca3af;
      font-size: 11px;
      padding: 5px 8px;
      border-radius: 6px;
      outline: none;
      cursor: pointer;
    }

    .right-actions {
      display: flex;
      gap: 6px;
    }

    .action-btn {
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .action-btn:hover {
      opacity: 0.9;
    }

    .lab-btn {
      background: #7c3aed;
      color: #ffffff;
    }

    .chart-btn {
      background: #0284c7;
      color: #ffffff;
    }
  `]
})
export class GroupInsightsComponent {
  readonly service = inject(GroupInsightsService);

  readonly launchQuantLab = output<GroupTradeInsight>();
  readonly inspectChart = output<GroupTradeInsight>();

  readonly searchKeyword = signal('');
  readonly statusFilter = signal<'ALL' | InsightStatus>('ALL');
  readonly showAddModal = signal(false);

  // New form fields
  newMember = '';
  newPhone = '';
  newSymbol = '';
  newDirection: TradeDirection = 'LONG';
  newSetupType = '';
  newMessageText = '';
  newCurrentPrice: number | null = null;
  newTriggerPrice: number | null = null;
  newTargetPrice: number | null = null;
  newStopLossPrice: number | null = null;

  readonly filteredInsights = computed(() => {
    const list = this.service.insights();
    const q = this.searchKeyword().toLowerCase().trim();
    const st = this.statusFilter();

    return list.filter(item => {
      // Status check
      if (st !== 'ALL' && item.status !== st) return false;

      // Search keyword
      if (!q) return true;
      return (
        item.symbol.toLowerCase().includes(q) ||
        item.member.toLowerCase().includes(q) ||
        item.messageText.toLowerCase().includes(q) ||
        item.setupType.toLowerCase().includes(q)
      );
    });
  });

  saveNewInsight(): void {
    if (!this.newSymbol || !this.newMessageText) {
      alert('Please enter at least a Ticker Symbol and the Message Text.');
      return;
    }

    this.service.addInsight({
      member: this.newMember || 'WhatsApp Member',
      phoneOrHandle: this.newPhone,
      symbol: this.newSymbol.toUpperCase().trim(),
      direction: this.newDirection,
      setupType: this.newSetupType || 'Key Level Reversal',
      messageText: this.newMessageText,
      chartNotes: 'Captured from community trading group chat.',
      currentPriceAtPost: this.newCurrentPrice || 0,
      triggerPrice: this.newTriggerPrice || undefined,
      targetPrice: this.newTargetPrice || undefined,
      stopLossPrice: this.newStopLossPrice || undefined,
      status: 'PENDING_TRIGGER',
      source: 'WhatsApp',
      channelName: 'WhatsApp Trading Group',
      tags: ['Community Call', this.newSymbol.toUpperCase()]
    });

    // Reset & close
    this.newSymbol = '';
    this.newMessageText = '';
    this.newSetupType = '';
    this.newCurrentPrice = null;
    this.newTriggerPrice = null;
    this.newTargetPrice = null;
    this.newStopLossPrice = null;
    this.showAddModal.set(false);
  }

  calculateReturnTarget(item: GroupTradeInsight): string {
    const entry = item.triggerPrice || item.currentPriceAtPost;
    if (!entry || !item.targetPrice) return '10.0';
    const pct = ((item.targetPrice - entry) / entry) * 100;
    return Math.abs(pct).toFixed(1);
  }

  calculateRiskStop(item: GroupTradeInsight): string {
    const entry = item.triggerPrice || item.currentPriceAtPost;
    if (!entry || !item.stopLossPrice) return '2.0';
    const pct = ((entry - item.stopLossPrice) / entry) * 100;
    return Math.abs(pct).toFixed(1);
  }

  calculateRiskRewardRatio(item: GroupTradeInsight): string {
    const entry = item.triggerPrice || item.currentPriceAtPost;
    if (!entry || !item.targetPrice || !item.stopLossPrice) return '3.5:1';
    const reward = Math.abs(item.targetPrice - entry);
    const risk = Math.abs(entry - item.stopLossPrice);
    if (risk === 0) return '∞';
    return (reward / risk).toFixed(1) + ':1';
  }

  getStatusClass(status: InsightStatus): string {
    switch (status) {
      case 'PENDING_TRIGGER': return 'pending';
      case 'ACTIVE': return 'active';
      case 'TARGET_HIT': return 'target';
      case 'STOPPED_OUT':
      case 'INVALIDATED': return 'stopped';
      default: return '';
    }
  }

  getStatusLabel(status: InsightStatus): string {
    switch (status) {
      case 'PENDING_TRIGGER': return '⏳ Pending Trigger';
      case 'ACTIVE': return '🟢 Active in Position';
      case 'TARGET_HIT': return '🎯 Target Hit';
      case 'STOPPED_OUT': return '❌ Stopped Out';
      case 'INVALIDATED': return '⚪ Invalidated';
      default: return status;
    }
  }

  onLaunchQuantLab(item: GroupTradeInsight): void {
    this.launchQuantLab.emit(item);
  }

  onInspectChart(item: GroupTradeInsight): void {
    this.inspectChart.emit(item);
  }
}
