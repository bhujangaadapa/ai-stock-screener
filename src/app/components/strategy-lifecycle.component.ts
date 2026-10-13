import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreStockService } from '../services/firestore-stock.service';
import { StrategyEngineService } from '../services/strategy-engine.service';
import { Stock, HistoricalCandle } from '../models/stock.model';
import {
  TradingStrategyConfig,
  BacktestSettings,
  BacktestResult,
  WalkForwardResult,
  PerformanceMetrics,
  TradeRecord,
  EquityPoint,
  PaperOrder,
  PaperPosition
} from '../models/strategy-lifecycle.model';

export type LifecycleStage = 1 | 2 | 3 | 4 | 5;

@Component({
  selector: 'app-strategy-lifecycle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="lifecycle-root">
      
      <!-- Top Educational Header & Philosophy Banner -->
      <div class="lifecycle-banner">
        <div class="banner-content">
          <div class="banner-badge">QUANTITATIVE TRADING METHODOLOGY</div>
          <h2 class="banner-title">The Strategy Development Lifecycle</h2>
          <p class="banner-subtitle">
            <span class="quote">"Backtesting is the filter that eliminates bad ideas before real money is ever put at risk."</span>
          </p>
        </div>
        
        <div class="banner-actions">
          <button class="learn-toggle-btn" (click)="showLearningLab.set(!showLearningLab())">
            <span class="icon">📚</span>
            <span>{{ showLearningLab() ? 'Hide Learning Lab' : 'Open Quant Stacks Lab' }}</span>
          </button>
        </div>
      </div>

      <!-- Educational Stacks & Knowledge Drawer (Collapsible) -->
      <div *ngIf="showLearningLab()" class="learning-lab-drawer">
        <div class="lab-grid">
          <div class="lab-card">
            <div class="lab-tag green">EQUITIES & TECHNICAL INDICATORS</div>
            <h4>Fastest Starting Stack</h4>
            <ul class="lab-list">
              <li><strong>Data:</strong> <code>yfinance</code> (free historical OHLCV)</li>
              <li><strong>Indicators:</strong> <code>pandas-ta</code> (130+ vectorized indicators)</li>
              <li><strong>Backtest:</strong> <code>backtesting.py</code> (interactive Bokeh charts)</li>
              <li><strong>Analytics:</strong> <code>quantstats</code> (HTML tear sheets & Sharpe)</li>
            </ul>
          </div>

          <div class="lab-card">
            <div class="lab-tag purple">LARGE-SCALE SWEEPS & HYPEROPT</div>
            <h4>Vectorized Parameter Tuning</h4>
            <ul class="lab-list">
              <li><strong>Engine:</strong> <code>vectorbt</code> + NumPy / Numba</li>
              <li><strong>Why:</strong> Tests millions of parameter combinations in seconds</li>
              <li><strong>Use case:</strong> Indicator optimization & multi-ticker screening</li>
            </ul>
          </div>

          <div class="lab-card">
            <div class="lab-tag blue">PRODUCTION BOTS (CRYPTO)</div>
            <h4>Turnkey Automated Trading</h4>
            <ul class="lab-list">
              <li><strong>Bot:</strong> <code>freqtrade</code> (40k+ GitHub stars)</li>
              <li><strong>Features:</strong> Built-in web UI, paper trading, Telegram bot</li>
              <li><strong>AI Layer:</strong> <code>FreqAI</code> (adaptive ML models)</li>
            </ul>
          </div>

          <div class="lab-card">
            <div class="lab-tag orange">INSTITUTIONAL MULTI-ASSET</div>
            <h4>Enterprise Execution Engines</h4>
            <ul class="lab-list">
              <li><strong>Platform:</strong> <code>QuantConnect/Lean</code> (C# & Python)</li>
              <li><strong>High-Speed:</strong> <code>nautilus_trader</code> (Rust core engine)</li>
              <li><strong>Assets:</strong> Equities, Options, Futures, Forex, Crypto</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 5-Stage Interactive Chevron Pipeline Tracker -->
      <div class="pipeline-bar">
        <div 
          class="stage-step" 
          [class.active]="currentStage() === 1"
          [class.completed]="currentStage() > 1"
          (click)="setStage(1)">
          <div class="step-num">1</div>
          <div class="step-info">
            <span class="step-name">Idea Generation</span>
            <span class="step-desc">Hypothesis & Setup</span>
          </div>
        </div>

        <div class="step-arrow">➔</div>

        <div 
          class="stage-step" 
          [class.active]="currentStage() === 2"
          [class.completed]="currentStage() > 2"
          (click)="setStage(2)">
          <div class="step-num">2</div>
          <div class="step-info">
            <span class="step-name">Historical Backtest</span>
            <span class="step-desc">In-Sample Filter</span>
          </div>
        </div>

        <div class="step-arrow">➔</div>

        <div 
          class="stage-step" 
          [class.active]="currentStage() === 3"
          [class.completed]="currentStage() > 3"
          (click)="setStage(3)">
          <div class="step-num">3</div>
          <div class="step-info">
            <span class="step-name">Walk-Forward / OOS</span>
            <span class="step-desc">Overfitting Check</span>
          </div>
        </div>

        <div class="step-arrow">➔</div>

        <div 
          class="stage-step" 
          [class.active]="currentStage() === 4"
          [class.completed]="currentStage() > 4"
          (click)="setStage(4)">
          <div class="step-num">4</div>
          <div class="step-info">
            <span class="step-name">Paper Trading</span>
            <span class="step-desc">Live Data, Zero Cash</span>
          </div>
        </div>

        <div class="step-arrow">➔</div>

        <div 
          class="stage-step" 
          [class.active]="currentStage() === 5"
          (click)="setStage(5)">
          <div class="step-num">5</div>
          <div class="step-info">
            <span class="step-name">Small Live Capital</span>
            <span class="step-desc">Risk & Circuit Breakers</span>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- STAGE 1: IDEA GENERATION & HYPOTHESIS FORMULATION        -->
      <!-- ======================================================== -->
      <div *ngIf="currentStage() === 1" class="stage-container">
        <div class="stage-header-row">
          <div>
            <h3 class="stage-title">Stage 1 • Idea Generation & Economic Hypothesis</h3>
            <p class="stage-intro">
              Every sound strategy starts with an observable market anomaly or economic rationale—never blind curve-fitting.
            </p>
          </div>
          <button class="primary-action-btn" (click)="executeBacktestAndAdvance()">
            <span>⚡ Run In-Sample Backtest</span>
            <span class="arrow">➔</span>
          </button>
        </div>

        <div class="stage-grid">
          <!-- Strategy Configuration Card -->
          <div class="config-panel">
            <h4 class="panel-heading">Strategy Architecture</h4>

            <div class="form-group">
              <label>Select Strategy Archetype:</label>
              <select class="form-control" [(ngModel)]="selectedStrategyId" (change)="onStrategyChange()">
                <option *ngFor="let s of strategies" [value]="s.id">{{ s.name }}</option>
              </select>
            </div>

            <div class="form-group">
              <label>Target Asset Universe:</label>
              <div class="ticker-picker-row">
                <select class="form-control" [(ngModel)]="selectedTicker" (change)="onTickerChange()">
                  <option *ngFor="let s of availableStocks()" [value]="s.symbol">
                    {{ s.symbol }} • {{ s.name }} (AI Score: {{ s.aiScore.overall }}/10)
                  </option>
                </select>
                <div class="ticker-badge" *ngIf="currentSelectedStock()">
                  <span class="badge-price">\${{ currentSelectedStock()?.price?.toFixed(2) }}</span>
                  <span class="badge-score" [class.bull]="(currentSelectedStock()?.aiScore?.overall || 0) >= 8">
                    AI {{ currentSelectedStock()?.aiScore?.overall }}/10
                  </span>
                </div>
              </div>
            </div>

            <!-- Parameters Grid -->
            <div class="params-box">
              <span class="params-title">Strategy Tunable Parameters</span>
              
              <div class="params-row" *ngIf="activeStrategy.type === 'DANELFIN_AI_MOMENTUM'">
                <div class="param-item">
                  <label>Min AI Score:</label>
                  <input type="number" [(ngModel)]="activeStrategy.params['minAiScore']" min="5" max="10" />
                </div>
                <div class="param-item">
                  <label>RSI Max Entry:</label>
                  <input type="number" [(ngModel)]="activeStrategy.params['rsiMaxEntry']" min="30" max="80" />
                </div>
                <div class="param-item">
                  <label>RSI Exit:</label>
                  <input type="number" [(ngModel)]="activeStrategy.params['rsiExit']" min="60" max="90" />
                </div>
              </div>

              <div class="params-row" *ngIf="activeStrategy.type === 'SMA_GOLDEN_CROSS'">
                <div class="param-item">
                  <label>Fast SMA Period:</label>
                  <input type="number" [(ngModel)]="activeStrategy.params['fastPeriod']" min="5" max="50" />
                </div>
                <div class="param-item">
                  <label>Slow SMA Period:</label>
                  <input type="number" [(ngModel)]="activeStrategy.params['slowPeriod']" min="20" max="200" />
                </div>
              </div>

              <div class="params-row" *ngIf="activeStrategy.type === 'RSI_MEAN_REVERSION'">
                <div class="param-item">
                  <label>RSI Period:</label>
                  <input type="number" [(ngModel)]="activeStrategy.params['rsiPeriod']" min="7" max="28" />
                </div>
                <div class="param-item">
                  <label>Oversold Entry:</label>
                  <input type="number" [(ngModel)]="activeStrategy.params['oversoldThreshold']" min="15" max="40" />
                </div>
                <div class="param-item">
                  <label>Overbought Exit:</label>
                  <input type="number" [(ngModel)]="activeStrategy.params['overboughtThreshold']" min="60" max="85" />
                </div>
              </div>

              <div class="params-row" *ngIf="activeStrategy.type === 'BOLLINGER_BREAKOUT'">
                <div class="param-item">
                  <label>BB Period:</label>
                  <input type="number" [(ngModel)]="activeStrategy.params['period']" min="10" max="50" />
                </div>
                <div class="param-item">
                  <label>Std Deviations:</label>
                  <input type="number" step="0.1" [(ngModel)]="activeStrategy.params['stdDev']" min="1.0" max="3.0" />
                </div>
              </div>

              <!-- Risk Parameters -->
              <div class="params-row border-top">
                <div class="param-item">
                  <label>Stop Loss (%):</label>
                  <input type="number" step="0.5" [(ngModel)]="activeStrategy.stopLossPercent" min="1" max="25" />
                </div>
                <div class="param-item">
                  <label>Take Profit (%):</label>
                  <input type="number" step="0.5" [(ngModel)]="activeStrategy.takeProfitPercent" min="2" max="50" />
                </div>
              </div>
            </div>

            <!-- Friction Settings -->
            <div class="friction-box">
              <span class="friction-title">Realistic Market Friction Settings</span>
              <div class="params-row">
                <div class="param-item">
                  <label>Capital ($):</label>
                  <input type="number" [(ngModel)]="backtestSettings.initialCapital" step="10000" />
                </div>
                <div class="param-item">
                  <label>Slippage (bps):</label>
                  <input type="number" [(ngModel)]="backtestSettings.slippageBps" min="0" max="50" />
                </div>
                <div class="param-item">
                  <label>Commission ($):</label>
                  <input type="number" [(ngModel)]="backtestSettings.commissionPerTrade" step="0.5" />
                </div>
              </div>
            </div>
          </div>

          <!-- Hypothesis & Learning Breakdown -->
          <div class="hypothesis-panel">
            <div class="rationale-card">
              <div class="badge-pill">ECONOMIC HYPOTHESIS</div>
              <h4 class="hypothesis-headline">{{ activeStrategy.name }}</h4>
              <p class="hypothesis-body">{{ activeStrategy.hypothesis }}</p>
              
              <div class="edge-box">
                <strong>Why This Works (Structural Edge):</strong>
                <p>{{ activeStrategy.rationale }}</p>
              </div>

              <div class="trap-warning">
                <strong>⚠️ Avoid the Data Snooping Trap:</strong>
                <p>Do not tune parameters until you see a 500% backtest on past data. The narrower the parameter window, the more likely the strategy collapses in live execution.</p>
              </div>
            </div>

            <!-- Python Code Export Box -->
            <div class="python-export-card">
              <div class="export-header">
                <div>
                  <span class="export-tag">PYTHON STACK (yfinance + pandas-ta + backtesting.py + quantstats)</span>
                  <div class="export-sub">Ready to run locally in Jupyter or terminal</div>
                </div>
                <button class="copy-btn" (click)="copyPythonCode()">
                  {{ copiedPython() ? '✓ Copied!' : '📋 Copy Script' }}
                </button>
              </div>
              <pre class="code-preview"><code>{{ pythonSnippetPreview() }}</code></pre>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- STAGE 2: IN-SAMPLE HISTORICAL BACKTEST                   -->
      <!-- ======================================================== -->
      <div *ngIf="currentStage() === 2" class="stage-container">
        <div class="stage-header-row">
          <div>
            <h3 class="stage-title">Stage 2 • In-Sample Historical Backtest</h3>
            <p class="stage-intro">
              Simulating bar-by-bar execution on {{ backtestResult()?.symbol }} across {{ backtestResult()?.equityCurve?.length }} trading days with slippage & commission modeling.
            </p>
          </div>
          <div class="btn-group">
            <button class="secondary-action-btn" (click)="setStage(1)">
              ◀ Adjust Strategy
            </button>
            <button class="primary-action-btn" (click)="executeWalkForwardAndAdvance()">
              <span>🔬 Run Walk-Forward Validation</span>
              <span class="arrow">➔</span>
            </button>
          </div>
        </div>

        <div *ngIf="backtestResult() as res">
          <!-- Quant KPI Metrics Cards -->
          <div class="kpi-grid">
            <div class="kpi-card" [class.positive]="res.metrics.totalReturnPercent >= 0" [class.negative]="res.metrics.totalReturnPercent < 0">
              <span class="kpi-label">Total Strategy Return</span>
              <span class="kpi-val">{{ res.metrics.totalReturnPercent >= 0 ? '+' : '' }}{{ res.metrics.totalReturnPercent }}%</span>
              <span class="kpi-sub">vs Benchmark {{ res.metrics.benchmarkReturnPercent }}% (Alpha: {{ res.metrics.alphaPercent }}%)</span>
            </div>

            <div class="kpi-card" [class.good-sharpe]="res.metrics.sharpeRatio >= 1.5">
              <span class="kpi-label">Sharpe Ratio (Annualized)</span>
              <span class="kpi-val">{{ res.metrics.sharpeRatio }}</span>
              <span class="kpi-sub">
                <span *ngIf="res.metrics.sharpeRatio >= 1.5" class="badge-tag green">Excellent (Edge)</span>
                <span *ngIf="res.metrics.sharpeRatio >= 1.0 && res.metrics.sharpeRatio < 1.5" class="badge-tag yellow">Acceptable</span>
                <span *ngIf="res.metrics.sharpeRatio < 1.0" class="badge-tag red">Weak (<1.0)</span>
              </span>
            </div>

            <div class="kpi-card">
              <span class="kpi-label">Sortino Ratio</span>
              <span class="kpi-val">{{ res.metrics.sortinoRatio }}</span>
              <span class="kpi-sub">Downside volatility risk ratio</span>
            </div>

            <div class="kpi-card">
              <span class="kpi-label">Profit Factor</span>
              <span class="kpi-val">{{ res.metrics.profitFactor }}</span>
              <span class="kpi-sub">Gross Wins / Gross Losses</span>
            </div>

            <div class="kpi-card">
              <span class="kpi-label">Win Rate</span>
              <span class="kpi-val">{{ res.metrics.winRatePercent }}%</span>
              <span class="kpi-sub">{{ res.metrics.winningTrades }}W / {{ res.metrics.losingTrades }}L ({{ res.metrics.totalTrades }} trades)</span>
            </div>

            <div class="kpi-card negative">
              <span class="kpi-label">Max Drawdown</span>
              <span class="kpi-val">-{{ res.metrics.maxDrawdownPercent }}%</span>
              <span class="kpi-sub">Duration: {{ res.metrics.maxDrawdownDurationDays }} days (Calmar: {{ res.metrics.calmarRatio }})</span>
            </div>
          </div>

          <!-- Interactive Equity Curve Chart (SVG) -->
          <div class="chart-box">
            <div class="chart-header">
              <div class="chart-title">
                <span>📈 Equity Curve vs Buy & Hold Benchmark</span>
                <span class="sub">Starting Capital: \${{ res.settings.initialCapital | number }}</span>
              </div>
              <div class="chart-legend">
                <span class="legend-item"><span class="dot green"></span> Strategy (\${{ res.equityCurve[res.equityCurve.length - 1].strategyEquity | number }})</span>
                <span class="legend-item"><span class="dot blue"></span> Benchmark Buy & Hold (\${{ res.equityCurve[res.equityCurve.length - 1].benchmarkEquity | number }})</span>
              </div>
            </div>

            <!-- SVG Equity Curve Render -->
            <div class="svg-container">
              <svg class="equity-svg" viewBox="0 0 900 240" preserveAspectRatio="none">
                <!-- Background Grid Lines -->
                <line x1="0" y1="60" x2="900" y2="60" stroke="#1f2937" stroke-width="1" stroke-dasharray="4" />
                <line x1="0" y1="120" x2="900" y2="120" stroke="#1f2937" stroke-width="1" stroke-dasharray="4" />
                <line x1="0" y1="180" x2="900" y2="180" stroke="#1f2937" stroke-width="1" stroke-dasharray="4" />

                <!-- Benchmark Line (Blue) -->
                <polyline 
                  [attr.points]="generateSvgPoints(res.equityCurve, 'benchmarkEquity', 900, 240)" 
                  fill="none" 
                  stroke="#38bdf8" 
                  stroke-width="2" 
                  stroke-dasharray="3" />

                <!-- Strategy Curve Line (Green/Emerald) -->
                <polyline 
                  [attr.points]="generateSvgPoints(res.equityCurve, 'strategyEquity', 900, 240)" 
                  fill="none" 
                  stroke="#10b981" 
                  stroke-width="3" />
              </svg>
            </div>

            <!-- Drawdown Underwater Plot (SVG) -->
            <div class="drawdown-bar-wrap">
              <div class="dd-title">Underwater Drawdown Profile</div>
              <svg class="dd-svg" viewBox="0 0 900 60" preserveAspectRatio="none">
                <polyline 
                  [attr.points]="generateDrawdownSvgPoints(res.equityCurve, 900, 60)" 
                  fill="rgba(239, 68, 68, 0.2)" 
                  stroke="#ef4444" 
                  stroke-width="1.5" />
              </svg>
            </div>
          </div>

          <!-- Trade Log Table -->
          <div class="trades-box">
            <div class="trades-header">
              <h4>Historical Trade Blotter ({{ res.trades.length }} executed trades)</h4>
              <span class="trades-sub">Every trade accounts for slippage and brokerage fees</span>
            </div>

            <div class="table-scroll">
              <table class="quant-table">
                <thead>
                  <tr>
                    <th>Trade</th>
                    <th>Ticker</th>
                    <th>Side</th>
                    <th>Entry Date</th>
                    <th>Entry Price</th>
                    <th>Exit Date</th>
                    <th>Exit Price</th>
                    <th>Shares</th>
                    <th class="text-right">Net PnL ($)</th>
                    <th class="text-right">Return %</th>
                    <th>Hold Days</th>
                    <th>Exit Reason</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let t of res.trades" [class.win-row]="t.pnl > 0" [class.loss-row]="t.pnl <= 0">
                    <td><strong>{{ t.id }}</strong></td>
                    <td>{{ t.symbol }}</td>
                    <td><span class="badge-side">{{ t.side }}</span></td>
                    <td>{{ t.entryDate }}</td>
                    <td>\${{ t.entryPrice.toFixed(2) }}</td>
                    <td>{{ t.exitDate }}</td>
                    <td>\${{ t.exitPrice.toFixed(2) }}</td>
                    <td>{{ t.shares }}</td>
                    <td class="text-right font-bold" [class.bull]="t.pnl > 0" [class.bear]="t.pnl <= 0">
                      {{ t.pnl >= 0 ? '+' : '' }}\${{ t.pnl.toFixed(2) }}
                    </td>
                    <td class="text-right font-bold" [class.bull]="t.returnPercent > 0" [class.bear]="t.returnPercent <= 0">
                      {{ t.returnPercent >= 0 ? '+' : '' }}{{ t.returnPercent.toFixed(2) }}%
                    </td>
                    <td>{{ t.holdingDays }}d</td>
                    <td><span class="reason-pill">{{ t.reason }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- STAGE 3: WALK-FORWARD & OUT-OF-SAMPLE (OOS) TESTING      -->
      <!-- ======================================================== -->
      <div *ngIf="currentStage() === 3" class="stage-container">
        <div class="stage-header-row">
          <div>
            <h3 class="stage-title">Stage 3 • Walk-Forward / Out-of-Sample (OOS) Validation</h3>
            <p class="stage-intro">
              The anti-curve-fitting test. Comparing in-sample training window with strictly blind out-of-sample data.
            </p>
          </div>
          <div class="btn-group">
            <button class="secondary-action-btn" (click)="setStage(2)">
              ◀ Back to Backtest
            </button>
            <button class="primary-action-btn" (click)="setStage(4)">
              <span>🧪 Advance to Paper Trading</span>
              <span class="arrow">➔</span>
            </button>
          </div>
        </div>

        <div *ngIf="walkForwardResult() as wf">
          <!-- Split Timeline Graphic -->
          <div class="split-timeline-card">
            <div class="timeline-bar">
              <div class="split-segment is-seg" [style.width.%]="wf.trainSplitPercent">
                <span class="seg-label">In-Sample Training ({{ wf.trainSplitPercent }}% • {{ wf.inSampleBars }} bars)</span>
              </div>
              <div class="split-segment oos-seg" [style.width.%]="100 - wf.trainSplitPercent">
                <span class="seg-label">Out-of-Sample Blind Test ({{ 100 - wf.trainSplitPercent }}% • {{ wf.outOfSampleBars }} bars)</span>
              </div>
            </div>
          </div>

          <!-- Overfitting Risk Banner -->
          <div class="overfitting-banner" [ngClass]="wf.overfittingRisk.toLowerCase()">
            <div class="risk-badge">
              <span class="risk-dot"></span>
              OVERFITTING RISK: {{ wf.overfittingRisk }}
            </div>
            <div class="risk-info">
              <h4>{{ wf.overfittingDiagnosis }}</h4>
              <p>
                Sharpe Retention Index: <strong>{{ (wf.sharpeDegradationRatio * 100).toFixed(0) }}%</strong> 
                (In-Sample Sharpe: {{ wf.inSampleResult.metrics.sharpeRatio }} ➔ Out-of-Sample Sharpe: {{ wf.outOfSampleResult.metrics.sharpeRatio }})
              </p>
            </div>
          </div>

          <!-- Side-by-Side Comparison Matrix -->
          <div class="comparison-grid">
            <div class="tear-col">
              <div class="col-header is-header">IN-SAMPLE (TRAINING)</div>
              <div class="stat-row">
                <span>Total Return:</span>
                <strong>+{{ wf.inSampleResult.metrics.totalReturnPercent }}%</strong>
              </div>
              <div class="stat-row">
                <span>Sharpe Ratio:</span>
                <strong>{{ wf.inSampleResult.metrics.sharpeRatio }}</strong>
              </div>
              <div class="stat-row">
                <span>Win Rate:</span>
                <strong>{{ wf.inSampleResult.metrics.winRatePercent }}%</strong>
              </div>
              <div class="stat-row">
                <span>Profit Factor:</span>
                <strong>{{ wf.inSampleResult.metrics.profitFactor }}</strong>
              </div>
              <div class="stat-row">
                <span>Max Drawdown:</span>
                <strong class="bear">-{{ wf.inSampleResult.metrics.maxDrawdownPercent }}%</strong>
              </div>
              <div class="stat-row">
                <span>Total Trades:</span>
                <strong>{{ wf.inSampleResult.metrics.totalTrades }}</strong>
              </div>
            </div>

            <div class="tear-col oos-col">
              <div class="col-header oos-header">OUT-OF-SAMPLE (TEST)</div>
              <div class="stat-row">
                <span>Total Return:</span>
                <strong [class.bull]="wf.outOfSampleResult.metrics.totalReturnPercent > 0">+{{ wf.outOfSampleResult.metrics.totalReturnPercent }}%</strong>
              </div>
              <div class="stat-row">
                <span>Sharpe Ratio:</span>
                <strong [class.bull]="wf.outOfSampleResult.metrics.sharpeRatio > 1">{{ wf.outOfSampleResult.metrics.sharpeRatio }}</strong>
              </div>
              <div class="stat-row">
                <span>Win Rate:</span>
                <strong>{{ wf.outOfSampleResult.metrics.winRatePercent }}%</strong>
              </div>
              <div class="stat-row">
                <span>Profit Factor:</span>
                <strong>{{ wf.outOfSampleResult.metrics.profitFactor }}</strong>
              </div>
              <div class="stat-row">
                <span>Max Drawdown:</span>
                <strong class="bear">-{{ wf.outOfSampleResult.metrics.maxDrawdownPercent }}%</strong>
              </div>
              <div class="stat-row">
                <span>Total Trades:</span>
                <strong>{{ wf.outOfSampleResult.metrics.totalTrades }}</strong>
              </div>
            </div>
          </div>

          <!-- Parameter Sensitivity / Stress-Test Sweep (vectorbt style) -->
          <div class="sensitivity-card" *ngIf="wf.parameterSensitivities.length > 0">
            <h4>Vectorized Parameter Sensitivity Sweep (Robustness Check)</h4>
            <p class="sens-sub">A genuine market edge exhibits a wide plateau; curve-fitted strategies collapse when parameters shift ±10%.</p>

            <div *ngFor="let sens of wf.parameterSensitivities" class="sens-row">
              <span class="sens-param-name">Parameter: <code>{{ sens.paramKey }}</code></span>
              <div class="sens-bars-grid">
                <div *ngFor="let v of sens.variations" class="sens-item">
                  <span class="v-val">{{ v.value }}</span>
                  <div class="v-bar-track">
                    <div class="v-bar-fill" [style.height.%]="Math.min(100, Math.max(10, v.oosSharpe * 35))"></div>
                  </div>
                  <span class="v-sharpe">S: {{ v.oosSharpe.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- STAGE 4: PAPER TRADING SIMULATOR (LIVE DATA, ZERO CASH)  -->
      <!-- ======================================================== -->
      <div *ngIf="currentStage() === 4" class="stage-container">
        <div class="stage-header-row">
          <div>
            <h3 class="stage-title">Stage 4 • Paper Trading Simulator (Forward-Testing)</h3>
            <p class="stage-intro">
              Live forward simulation testing queue priority, bid-ask spread crossing, and real execution drag with virtual \$100,000 cash.
            </p>
          </div>
          <div class="btn-group">
            <button class="secondary-action-btn" (click)="setStage(3)">
              ◀ Walk-Forward Test
            </button>
            <button class="primary-action-btn" (click)="setStage(5)">
              <span>🛡️ Stage 5: Live Risk & Capital</span>
              <span class="arrow">➔</span>
            </button>
          </div>
        </div>

        <!-- Paper Trading Account Dashboard -->
        <div class="paper-dashboard-grid" *ngIf="engine.paperAccount() as acc">
          <div class="paper-metric-card">
            <span class="pm-label">Virtual Portfolio Value</span>
            <span class="pm-val">\${{ acc.portfolioValue | number:'1.2-2' }}</span>
            <span class="pm-sub" [class.bull]="acc.totalReturnPercent >= 0" [class.bear]="acc.totalReturnPercent < 0">
              {{ acc.totalReturnPercent >= 0 ? '+' : '' }}{{ acc.totalReturnPercent.toFixed(2) }}% Overall
            </span>
          </div>

          <div class="paper-metric-card">
            <span class="pm-label">Available Cash</span>
            <span class="pm-val">\${{ acc.cash | number:'1.2-2' }}</span>
            <span class="pm-sub">Uninvested buying power</span>
          </div>

          <div class="paper-metric-card">
            <span class="pm-label">Unrealized PnL</span>
            <span class="pm-val" [class.bull]="acc.unrealizedPnl >= 0" [class.bear]="acc.unrealizedPnl < 0">
              {{ acc.unrealizedPnl >= 0 ? '+' : '' }}\${{ acc.unrealizedPnl | number:'1.2-2' }}
            </span>
            <span class="pm-sub">Open positions marked-to-market</span>
          </div>

          <div class="paper-metric-card">
            <span class="pm-label">Realized Net PnL</span>
            <span class="pm-val" [class.bull]="acc.realizedPnl >= 0" [class.bear]="acc.realizedPnl < 0">
              {{ acc.realizedPnl >= 0 ? '+' : '' }}\${{ acc.realizedPnl | number:'1.2-2' }}
            </span>
            <span class="pm-sub">Closed trade profits</span>
          </div>
        </div>

        <!-- Bot Live Controls Bar -->
        <div class="bot-control-bar" *ngIf="engine.paperAccount() as acc">
          <div class="bot-status-wrap">
            <span class="pulse-circle" [class.running]="acc.isBotRunning"></span>
            <strong>Simulated Bot Status:</strong>
            <span class="status-text" [class.running]="acc.isBotRunning">
              {{ acc.isBotRunning ? 'RUNNING (Broadcasting Market Ticks)' : 'PAUSED' }}
            </span>
          </div>

          <div class="bot-actions">
            <button 
              class="bot-btn" 
              [class.start-btn]="!acc.isBotRunning" 
              [class.stop-btn]="acc.isBotRunning"
              (click)="togglePaperBot()">
              {{ acc.isBotRunning ? '⏸ Pause Paper Bot' : '▶ Start Live Paper Bot' }}
            </button>

            <button class="bot-btn reset-btn" (click)="resetPaperAccount()">
              🔄 Reset \$100k Account
            </button>
          </div>
        </div>

        <!-- Split View: Order Ticket & Active Positions -->
        <div class="stage-grid">
          <!-- Manual Order Ticket -->
          <div class="config-panel">
            <h4 class="panel-heading">Interactive Paper Order Ticket</h4>

            <div class="form-group">
              <label>Ticker:</label>
              <select class="form-control" [(ngModel)]="orderSymbol">
                <option *ngFor="let s of availableStocks()" [value]="s.symbol">
                  {{ s.symbol }} • \${{ s.price.toFixed(2) }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Order Side:</label>
              <div class="side-picker">
                <button 
                  class="side-btn buy-btn" 
                  [class.active]="orderSide === 'BUY'" 
                  (click)="orderSide = 'BUY'">
                  BUY / LONG
                </button>
                <button 
                  class="side-btn sell-btn" 
                  [class.active]="orderSide === 'SELL'" 
                  (click)="orderSide = 'SELL'">
                  SELL / EXIT
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Shares Quantity:</label>
              <input type="number" class="form-control" [(ngModel)]="orderShares" min="1" max="1000" />
            </div>

            <div class="order-summary-box" *ngIf="currentSelectedStock() as s">
              <div>Est. Execution Price: <strong>\${{ s.price.toFixed(2) }}</strong></div>
              <div>Estimated Total: <strong>\${{ (s.price * orderShares).toFixed(2) }}</strong></div>
              <div>Simulated Spread Slippage: <strong>~0.04% (4 bps)</strong></div>
            </div>

            <button class="primary-action-btn full-w" (click)="submitManualOrder()">
              Submit Paper {{ orderSide }} Order
            </button>
          </div>

          <!-- Active Positions & Order Blotter -->
          <div class="hypothesis-panel">
            <div class="positions-card" *ngIf="engine.paperAccount() as acc">
              <h4 class="panel-heading">Active Open Positions ({{ acc.positions.length }})</h4>
              
              <div *ngIf="acc.positions.length === 0" class="empty-positions">
                No active open positions. Start the automated paper bot or submit an order to simulate live trading!
              </div>

              <table *ngIf="acc.positions.length > 0" class="quant-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Shares</th>
                    <th>Avg Fill</th>
                    <th>Current</th>
                    <th>Unrealized PnL</th>
                    <th>Return %</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let p of acc.positions">
                    <td><strong>{{ p.symbol }}</strong></td>
                    <td>{{ p.shares }}</td>
                    <td>\${{ p.avgEntryPrice.toFixed(2) }}</td>
                    <td>\${{ p.currentPrice.toFixed(2) }}</td>
                    <td [class.bull]="p.unrealizedPnl >= 0" [class.bear]="p.unrealizedPnl < 0">
                      {{ p.unrealizedPnl >= 0 ? '+' : '' }}\${{ p.unrealizedPnl.toFixed(2) }}
                    </td>
                    <td [class.bull]="p.unrealizedReturnPercent >= 0" [class.bear]="p.unrealizedReturnPercent < 0">
                      {{ p.unrealizedReturnPercent >= 0 ? '+' : '' }}{{ p.unrealizedReturnPercent.toFixed(2) }}%
                    </td>
                    <td>
                      <button class="close-pos-btn" (click)="closePosition(p)">Close</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Recent Orders Log -->
            <div class="orders-log-card" *ngIf="engine.paperAccount() as acc">
              <h4>Recent Paper Execution Blotter</h4>
              <div class="table-scroll mini">
                <table class="quant-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Order ID</th>
                      <th>Symbol</th>
                      <th>Side</th>
                      <th>Shares</th>
                      <th>Fill Price</th>
                      <th>Slippage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let ord of acc.orderHistory.slice(0, 8)">
                      <td>{{ ord.timestamp }}</td>
                      <td>{{ ord.id }}</td>
                      <td>{{ ord.symbol }}</td>
                      <td><span class="badge-side">{{ ord.side }}</span></td>
                      <td>{{ ord.shares }}</td>
                      <td>\${{ ord.executionPrice?.toFixed(2) }}</td>
                      <td>\${{ ord.slippagePaid?.toFixed(2) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- STAGE 5: SMALL LIVE CAPITAL & RISK MANAGEMENT CONSOLE    -->
      <!-- ======================================================== -->
      <div *ngIf="currentStage() === 5" class="stage-container">
        <div class="stage-header-row">
          <div>
            <h3 class="stage-title">Stage 5 • Small Live Capital Deployment & Risk Management</h3>
            <p class="stage-intro">
              Scale live capital conservatively. Protect downside with automated circuit breakers, Kelly position sizing, and slippage monitors.
            </p>
          </div>
          <button class="secondary-action-btn" (click)="setStage(4)">
            ◀ Back to Paper Testing
          </button>
        </div>

        <div class="stage-grid">
          <!-- Kelly Sizing & Allocation Calculator -->
          <div class="config-panel">
            <h4 class="panel-heading">Kelly Criterion Position Sizing</h4>

            <div class="kelly-card" *ngIf="calculatedKelly() as k">
              <div class="k-stat">
                <span class="k-label">Quarter-Kelly (Recommended)</span>
                <span class="k-val green">{{ (k.quarterKelly * 100).toFixed(1) }}% of Portfolio</span>
                <span class="k-desc">Conservative institutional sizing minimizing volatility drag</span>
              </div>
              <div class="k-stat">
                <span class="k-label">Half-Kelly</span>
                <span class="k-val yellow">{{ (k.halfKelly * 100).toFixed(1) }}% of Portfolio</span>
              </div>
              <div class="k-stat">
                <span class="k-label">Full Kelly</span>
                <span class="k-val orange">{{ (k.fullKelly * 100).toFixed(1) }}% of Portfolio</span>
                <span class="k-desc">⚠️ Aggressive mathematical maximum; high drawdown variance</span>
              </div>
            </div>

            <!-- Small Capital Slider -->
            <div class="capital-slider-box" *ngIf="engine.liveRisk() as lr">
              <label>Live Capital Allocation (\$ USD):</label>
              <div class="slider-row">
                <input 
                  type="range" 
                  min="2000" 
                  max="50000" 
                  step="1000" 
                  [(ngModel)]="lr.liveCapitalAllocation" />
                <span class="slider-val">\${{ lr.liveCapitalAllocation | number }}</span>
              </div>
              <p class="slider-note">Rule: Never start with >25% of final target capital until 100 live trades confirm positive expectancy.</p>
            </div>
          </div>

          <!-- Automated Circuit Breakers & Risk Controls -->
          <div class="hypothesis-panel">
            <div class="risk-controls-card" *ngIf="engine.liveRisk() as lr">
              <div class="rc-header">
                <h4 class="panel-heading">Automated Circuit Breakers & Kill-Switches</h4>
                <span class="circuit-status" [class.tripped]="lr.circuitBreakerTripped">
                  {{ lr.circuitBreakerTripped ? '🚨 CIRCUIT BREAKER TRIPPED' : '🛡️ SYSTEM ARMED & ACTIVE' }}
                </span>
              </div>

              <div *ngIf="lr.circuitBreakerTripped" class="tripped-alert">
                <strong>HALT TRIGGERED:</strong> {{ lr.circuitBreakerReason }}
                <button class="reset-circuit-btn" (click)="engine.resetCircuitBreaker()">Reset & Re-arm Circuit Breaker</button>
              </div>

              <div class="risk-inputs-grid">
                <div class="form-group">
                  <label>Max Strategy Drawdown Kill-Switch (%):</label>
                  <input type="number" class="form-control" [(ngModel)]="lr.maxStrategyDrawdownPercent" step="0.5" />
                  <span class="field-hint">Auto-liquidates and freezes trading if drawdown reaches this ceiling.</span>
                </div>

                <div class="form-group">
                  <label>Daily Max Loss Limit (%):</label>
                  <input type="number" class="form-control" [(ngModel)]="lr.dailyMaxLossPercent" step="0.5" />
                  <span class="field-hint">Stops all new orders for the remainder of the session.</span>
                </div>

                <div class="form-group">
                  <label>Max Single Position Size (%):</label>
                  <input type="number" class="form-control" [(ngModel)]="lr.maxPositionSizePercent" />
                  <span class="field-hint">Portfolio concentration boundary limit.</span>
                </div>
              </div>

              <!-- Execution Drag Monitor -->
              <div class="drag-box">
                <div class="drag-header">
                  <strong>Tracked Execution Drag (Live vs Paper):</strong>
                  <span class="drag-val">{{ lr.executionDragBpsTracked }} bps (0.042%)</span>
                </div>
                <p class="drag-desc">
                  Measures the difference between simulated fill price and broker order fill. If drag exceeds 15 bps, review order execution routing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .lifecycle-root {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      color: #f1f5f9;
    }

    /* Top Educational Header Banner */
    .lifecycle-banner {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 12px;
      padding: 1.5rem 1.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .banner-badge {
      font-size: 0.72rem;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 0.35rem;
    }

    .banner-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 0.4rem 0;
      letter-spacing: -0.02em;
    }

    .banner-subtitle .quote {
      font-size: 0.92rem;
      color: #94a3b8;
      font-style: italic;
    }

    .learn-toggle-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(30, 58, 138, 0.3);
      border: 1px solid rgba(96, 165, 250, 0.4);
      color: #93c5fd;
      padding: 0.6rem 1.1rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .learn-toggle-btn:hover {
      background: rgba(37, 99, 235, 0.4);
      color: #ffffff;
      border-color: #60a5fa;
    }

    /* Learning Lab Drawer */
    .learning-lab-drawer {
      background: #0b1329;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 1.25rem;
      animation: fadeIn 0.25s ease-out;
    }

    .lab-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }

    .lab-card {
      background: #111c3a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 1rem;
    }

    .lab-tag {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-bottom: 0.4rem;
    }
    .lab-tag.green { color: #34d399; }
    .lab-tag.purple { color: #c084fc; }
    .lab-tag.blue { color: #60a5fa; }
    .lab-tag.orange { color: #fb923c; }

    .lab-card h4 {
      font-size: 0.95rem;
      margin: 0 0 0.6rem 0;
      color: #ffffff;
    }

    .lab-list {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.8rem;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .lab-list code {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
    }

    /* 5-Stage Interactive Pipeline Bar */
    .pipeline-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 0.75rem 1.25rem;
      overflow-x: auto;
    }

    .stage-step {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: transparent;
      border: 1px solid transparent;
      white-space: nowrap;
    }

    .stage-step:hover {
      background: rgba(30, 41, 59, 0.6);
    }

    .stage-step.active {
      background: rgba(37, 99, 235, 0.2);
      border-color: #3b82f6;
    }

    .stage-step.completed .step-num {
      background: #059669;
      color: #ffffff;
    }

    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #1e293b;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.82rem;
      transition: all 0.2s;
    }

    .stage-step.active .step-num {
      background: #3b82f6;
      color: #ffffff;
    }

    .step-info {
      display: flex;
      flex-direction: column;
    }

    .step-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: #ffffff;
    }

    .step-desc {
      font-size: 0.72rem;
      color: #94a3b8;
    }

    .step-arrow {
      color: #475569;
      font-size: 0.9rem;
      user-select: none;
    }

    /* Stage Containers & Layout */
    .stage-container {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      animation: fadeIn 0.2s ease-out;
    }

    .stage-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 1.25rem;
    }

    .stage-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 0.35rem 0;
    }

    .stage-intro {
      font-size: 0.88rem;
      color: #94a3b8;
      margin: 0;
    }

    .stage-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 980px) {
      .stage-grid {
        grid-template-columns: 1fr;
      }
    }

    .config-panel, .hypothesis-panel {
      background: #111c3a;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
    }

    .panel-heading {
      font-size: 1rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 0.5rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 0.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .form-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #94a3b8;
    }

    .form-control {
      background: #090e1f;
      border: 1px solid #334155;
      color: #ffffff;
      padding: 0.6rem 0.8rem;
      border-radius: 6px;
      font-size: 0.88rem;
      outline: none;
    }
    .form-control:focus {
      border-color: #3b82f6;
    }

    .ticker-picker-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .ticker-badge {
      display: flex;
      gap: 0.5rem;
      white-space: nowrap;
    }
    .badge-price {
      background: #1e293b;
      padding: 0.4rem 0.7rem;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .badge-score {
      background: rgba(30, 41, 59, 0.6);
      padding: 0.4rem 0.7rem;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.85rem;
      color: #94a3b8;
    }
    .badge-score.bull {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }

    .params-box, .friction-box {
      background: #090e1f;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .params-title, .friction-title {
      font-size: 0.78rem;
      font-weight: 700;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .params-row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .params-row.border-top {
      border-top: 1px dashed #1e293b;
      padding-top: 0.6rem;
    }

    .param-item {
      flex: 1;
      min-width: 90px;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .param-item label {
      font-size: 0.72rem;
      color: #94a3b8;
    }
    .param-item input {
      background: #111c3a;
      border: 1px solid #334155;
      color: #ffffff;
      padding: 0.4rem 0.6rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .rationale-card {
      background: #090e1f;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
    }

    .badge-pill {
      align-self: flex-start;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.4);
      padding: 0.25rem 0.6rem;
      border-radius: 20px;
    }

    .hypothesis-headline {
      font-size: 1.15rem;
      margin: 0;
      color: #ffffff;
    }

    .hypothesis-body {
      font-size: 0.88rem;
      color: #cbd5e1;
      margin: 0;
      line-height: 1.5;
    }

    .edge-box {
      background: rgba(16, 185, 129, 0.1);
      border-left: 3px solid #10b981;
      padding: 0.75rem 1rem;
      border-radius: 0 6px 6px 0;
      font-size: 0.82rem;
      color: #a7f3d0;
    }
    .edge-box strong { color: #34d399; display: block; margin-bottom: 0.25rem; }
    .edge-box p { margin: 0; }

    .trap-warning {
      background: rgba(245, 158, 11, 0.1);
      border-left: 3px solid #f59e0b;
      padding: 0.75rem 1rem;
      border-radius: 0 6px 6px 0;
      font-size: 0.82rem;
      color: #fde68a;
    }
    .trap-warning strong { color: #fbbf24; display: block; margin-bottom: 0.25rem; }
    .trap-warning p { margin: 0; }

    /* Python Export Card */
    .python-export-card {
      background: #060a17;
      border: 1px solid #1e293b;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .export-header {
      background: #0c142b;
      border-bottom: 1px solid #1e293b;
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .export-tag {
      font-size: 0.72rem;
      font-weight: 700;
      color: #38bdf8;
    }
    .export-sub {
      font-size: 0.68rem;
      color: #64748b;
    }

    .copy-btn {
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.4);
      color: #93c5fd;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .copy-btn:hover { background: #2563eb; color: #fff; }

    .code-preview {
      margin: 0;
      padding: 1rem;
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 0.75rem;
      color: #94a3b8;
      max-height: 180px;
      overflow-y: auto;
      line-height: 1.45;
    }

    /* Buttons */
    .btn-group {
      display: flex;
      gap: 0.75rem;
    }

    .primary-action-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #2563eb;
      border: none;
      color: #ffffff;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 10px rgba(37, 99, 235, 0.3);
    }
    .primary-action-btn:hover {
      background: #1d4ed8;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
    }
    .primary-action-btn.full-w {
      width: 100%;
      justify-content: center;
      margin-top: 0.5rem;
    }

    .secondary-action-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #cbd5e1;
      padding: 0.65rem 1.1rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .secondary-action-btn:hover {
      background: #334155;
      color: #ffffff;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
    }

    .kpi-card {
      background: #111c3a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .kpi-label {
      font-size: 0.74rem;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .kpi-val {
      font-size: 1.6rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
    }

    .kpi-sub {
      font-size: 0.72rem;
      color: #64748b;
    }

    .kpi-card.positive .kpi-val { color: #10b981; }
    .kpi-card.negative .kpi-val { color: #ef4444; }
    .kpi-card.good-sharpe .kpi-val { color: #38bdf8; }

    .badge-tag {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }
    .badge-tag.green { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .badge-tag.yellow { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .badge-tag.red { background: rgba(239, 68, 68, 0.2); color: #f87171; }

    /* Chart Box */
    .chart-box {
      background: #090e1f;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .chart-title {
      display: flex;
      flex-direction: column;
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
    }
    .chart-title .sub { font-size: 0.72rem; color: #94a3b8; font-weight: normal; }

    .chart-legend {
      display: flex;
      gap: 1rem;
      font-size: 0.8rem;
    }
    .legend-item { display: flex; align-items: center; gap: 0.4rem; color: #cbd5e1; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot.green { background: #10b981; }
    .dot.blue { background: #38bdf8; }

    .svg-container {
      width: 100%;
      height: 220px;
      background: #060a17;
      border: 1px solid #1e293b;
      border-radius: 6px;
      overflow: hidden;
    }
    .equity-svg { width: 100%; height: 100%; }

    .drawdown-bar-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .dd-title {
      font-size: 0.72rem;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
    }
    .dd-svg {
      width: 100%;
      height: 50px;
      background: #060a17;
      border: 1px solid #1e293b;
      border-radius: 4px;
    }

    /* Tables */
    .trades-box {
      background: #090e1f;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 1.25rem;
    }

    .trades-header {
      margin-bottom: 0.75rem;
    }
    .trades-header h4 { margin: 0 0 0.25rem 0; font-size: 0.95rem; color: #fff; }
    .trades-sub { font-size: 0.72rem; color: #64748b; }

    .table-scroll {
      overflow-x: auto;
      max-height: 320px;
      border: 1px solid #1e293b;
      border-radius: 6px;
    }
    .table-scroll.mini { max-height: 200px; }

    .quant-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
      text-align: left;
    }
    .quant-table th {
      background: #0c142b;
      color: #94a3b8;
      padding: 0.6rem 0.8rem;
      border-bottom: 1px solid #1e293b;
      font-weight: 600;
    }
    .quant-table td {
      padding: 0.55rem 0.8rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #cbd5e1;
    }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .bull { color: #10b981; }
    .bear { color: #ef4444; }

    .badge-side {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      background: #1e293b;
      color: #38bdf8;
    }

    .reason-pill {
      font-size: 0.7rem;
      background: rgba(30, 41, 59, 0.6);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      color: #cbd5e1;
    }

    /* Stage 3: Walk-Forward Styling */
    .split-timeline-card {
      background: #090e1f;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 1rem;
    }

    .timeline-bar {
      display: flex;
      height: 38px;
      border-radius: 6px;
      overflow: hidden;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .is-seg {
      background: #1e3a8a;
      color: #93c5fd;
      display: flex;
      align-items: center;
      justify-content: center;
      border-right: 2px solid #3b82f6;
    }

    .oos-seg {
      background: #4c1d95;
      color: #d8b4fe;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .overfitting-banner {
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      gap: 1.25rem;
      align-items: center;
      border: 1px solid transparent;
    }
    .overfitting-banner.low {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.3);
    }
    .overfitting-banner.moderate {
      background: rgba(245, 158, 11, 0.1);
      border-color: rgba(245, 158, 11, 0.3);
    }
    .overfitting-banner.high {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
    }

    .risk-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      font-weight: 800;
      white-space: nowrap;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.3);
    }
    .overfitting-banner.low .risk-badge { color: #34d399; }
    .overfitting-banner.moderate .risk-badge { color: #fbbf24; }
    .overfitting-banner.high .risk-badge { color: #f87171; }

    .risk-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    .risk-info h4 { margin: 0 0 0.25rem 0; font-size: 0.95rem; color: #fff; }
    .risk-info p { margin: 0; font-size: 0.82rem; color: #cbd5e1; }

    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .tear-col {
      background: #111c3a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .col-header {
      font-size: 0.85rem;
      font-weight: 800;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .is-header { color: #60a5fa; }
    .oos-header { color: #c084fc; }

    .stat-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.82rem;
      color: #94a3b8;
    }
    .stat-row strong { color: #ffffff; }

    .sensitivity-card {
      background: #090e1f;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 1.25rem;
    }
    .sensitivity-card h4 { margin: 0 0 0.25rem 0; color: #fff; font-size: 0.95rem; }
    .sens-sub { font-size: 0.75rem; color: #64748b; margin: 0 0 1rem 0; }

    .sens-row {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .sens-param-name { font-size: 0.8rem; color: #cbd5e1; }
    .sens-param-name code { color: #38bdf8; }

    .sens-bars-grid {
      display: flex;
      gap: 1rem;
      align-items: flex-end;
      height: 90px;
      background: #060a17;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      border: 1px solid #1e293b;
    }

    .sens-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      flex: 1;
      height: 100%;
    }
    .v-val { font-size: 0.7rem; color: #94a3b8; }
    .v-bar-track {
      flex: 1;
      width: 18px;
      background: #1e293b;
      border-radius: 3px;
      display: flex;
      align-items: flex-end;
      overflow: hidden;
    }
    .v-bar-fill {
      width: 100%;
      background: #3b82f6;
      border-radius: 3px;
      transition: height 0.3s;
    }
    .v-sharpe { font-size: 0.65rem; color: #38bdf8; font-weight: 700; }

    /* Stage 4: Paper Trading Dashboard */
    .paper-dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }

    .paper-metric-card {
      background: #111c3a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .pm-label { font-size: 0.72rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; }
    .pm-val { font-size: 1.5rem; font-weight: 800; color: #ffffff; }
    .pm-sub { font-size: 0.72rem; color: #64748b; font-weight: 600; }

    .bot-control-bar {
      background: #090e1f;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 0.9rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .bot-status-wrap {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.88rem;
    }
    .pulse-circle {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #64748b;
    }
    .pulse-circle.running {
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 1.5s infinite;
    }
    .status-text.running { color: #34d399; font-weight: 700; }

    .bot-actions { display: flex; gap: 0.75rem; }
    .bot-btn {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.82rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .start-btn { background: #10b981; color: #fff; }
    .start-btn:hover { background: #059669; }
    .stop-btn { background: #ef4444; color: #fff; }
    .stop-btn:hover { background: #dc2626; }
    .reset-btn { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
    .reset-btn:hover { background: #334155; color: #fff; }

    .side-picker { display: flex; gap: 0.5rem; }
    .side-btn {
      flex: 1;
      padding: 0.55rem;
      border-radius: 6px;
      border: 1px solid #334155;
      background: #090e1f;
      color: #94a3b8;
      font-weight: 700;
      font-size: 0.82rem;
      cursor: pointer;
    }
    .side-btn.buy-btn.active {
      background: rgba(16, 185, 129, 0.2);
      border-color: #10b981;
      color: #34d399;
    }
    .side-btn.sell-btn.active {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
      color: #f87171;
    }

    .order-summary-box {
      background: #090e1f;
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 0.75rem;
      font-size: 0.78rem;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .order-summary-box strong { color: #ffffff; }

    .empty-positions {
      padding: 1.5rem;
      text-align: center;
      font-size: 0.82rem;
      color: #64748b;
      background: #090e1f;
      border-radius: 6px;
      border: 1px dashed #1e293b;
    }

    .close-pos-btn {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
    }
    .close-pos-btn:hover { background: #ef4444; color: #fff; }

    /* Stage 5: Live Risk Console */
    .kelly-card {
      background: #090e1f;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .k-stat {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      padding-bottom: 0.6rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .k-label { font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
    .k-val { font-size: 1.25rem; font-weight: 800; }
    .k-val.green { color: #34d399; }
    .k-val.yellow { color: #fbbf24; }
    .k-val.orange { color: #fb923c; }
    .k-desc { font-size: 0.7rem; color: #64748b; }

    .capital-slider-box {
      background: #090e1f;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .slider-row { display: flex; align-items: center; gap: 1rem; }
    .slider-row input { flex: 1; accent-color: #3b82f6; }
    .slider-val { font-weight: 800; font-size: 1.1rem; color: #38bdf8; width: 85px; }
    .slider-note { font-size: 0.72rem; color: #94a3b8; margin: 0; }

    .risk-controls-card {
      background: #090e1f;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .rc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .circuit-status {
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.3rem 0.75rem;
      border-radius: 20px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }
    .circuit-status.tripped {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
      color: #f87171;
      animation: pulse 1.2s infinite;
    }

    .tripped-alert {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid #ef4444;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      font-size: 0.82rem;
      color: #fca5a5;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .reset-circuit-btn {
      background: #ef4444;
      border: none;
      color: #fff;
      padding: 0.35rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
    }

    .risk-inputs-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
    .field-hint { font-size: 0.7rem; color: #64748b; }

    .drag-box {
      background: #060a17;
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .drag-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.82rem;
      color: #ffffff;
    }
    .drag-val { color: #38bdf8; font-weight: 700; }
    .drag-desc { font-size: 0.72rem; color: #94a3b8; margin: 0; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `]
})
export class StrategyLifecycleComponent implements OnInit, OnDestroy {
  readonly stockService = inject(FirestoreStockService);
  readonly engine = inject(StrategyEngineService);

  readonly Math = Math;

  // Active Stage Signal
  readonly currentStage = signal<LifecycleStage>(1);
  readonly showLearningLab = signal<boolean>(false);
  readonly copiedPython = signal<boolean>(false);

  // Strategy Presets
  strategies: TradingStrategyConfig[] = [];
  selectedStrategyId = 'danelfin-ai-alpha';
  activeStrategy!: TradingStrategyConfig;

  // Asset Selection
  selectedTicker = 'NVDA';
  availableStocks = computed(() => this.stockService.stocks());
  currentSelectedStock = computed(() => {
    return this.availableStocks().find(s => s.symbol === this.selectedTicker) || this.availableStocks()[0];
  });

  // Backtest & WalkForward Results
  backtestResult = signal<BacktestResult | null>(null);
  walkForwardResult = signal<WalkForwardResult | null>(null);

  // Backtest Settings
  backtestSettings: BacktestSettings = {
    initialCapital: 100000,
    positionSizePercent: 25,
    commissionPerTrade: 1.0,
    slippageBps: 5,
    benchmarkTicker: 'SPY'
  };

  // Stage 4 Paper Order Inputs
  orderSymbol = 'NVDA';
  orderSide: 'BUY' | 'SELL' = 'BUY';
  orderShares = 25;

  // Stage 5 Kelly Calculated
  calculatedKelly = computed(() => {
    const res = this.backtestResult();
    const winRate = res ? res.metrics.winRatePercent : 62;
    const pf = res ? res.metrics.profitFactor : 1.8;
    return this.engine.calculateKellyCriterion(winRate, pf);
  });

  ngOnInit() {
    this.strategies = this.engine.getDefaultStrategies();
    this.activeStrategy = { ...this.strategies[0], params: { ...this.strategies[0].params } };
    this.selectedStrategyId = this.activeStrategy.id;
    this.orderSymbol = this.selectedTicker;

    // Run initial backtest in background
    setTimeout(() => {
      this.runInitialBacktest();
    }, 100);
  }

  ngOnDestroy() {
    this.engine.stopPaperBot();
  }

  setStage(stage: LifecycleStage) {
    this.currentStage.set(stage);
    if (stage === 2 && !this.backtestResult()) {
      this.executeBacktest();
    } else if (stage === 3 && !this.walkForwardResult()) {
      this.executeWalkForward();
    }
  }

  onStrategyChange() {
    const found = this.strategies.find(s => s.id === this.selectedStrategyId);
    if (found) {
      this.activeStrategy = { ...found, params: { ...found.params } };
      this.selectedTicker = found.targetTicker;
      this.orderSymbol = this.selectedTicker;
    }
  }

  onTickerChange() {
    this.orderSymbol = this.selectedTicker;
  }

  runInitialBacktest() {
    const stock = this.currentSelectedStock();
    if (stock && stock.candles && stock.candles.length > 0) {
      const res = this.engine.runBacktest(
        this.activeStrategy,
        stock.candles,
        this.backtestSettings,
        stock.symbol,
        stock.aiScore?.overall || 8
      );
      this.backtestResult.set(res);
    }
  }

  executeBacktest() {
    const stock = this.currentSelectedStock();
    if (!stock || !stock.candles) return;
    const res = this.engine.runBacktest(
      this.activeStrategy,
      stock.candles,
      this.backtestSettings,
      stock.symbol,
      stock.aiScore?.overall || 8
    );
    this.backtestResult.set(res);
  }

  executeBacktestAndAdvance() {
    this.executeBacktest();
    this.setStage(2);
  }

  executeWalkForward() {
    const stock = this.currentSelectedStock();
    if (!stock || !stock.candles) return;
    const wf = this.engine.runWalkForwardAnalysis(
      this.activeStrategy,
      stock.candles,
      this.backtestSettings,
      stock.symbol,
      70,
      stock.aiScore?.overall || 8
    );
    this.walkForwardResult.set(wf);
  }

  executeWalkForwardAndAdvance() {
    this.executeWalkForward();
    this.setStage(3);
  }

  // Paper Trading Actions
  togglePaperBot() {
    const stock = this.currentSelectedStock();
    if (!stock) return;
    if (this.engine.paperAccount().isBotRunning) {
      this.engine.stopPaperBot();
    } else {
      this.engine.startPaperBot(stock, this.activeStrategy);
    }
  }

  resetPaperAccount() {
    this.engine.resetPaperAccount(100000);
  }

  submitManualOrder() {
    const stock = this.availableStocks().find(s => s.symbol === this.orderSymbol) || this.currentSelectedStock();
    if (!stock) return;
    this.engine.executePaperOrder(stock.symbol, this.orderSide, this.orderShares, stock.price, 'Manual Web Ticket');
  }

  closePosition(pos: PaperPosition) {
    this.engine.executePaperOrder(pos.symbol, 'SELL', pos.shares, pos.currentPrice, 'Manual Close');
  }

  // SVG Chart Builders
  generateSvgPoints(curve: EquityPoint[], key: 'strategyEquity' | 'benchmarkEquity', width: number, height: number): string {
    if (!curve || curve.length === 0) return '';
    const values = curve.map(p => p[key]);
    const min = Math.min(...values) * 0.98;
    const max = Math.max(...values) * 1.02;
    const range = max - min || 1;

    return values.map((val, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 20) - 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  generateDrawdownSvgPoints(curve: EquityPoint[], width: number, height: number): string {
    if (!curve || curve.length === 0) return '';
    const drawdowns = curve.map(p => p.drawdownPercent);
    const maxDd = Math.max(10, Math.max(...drawdowns));

    const points = drawdowns.map((dd, idx) => {
      const x = (idx / (drawdowns.length - 1)) * width;
      const y = (dd / maxDd) * (height - 8) + 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // Close polygon to bottom
    const firstX = 0;
    const lastX = width;
    return `0,0 ${points.join(' ')} ${lastX},0`;
  }

  pythonSnippetPreview(): string {
    return this.engine.generatePythonScript(this.activeStrategy, this.selectedTicker);
  }

  copyPythonCode() {
    const script = this.pythonSnippetPreview();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(script);
      this.copiedPython.set(true);
      setTimeout(() => this.copiedPython.set(false), 2000);
    }
  }
}
