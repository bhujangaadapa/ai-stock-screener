import { Injectable, signal } from '@angular/core';
import { HistoricalCandle, Stock } from '../models/stock.model';
import {
  TradingStrategyConfig,
  StrategyType,
  BacktestSettings,
  BacktestResult,
  PerformanceMetrics,
  EquityPoint,
  TradeRecord,
  WalkForwardResult,
  PaperTradingAccount,
  PaperOrder,
  PaperPosition,
  LiveRiskSettings,
  OverfittingRiskLevel,
  ML4TProjectTab,
  TOSResult,
  PortfolioOptimizationResult,
  MarketsimOrder,
  MarketsimResult,
  QLearningResult
} from '../models/strategy-lifecycle.model';

@Injectable({
  providedIn: 'root'
})
export class StrategyEngineService {

  // Reactive state for the Paper Trading Account
  readonly paperAccount = signal<PaperTradingAccount>({
    cash: 100000,
    initialCash: 100000,
    portfolioValue: 100000,
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalReturnPercent: 0,
    positions: [],
    orderHistory: [],
    isBotRunning: false,
    botSpeedMs: 1200,
    currentSimulatedBarIndex: 0
  });

  // Reactive state for Live Risk Controls
  readonly liveRisk = signal<LiveRiskSettings>({
    liveCapitalAllocation: 15000, // $15k small live capital
    maxPositionSizePercent: 10,
    dailyMaxLossPercent: 2.0,
    maxStrategyDrawdownPercent: 7.5,
    recommendedKellyFraction: 0.25,
    circuitBreakerTripped: false,
    killSwitchActive: false,
    executionDragBpsTracked: 4.2
  });

  // Simulation timer reference
  private botTimer: any = null;

  // ==========================================
  // 1. STRATEGY PRESETS & TEMPLATES
  // ==========================================
  getDefaultStrategies(): TradingStrategyConfig[] {
    return [
      {
        id: 'danelfin-ai-alpha',
        name: 'Aura Danelfin AI Multi-Factor Momentum',
        type: 'DANELFIN_AI_MOMENTUM',
        description: 'Enters when AI Score is 8+ (Strong Outperform) with technical RSI trend confirmation. Exits when AI Score degrades or overbought.',
        hypothesis: 'Cross-sectional AI models synthesizing fundamental earnings quality, analyst revisions, and momentum yield higher forward win-probability over 60-day horizons.',
        rationale: 'Filters out low-quality speculative stocks and focuses capital on highest-conviction institutional compounders.',
        targetTicker: 'NVDA',
        stopLossPercent: 6,
        takeProfitPercent: 16,
        params: {
          minAiScore: 8,
          rsiMaxEntry: 68,
          rsiExit: 78,
          smaTrendPeriod: 50
        }
      },
      {
        id: 'golden-cross-trend',
        name: 'SMA 50 / 200 DMA Golden Cross Trend',
        type: 'SMA_GOLDEN_CROSS',
        description: 'Classic institutional trend-following system: Go long when SMA 50 crosses above SMA 200, exit when SMA 50 crosses below.',
        hypothesis: 'Large institutional asset managers rebalance over weeks and months, generating persistent medium-term trends after moving average regime shifts.',
        rationale: 'Avoids deep bear markets (staying in cash) and rides multi-month bull trends with disciplined risk control.',
        targetTicker: 'AAPL',
        stopLossPercent: 7,
        takeProfitPercent: 22,
        params: {
          fastPeriod: 20,
          slowPeriod: 50
        }
      },
      {
        id: 'rsi-mean-reversion',
        name: 'RSI (14) Dynamic Mean Reversion',
        type: 'RSI_MEAN_REVERSION',
        description: 'Buys oversold pullbacks (RSI < 32) in established companies, taking profit on bounce recovery (RSI > 65).',
        hypothesis: 'Short-term panic selling causes temporary liquidity imbalances where prices overshoot fair value, producing sharp mean-reverting snapbacks.',
        rationale: 'High win-rate setup with rapid capital turnover and tight stop-loss boundaries.',
        targetTicker: 'MSFT',
        stopLossPercent: 4.5,
        takeProfitPercent: 9,
        params: {
          rsiPeriod: 14,
          oversoldThreshold: 32,
          overboughtThreshold: 68
        }
      },
      {
        id: 'bollinger-breakout',
        name: 'Bollinger Band Volatility Squeeze & Breakout',
        type: 'BOLLINGER_BREAKOUT',
        description: 'Identifies volatility contraction (band squeeze) and enters as price closes above the upper 2-standard-deviation band.',
        hypothesis: 'Markets alternate cyclically between low volatility (consolidation) and high volatility (directional explosion).',
        rationale: 'Captures early momentum swings before general market recognition.',
        targetTicker: 'TSLA',
        stopLossPercent: 5,
        takeProfitPercent: 14,
        params: {
          period: 20,
          stdDev: 2.0
        }
      },
      {
        id: 'macd-trend-momentum',
        name: 'MACD (12, 26, 9) Histogram Acceleration',
        type: 'MACD_TREND',
        description: 'Enters when MACD Line crosses above Signal Line and Histogram expands positively; exits on MACD bearish crossover.',
        hypothesis: 'Rate-of-change momentum acceleration precedes price continuation by 3 to 10 trading sessions.',
        rationale: 'Clean mathematical divergence and momentum confirmation system.',
        targetTicker: 'AMZN',
        stopLossPercent: 5.5,
        takeProfitPercent: 12,
        params: {
          fast: 12,
          slow: 26,
          signal: 9
        }
      }
    ];
  }

  // ==========================================
  // 2. QUANTITATIVE INDICATOR MATHEMATICS
  // ==========================================
  calculateSMA(prices: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const slice = prices.slice(i - period + 1, i + 1);
        const sum = slice.reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    return result;
  }

  calculateEMA(prices: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    const k = 2 / (period + 1);
    let ema: number | null = null;

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else if (i === period - 1) {
        const sum = prices.slice(0, period).reduce((a, b) => a + b, 0);
        ema = sum / period;
        result.push(ema);
      } else {
        ema = prices[i] * k + (ema as number) * (1 - k);
        result.push(ema);
      }
    }
    return result;
  }

  calculateRSI(prices: number[], period: number = 14): (number | null)[] {
    const result: (number | null)[] = [];
    if (prices.length <= period) {
      return prices.map(() => null);
    }

    let gains: number[] = [];
    let losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      gains.push(Math.max(0, diff));
      losses.push(Math.max(0, -diff));
    }

    result.push(null); // first price has no change

    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = 1; i < period; i++) {
      result.push(null);
    }

    const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const firstRSI = 100 - (100 / (1 + firstRS));
    result.push(firstRSI);

    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }

    return result;
  }

  calculateBollingerBands(prices: number[], period: number = 20, multiplier: number = 2): {
    upper: (number | null)[];
    middle: (number | null)[];
    lower: (number | null)[];
  } {
    const sma = this.calculateSMA(prices, period);
    const upper: (number | null)[] = [];
    const middle = sma;
    const lower: (number | null)[] = [];

    for (let i = 0; i < prices.length; i++) {
      const m = sma[i];
      if (m === null) {
        upper.push(null);
        lower.push(null);
      } else {
        const slice = prices.slice(i - period + 1, i + 1);
        const variance = slice.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / period;
        const std = Math.sqrt(variance);
        upper.push(m + multiplier * std);
        lower.push(m - multiplier * std);
      }
    }

    return { upper, middle, lower };
  }

  calculateMACD(prices: number[], fast: number = 12, slow: number = 26, signalPeriod: number = 9): {
    macd: (number | null)[];
    signal: (number | null)[];
    hist: (number | null)[];
  } {
    const fastEma = this.calculateEMA(prices, fast);
    const slowEma = this.calculateEMA(prices, slow);
    const macdLine: (number | null)[] = [];

    for (let i = 0; i < prices.length; i++) {
      if (fastEma[i] === null || slowEma[i] === null) {
        macdLine.push(null);
      } else {
        macdLine.push((fastEma[i] as number) - (slowEma[i] as number));
      }
    }

    // Filter non-nulls for signal line calculation
    const validMacd = macdLine.filter(m => m !== null) as number[];
    const validSignal = this.calculateEMA(validMacd, signalPeriod);

    const signalLine: (number | null)[] = [];
    const hist: (number | null)[] = [];
    let validIdx = 0;

    for (let i = 0; i < prices.length; i++) {
      if (macdLine[i] === null) {
        signalLine.push(null);
        hist.push(null);
      } else {
        const sig = validSignal[validIdx];
        signalLine.push(sig);
        if (sig === null || macdLine[i] === null) {
          hist.push(null);
        } else {
          hist.push((macdLine[i] as number) - sig);
        }
        validIdx++;
      }
    }

    return { macd: macdLine, signal: signalLine, hist };
  }

  // ==========================================
  // 3. BACKTEST SIMULATION ENGINE
  // ==========================================
  runBacktest(
    strategy: TradingStrategyConfig,
    candles: HistoricalCandle[],
    settings: BacktestSettings,
    symbol: string,
    stockAiScore: number = 8.5
  ): BacktestResult {
    const initialCapital = settings.initialCapital || 100000;
    let cash = initialCapital;
    let shares = 0;
    let entryPrice = 0;
    let entryDate = '';
    let entryBarIndex = 0;
    let tradeCount = 0;

    const trades: TradeRecord[] = [];
    const equityCurve: EquityPoint[] = [];

    const closes = candles.map(c => c.close);
    const dates = candles.map(c => c.date);
    const benchmarkFirstPrice = closes[0] || 1;

    // Precalculate indicators based on strategy type
    const fastSma = this.calculateSMA(closes, strategy.params['fastPeriod'] || 20);
    const slowSma = this.calculateSMA(closes, strategy.params['slowPeriod'] || 50);
    const rsi = this.calculateRSI(closes, strategy.params['rsiPeriod'] || 14);
    const bb = this.calculateBollingerBands(closes, strategy.params['period'] || 20, strategy.params['stdDev'] || 2.0);
    const macdData = this.calculateMACD(closes, 12, 26, 9);

    let peakEquity = initialCapital;

    // Simulation loop (chronological, strictly bar-by-bar)
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const price = c.close;
      const date = c.date;

      let buySignal = false;
      let sellSignal = false;
      let exitReason = '';

      // Check Strategy Signal at bar i
      switch (strategy.type) {
        case 'DANELFIN_AI_MOMENTUM': {
          const currentRsi = rsi[i];
          const minScore = strategy.params['minAiScore'] || 8;
          const rsiMax = strategy.params['rsiMaxEntry'] || 68;
          const rsiExit = strategy.params['rsiExit'] || 78;

          if (stockAiScore >= minScore && currentRsi !== null && currentRsi <= rsiMax && currentRsi >= 40) {
            buySignal = true;
          }
          if (currentRsi !== null && currentRsi >= rsiExit) {
            sellSignal = true;
            exitReason = `Overbought RSI (${currentRsi.toFixed(1)})`;
          }
          break;
        }

        case 'SMA_GOLDEN_CROSS': {
          const fPrev = fastSma[i - 1];
          const fCurr = fastSma[i];
          const sPrev = slowSma[i - 1];
          const sCurr = slowSma[i];

          if (fPrev !== null && fCurr !== null && sPrev !== null && sCurr !== null) {
            if (fPrev <= sPrev && fCurr > sCurr) {
              buySignal = true;
            } else if (fPrev >= sPrev && fCurr < sCurr) {
              sellSignal = true;
              exitReason = 'SMA Bearish Crossover';
            }
          }
          break;
        }

        case 'RSI_MEAN_REVERSION': {
          const currentRsi = rsi[i];
          const oversold = strategy.params['oversoldThreshold'] || 32;
          const overbought = strategy.params['overboughtThreshold'] || 68;

          if (currentRsi !== null && currentRsi <= oversold) {
            buySignal = true;
          }
          if (currentRsi !== null && currentRsi >= overbought) {
            sellSignal = true;
            exitReason = `Mean Reversion Target (RSI ${currentRsi.toFixed(1)})`;
          }
          break;
        }

        case 'BOLLINGER_BREAKOUT': {
          const up = bb.upper[i];
          const mid = bb.middle[i];
          if (up !== null && price > up) {
            buySignal = true;
          }
          if (mid !== null && price < mid) {
            sellSignal = true;
            exitReason = 'Bollinger Middle Band Mean Reversion';
          }
          break;
        }

        case 'MACD_TREND': {
          const hPrev = macdData.hist[i - 1];
          const hCurr = macdData.hist[i];
          if (hPrev !== null && hCurr !== null) {
            if (hPrev <= 0 && hCurr > 0) {
              buySignal = true;
            } else if (hPrev >= 0 && hCurr < 0) {
              sellSignal = true;
              exitReason = 'MACD Histogram Bearish Flip';
            }
          }
          break;
        }

        default: {
          // Fallback / Custom AI Prompt
          const currentRsi = rsi[i];
          if (currentRsi !== null && currentRsi < 42) buySignal = true;
          if (currentRsi !== null && currentRsi > 70) {
            sellSignal = true;
            exitReason = 'AI Target Reached';
          }
        }
      }

      // Check Stop Loss & Take Profit for existing positions
      if (shares > 0) {
        const returnPct = ((price - entryPrice) / entryPrice) * 100;
        if (strategy.stopLossPercent > 0 && returnPct <= -strategy.stopLossPercent) {
          sellSignal = true;
          exitReason = `Stop Loss Hit (-${strategy.stopLossPercent}%)`;
        } else if (strategy.takeProfitPercent > 0 && returnPct >= strategy.takeProfitPercent) {
          sellSignal = true;
          exitReason = `Take Profit Target Hit (+${strategy.takeProfitPercent}%)`;
        }
      }

      // Execution Simulation (with realistic slippage and commissions)
      const slippageRate = (settings.slippageBps || 5) / 10000;
      const commission = settings.commissionPerTrade || 1.0;

      if (sellSignal && shares > 0) {
        const execPrice = price * (1 - slippageRate); // selling with negative slippage
        const grossProceeds = shares * execPrice;
        const netProceeds = grossProceeds - commission;
        const tradePnl = netProceeds - (shares * entryPrice);
        const returnPct = ((execPrice - entryPrice) / entryPrice) * 100;

        tradeCount++;
        trades.push({
          id: `TR-${tradeCount}`,
          symbol,
          side: 'SELL',
          entryDate,
          entryPrice,
          exitDate: date,
          exitPrice: execPrice,
          shares,
          pnl: Math.round(tradePnl * 100) / 100,
          returnPercent: Math.round(returnPct * 100) / 100,
          holdingDays: i - entryBarIndex,
          reason: exitReason || 'Signal Exit',
          slippageCost: Math.round((price * slippageRate * shares) * 100) / 100,
          commissionCost: commission
        });

        cash += netProceeds;
        shares = 0;
        entryPrice = 0;
      } else if (buySignal && shares === 0 && cash > 1000) {
        const execPrice = price * (1 + slippageRate); // buying with positive slippage
        const allocatePercent = (settings.positionSizePercent || 25) / 100;
        const capitalToDeploy = Math.min(cash * allocatePercent, cash - commission);
        const allocShares = Math.floor(capitalToDeploy / execPrice);

        if (allocShares > 0) {
          shares = allocShares;
          entryPrice = execPrice;
          entryDate = date;
          entryBarIndex = i;
          cash -= (shares * execPrice + commission);
        }
      }

      // Portfolio Valuation for Bar i
      const currentEquity = cash + (shares * price);
      peakEquity = Math.max(peakEquity, currentEquity);
      const currentDrawdownPct = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
      const benchmarkEq = initialCapital * (price / benchmarkFirstPrice);

      equityCurve.push({
        date,
        strategyEquity: Math.round(currentEquity),
        benchmarkEquity: Math.round(benchmarkEq),
        drawdownPercent: Math.round(currentDrawdownPct * 100) / 100,
        cash: Math.round(cash),
        shares,
        inPosition: shares > 0
      });
    }

    // Force liquidate at the final candle for accounting completeness if still holding
    if (shares > 0 && candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const execPrice = lastCandle.close;
      const netProceeds = (shares * execPrice) - (settings.commissionPerTrade || 1.0);
      const tradePnl = netProceeds - (shares * entryPrice);
      const returnPct = ((execPrice - entryPrice) / entryPrice) * 100;

      tradeCount++;
      trades.push({
        id: `TR-${tradeCount}`,
        symbol,
        side: 'SELL',
        entryDate,
        entryPrice,
        exitDate: lastCandle.date,
        exitPrice: execPrice,
        shares,
        pnl: Math.round(tradePnl * 100) / 100,
        returnPercent: Math.round(returnPct * 100) / 100,
        holdingDays: candles.length - 1 - entryBarIndex,
        reason: 'Backtest Window Close',
        slippageCost: 0,
        commissionCost: settings.commissionPerTrade || 1.0
      });

      cash += netProceeds;
      shares = 0;
    }

    // Compute Quantitative Metrics (Sharpe, Sortino, Drawdown, Calmar, Profit Factor)
    const metrics = this.computeMetrics(equityCurve, trades, initialCapital, closes);

    return {
      strategyConfig: strategy,
      settings,
      metrics,
      equityCurve,
      trades,
      candles,
      symbol,
      executedAt: new Date().toISOString()
    };
  }

  // ==========================================
  // 4. METRICS & RISK TEAR-SHEET ENGINE
  // ==========================================
  private computeMetrics(
    equityCurve: EquityPoint[],
    trades: TradeRecord[],
    initialCapital: number,
    closes: number[]
  ): PerformanceMetrics {
    if (equityCurve.length === 0) {
      return {
        totalReturnPercent: 0,
        benchmarkReturnPercent: 0,
        alphaPercent: 0,
        cagrPercent: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        profitFactor: 0,
        winRatePercent: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        maxDrawdownPercent: 0,
        maxDrawdownDurationDays: 0,
        calmarRatio: 0,
        averageTradeReturnPercent: 0,
        expectancy: 0,
        avgWinLossRatio: 0
      };
    }

    const finalEquity = equityCurve[equityCurve.length - 1].strategyEquity;
    const finalBenchmark = equityCurve[equityCurve.length - 1].benchmarkEquity;

    const totalReturnPercent = ((finalEquity - initialCapital) / initialCapital) * 100;
    const benchmarkReturnPercent = ((finalBenchmark - initialCapital) / initialCapital) * 100;
    const alphaPercent = totalReturnPercent - benchmarkReturnPercent;

    // Daily returns series
    const dailyReturns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1].strategyEquity;
      const curr = equityCurve[i].strategyEquity;
      dailyReturns.push((curr - prev) / prev);
    }

    // Sharpe & Sortino calculation (annualized with 252 trading days)
    const avgDailyReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
    const variance = dailyReturns.length > 1
      ? dailyReturns.reduce((acc, val) => acc + Math.pow(val - avgDailyReturn, 2), 0) / (dailyReturns.length - 1)
      : 0;
    const stdDev = Math.sqrt(variance);

    const downsideReturns = dailyReturns.filter(r => r < 0);
    const downsideVariance = downsideReturns.length > 0
      ? downsideReturns.reduce((acc, val) => acc + Math.pow(val, 2), 0) / downsideReturns.length
      : 0.0001;
    const downsideStdDev = Math.sqrt(downsideVariance);

    const riskFreeRateAnnual = 0.045; // 4.5% risk free rate
    const riskFreeDaily = riskFreeRateAnnual / 252;

    const sharpeRatio = stdDev > 0 ? ((avgDailyReturn - riskFreeDaily) / stdDev) * Math.sqrt(252) : 0;
    const sortinoRatio = downsideStdDev > 0 ? ((avgDailyReturn - riskFreeDaily) / downsideStdDev) * Math.sqrt(252) : 0;

    // Drawdowns
    let maxDrawdown = 0;
    let maxDrawdownDuration = 0;
    let currentDdDuration = 0;

    for (const pt of equityCurve) {
      if (pt.drawdownPercent > maxDrawdown) {
        maxDrawdown = pt.drawdownPercent;
      }
      if (pt.drawdownPercent > 0.05) {
        currentDdDuration++;
        maxDrawdownDuration = Math.max(maxDrawdownDuration, currentDdDuration);
      } else {
        currentDdDuration = 0;
      }
    }

    // Trades analysis
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

    const totalWinsDollar = winningTrades.reduce((acc, t) => acc + t.pnl, 0);
    const totalLossesDollar = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0));
    const profitFactor = totalLossesDollar > 0 ? totalWinsDollar / totalLossesDollar : (totalWinsDollar > 0 ? 99 : 1);

    const avgWin = winningTrades.length > 0 ? totalWinsDollar / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLossesDollar / losingTrades.length : 1;
    const avgWinLossRatio = avgLoss > 0 ? avgWin / avgLoss : 1;

    const avgTradeReturn = trades.length > 0 ? trades.reduce((a, t) => a + t.returnPercent, 0) / trades.length : 0;
    const expectancy = trades.length > 0 ? trades.reduce((a, t) => a + t.pnl, 0) / trades.length : 0;

    // CAGR (annualized return)
    const tradingDays = equityCurve.length;
    const years = Math.max(0.2, tradingDays / 252);
    const cagr = (Math.pow(Math.max(0.01, finalEquity / initialCapital), 1 / years) - 1) * 100;

    const calmar = maxDrawdown > 0 ? cagr / maxDrawdown : cagr;

    return {
      totalReturnPercent: Math.round(totalReturnPercent * 100) / 100,
      benchmarkReturnPercent: Math.round(benchmarkReturnPercent * 100) / 100,
      alphaPercent: Math.round(alphaPercent * 100) / 100,
      cagrPercent: Math.round(cagr * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      sortinoRatio: Math.round(sortinoRatio * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      winRatePercent: Math.round(winRate * 10) / 10,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      maxDrawdownPercent: Math.round(maxDrawdown * 100) / 100,
      maxDrawdownDurationDays: maxDrawdownDuration,
      calmarRatio: Math.round(calmar * 100) / 100,
      averageTradeReturnPercent: Math.round(avgTradeReturn * 100) / 100,
      expectancy: Math.round(expectancy),
      avgWinLossRatio: Math.round(avgWinLossRatio * 100) / 100
    };
  }

  // ==========================================
  // 5. WALK-FORWARD & OUT-OF-SAMPLE (OOS) ENGINE
  // ==========================================
  runWalkForwardAnalysis(
    strategy: TradingStrategyConfig,
    candles: HistoricalCandle[],
    settings: BacktestSettings,
    symbol: string,
    trainSplitPercent: number = 70,
    aiScore: number = 8.5
  ): WalkForwardResult {
    const splitIndex = Math.floor(candles.length * (trainSplitPercent / 100));
    const inSampleCandles = candles.slice(0, splitIndex);
    const outOfSampleCandles = candles.slice(splitIndex);

    // 1. Run In-Sample Backtest (Training window)
    const inSampleResult = this.runBacktest(strategy, inSampleCandles, settings, symbol, aiScore);

    // 2. Run Out-of-Sample Backtest (Strict blind forward validation)
    const outOfSampleResult = this.runBacktest(strategy, outOfSampleCandles, settings, symbol, aiScore);

    const isSharpe = Math.max(0.1, inSampleResult.metrics.sharpeRatio);
    const oosSharpe = outOfSampleResult.metrics.sharpeRatio;
    const sharpeDegradation = Math.round((oosSharpe / isSharpe) * 100) / 100;

    const isReturn = Math.max(0.1, inSampleResult.metrics.totalReturnPercent);
    const oosReturn = outOfSampleResult.metrics.totalReturnPercent;
    const returnDegradation = Math.round((oosReturn / isReturn) * 100) / 100;

    // Overfitting Risk Classification
    let riskLevel: OverfittingRiskLevel = 'LOW';
    let diagnosis = '';
    const recommendations: string[] = [];

    if (sharpeDegradation >= 0.75 && oosSharpe > 1.2) {
      riskLevel = 'LOW';
      diagnosis = 'Robust Structural Edge. Strategy preserves over 75% of its Sharpe ratio out-of-sample with no sign of curve-fitting.';
      recommendations.push('Strategy passes Walk-Forward validation with flying colors.');
      recommendations.push('Approved to advance to Stage 4 (Paper Trading forward-testing).');
    } else if (sharpeDegradation >= 0.45 && oosSharpe > 0.6) {
      riskLevel = 'MODERATE';
      diagnosis = 'Mild Degradation. Out-of-sample performance experienced partial decay, likely due to market regime shifts or slight parameter sensitivity.';
      recommendations.push('Reduce degrees of freedom (tune fewer hyperparameters).');
      recommendations.push('Consider widening stop-loss or testing cross-asset robustness before live capital.');
    } else {
      riskLevel = 'HIGH';
      diagnosis = 'Severe Overfitting / Curve-Fitting Detected! Performance collapsed on unseen data. The in-sample results were an artifact of historical noise.';
      recommendations.push('DO NOT trade live! Strategy will likely lose real capital.');
      recommendations.push('Re-evaluate economic hypothesis from scratch; avoid brute-force optimization.');
    }

    // Parameter Sensitivity Sweep (like vectorbt)
    const sensitivities = this.runParameterSensitivity(strategy, outOfSampleCandles, settings, symbol, aiScore);

    return {
      inSampleResult,
      outOfSampleResult,
      trainSplitPercent,
      inSampleBars: inSampleCandles.length,
      outOfSampleBars: outOfSampleCandles.length,
      sharpeDegradationRatio: sharpeDegradation,
      returnDegradationRatio: returnDegradation,
      overfittingRisk: riskLevel,
      overfittingDiagnosis: diagnosis,
      recommendations,
      parameterSensitivities: sensitivities
    };
  }

  private runParameterSensitivity(
    strategy: TradingStrategyConfig,
    oosCandles: HistoricalCandle[],
    settings: BacktestSettings,
    symbol: string,
    aiScore: number
  ) {
    const sensitivities: {
      paramKey: string;
      variations: { value: number; oosSharpe: number; oosReturn: number }[];
    }[] = [];

    // Test primary numeric parameter with variations -20%, -10%, base, +10%, +20%
    const keys = Object.keys(strategy.params);
    const numericKey = keys.find(k => typeof strategy.params[k] === 'number');

    if (numericKey) {
      const baseVal = strategy.params[numericKey] as number;
      const multipliers = [0.8, 0.9, 1.0, 1.1, 1.2];
      const variations: { value: number; oosSharpe: number; oosReturn: number }[] = [];

      for (const m of multipliers) {
        const testVal = Math.round(baseVal * m);
        const clonedStrategy: TradingStrategyConfig = {
          ...strategy,
          params: { ...strategy.params, [numericKey]: testVal }
        };
        const testRes = this.runBacktest(clonedStrategy, oosCandles, settings, symbol, aiScore);
        variations.push({
          value: testVal,
          oosSharpe: testRes.metrics.sharpeRatio,
          oosReturn: testRes.metrics.totalReturnPercent
        });
      }

      sensitivities.push({
        paramKey: numericKey,
        variations
      });
    }

    return sensitivities;
  }

  // ==========================================
  // 6. PAPER TRADING SIMULATOR (STAGE 4)
  // ==========================================
  startPaperBot(stock: Stock, strategy: TradingStrategyConfig) {
    if (this.paperAccount().isBotRunning) return;

    this.paperAccount.update(acc => ({ ...acc, isBotRunning: true }));

    // Real-time tick simulator
    this.botTimer = setInterval(() => {
      this.simulatePaperTick(stock, strategy);
    }, this.paperAccount().botSpeedMs);
  }

  stopPaperBot() {
    if (this.botTimer) {
      clearInterval(this.botTimer);
      this.botTimer = null;
    }
    this.paperAccount.update(acc => ({ ...acc, isBotRunning: false }));
  }

  resetPaperAccount(initialCash: number = 100000) {
    this.stopPaperBot();
    this.paperAccount.set({
      cash: initialCash,
      initialCash,
      portfolioValue: initialCash,
      realizedPnl: 0,
      unrealizedPnl: 0,
      totalReturnPercent: 0,
      positions: [],
      orderHistory: [],
      isBotRunning: false,
      botSpeedMs: 1200,
      currentSimulatedBarIndex: 0
    });
  }

  simulatePaperTick(stock: Stock, strategy: TradingStrategyConfig) {
    const acc = this.paperAccount();
    // Simulate real-time micro-fluctuation around stock price
    const noise = (Math.random() - 0.49) * (stock.price * 0.004);
    const tickPrice = Math.round((stock.price + noise) * 100) / 100;

    // Update positions marked-to-market
    let unrealized = 0;
    const updatedPositions = acc.positions.map(pos => {
      const pnl = (tickPrice - pos.avgEntryPrice) * pos.shares;
      const returnPct = ((tickPrice - pos.avgEntryPrice) / pos.avgEntryPrice) * 100;
      unrealized += pnl;
      return {
        ...pos,
        currentPrice: tickPrice,
        unrealizedPnl: Math.round(pnl * 100) / 100,
        unrealizedReturnPercent: Math.round(returnPct * 100) / 100,
        marketValue: Math.round((pos.shares * tickPrice) * 100) / 100
      };
    });

    const totalVal = acc.cash + updatedPositions.reduce((acc, p) => acc + p.marketValue, 0);
    const totalReturnPct = ((totalVal - acc.initialCash) / acc.initialCash) * 100;

    // Check circuit breakers
    if (totalReturnPct <= -this.liveRisk().maxStrategyDrawdownPercent) {
      this.triggerCircuitBreaker(`Max Drawdown breach (-${Math.abs(totalReturnPct).toFixed(1)}% vs threshold -${this.liveRisk().maxStrategyDrawdownPercent}%)`);
      this.stopPaperBot();
      return;
    }

    // Automated signal execution check
    const existingPos = updatedPositions.find(p => p.symbol === stock.symbol);
    if (!existingPos && Math.random() < 0.15) {
      // Generated paper entry order
      this.executePaperOrder(stock.symbol, 'BUY', 50, tickPrice, 'Automated Bot Entry');
    } else if (existingPos && Math.random() < 0.12) {
      // Exit order
      this.executePaperOrder(stock.symbol, 'SELL', existingPos.shares, tickPrice, 'Automated Bot Target Exit');
    } else {
      this.paperAccount.update(a => ({
        ...a,
        portfolioValue: Math.round(totalVal * 100) / 100,
        unrealizedPnl: Math.round(unrealized * 100) / 100,
        totalReturnPercent: Math.round(totalReturnPct * 100) / 100,
        positions: updatedPositions
      }));
    }
  }

  executePaperOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    shares: number,
    targetPrice: number,
    reason: string = 'Manual'
  ) {
    const slippageBps = 4; // 0.04% spread crossing slippage
    const execPrice = side === 'BUY'
      ? Math.round(targetPrice * (1 + slippageBps / 10000) * 100) / 100
      : Math.round(targetPrice * (1 - slippageBps / 10000) * 100) / 100;

    const commission = 1.0;
    const notional = shares * execPrice;

    this.paperAccount.update(acc => {
      let cash = acc.cash;
      let realizedPnl = acc.realizedPnl;
      const positions = [...acc.positions];
      const existingIdx = positions.findIndex(p => p.symbol === symbol);

      if (side === 'BUY') {
        if (cash < notional + commission) {
          // Insufficient funds
          return acc;
        }
        cash -= (notional + commission);

        if (existingIdx >= 0) {
          const current = positions[existingIdx];
          const totalShares = current.shares + shares;
          const totalCost = (current.shares * current.avgEntryPrice) + notional;
          positions[existingIdx] = {
            ...current,
            shares: totalShares,
            avgEntryPrice: Math.round((totalCost / totalShares) * 100) / 100,
            costBasis: Math.round(totalCost * 100) / 100,
            marketValue: Math.round((totalShares * execPrice) * 100) / 100
          };
        } else {
          positions.push({
            symbol,
            shares,
            avgEntryPrice: execPrice,
            currentPrice: execPrice,
            unrealizedPnl: 0,
            unrealizedReturnPercent: 0,
            costBasis: Math.round(notional * 100) / 100,
            marketValue: Math.round(notional * 100) / 100
          });
        }
      } else {
        // SELL
        if (existingIdx >= 0) {
          const current = positions[existingIdx];
          const sharesToSell = Math.min(shares, current.shares);
          const pnl = (execPrice - current.avgEntryPrice) * sharesToSell - commission;
          realizedPnl += pnl;
          cash += (sharesToSell * execPrice - commission);

          if (current.shares === sharesToSell) {
            positions.splice(existingIdx, 1);
          } else {
            const remaining = current.shares - sharesToSell;
            positions[existingIdx] = {
              ...current,
              shares: remaining,
              costBasis: Math.round((remaining * current.avgEntryPrice) * 100) / 100,
              marketValue: Math.round((remaining * execPrice) * 100) / 100
            };
          }
        }
      }

      const totalVal = cash + positions.reduce((acc, p) => acc + p.marketValue, 0);
      const totalReturnPct = ((totalVal - acc.initialCash) / acc.initialCash) * 100;

      const newOrder: PaperOrder = {
        id: `ORD-${Date.now().toString().slice(-6)}`,
        symbol,
        side,
        type: 'MARKET',
        price: targetPrice,
        shares,
        status: 'FILLED',
        timestamp: new Date().toLocaleTimeString(),
        executionPrice: execPrice,
        slippagePaid: Math.round(Math.abs(execPrice - targetPrice) * shares * 100) / 100
      };

      return {
        ...acc,
        cash: Math.round(cash * 100) / 100,
        realizedPnl: Math.round(realizedPnl * 100) / 100,
        portfolioValue: Math.round(totalVal * 100) / 100,
        totalReturnPercent: Math.round(totalReturnPct * 100) / 100,
        positions,
        orderHistory: [newOrder, ...acc.orderHistory.slice(0, 49)]
      };
    });
  }

  // ==========================================
  // 7. LIVE RISK & CAPITAL CONSOLE (STAGE 5)
  // ==========================================
  calculateKellyCriterion(winRatePct: number, profitFactor: number): { fullKelly: number; halfKelly: number; quarterKelly: number } {
    const p = winRatePct / 100;
    const q = 1 - p;
    const b = Math.max(0.2, profitFactor);

    // Kelly formula: f = (p * b - q) / b = p - (q / b)
    const rawKelly = p - (q / b);
    const boundedKelly = Math.max(0, Math.min(0.40, rawKelly));

    return {
      fullKelly: Math.round(boundedKelly * 100) / 100,
      halfKelly: Math.round((boundedKelly / 2) * 100) / 100,
      quarterKelly: Math.round((boundedKelly / 4) * 100) / 100
    };
  }

  triggerCircuitBreaker(reason: string) {
    this.liveRisk.update(risk => ({
      ...risk,
      circuitBreakerTripped: true,
      circuitBreakerReason: reason
    }));
  }

  resetCircuitBreaker() {
    this.liveRisk.update(risk => ({
      ...risk,
      circuitBreakerTripped: false,
      circuitBreakerReason: undefined
    }));
  }

  // ==========================================
  // 8. PYTHON CODE GENERATION (EDUCATIONAL BRIDGE)
  // ==========================================
  generatePythonScript(strategy: TradingStrategyConfig, symbol: string): string {
    return `"""
AURA AI QUANT ENGINE • PYTHON STRATEGY EXPORT
Stack:
  - Data: yfinance
  - Indicators: pandas-ta
  - Backtest Engine: backtesting.py
  - Portfolio Analytics: quantstats
"""

import yfinance as yf
import pandas as pd
import pandas_ta as ta
from backtesting import Backtest, Strategy
from backtesting.lib import crossover
import quantstats as qs

# 1. Fetch Market Data via yfinance
print(f"Downloading historical OHLCV data for {symbol}...")
df = yf.download('${symbol}', period='1y', interval='1d')
df.columns = [col[0] if isinstance(col, tuple) else col for col in df.columns]

# Ensure column names match backtesting.py conventions
df = df.rename(columns={
    'Open': 'Open',
    'High': 'High',
    'Low': 'Low',
    'Close': 'Close',
    'Volume': 'Volume'
})

# 2. Strategy Definition via backtesting.py
class ${strategy.type.replace(/_/g, '')}Strategy(Strategy):
    # Strategy Hyperparameters
    fast_period = ${strategy.params['fastPeriod'] || 20}
    slow_period = ${strategy.params['slowPeriod'] || 50}
    stop_loss_pct = ${strategy.stopLossPercent / 100}
    take_profit_pct = ${strategy.takeProfitPercent / 100}

    def init(self):
        # Calculate technical indicators using pandas-ta
        close = pd.Series(self.data.Close)
        self.fast_sma = self.I(ta.sma, close, length=self.fast_period)
        self.slow_sma = self.I(ta.sma, close, length=self.slow_period)
        self.rsi = self.I(ta.rsi, close, length=14)

    def next(self):
        price = self.data.Close[-1]

        # Entry Rule
        if not self.position:
            if crossover(self.fast_sma, self.slow_sma) or (self.rsi[-1] < 45):
                sl = price * (1 - self.stop_loss_pct)
                tp = price * (1 + self.take_profit_pct)
                self.buy(sl=sl, tp=tp)

        # Exit Rule
        elif crossover(self.slow_sma, self.fast_sma) or (self.rsi[-1] > 75):
            self.position.close()

# 3. Execute Historical Backtest
bt = Backtest(
    df,
    ${strategy.type.replace(/_/g, '')}Strategy,
    cash=100000,
    commission=0.001,  # 0.1% fee
    exclusive_orders=True
)

stats = bt.run()
print("\\n=== BACKTESTING.PY PERFORMANCE RESULTS ===")
print(stats)

# Interactive Chart Output (Opens in browser)
bt.plot(filename='strategy_backtest.html')

# 4. Generate Institutional QuantStats Tear Sheet
# returns = pd.Series(stats['_equity_curve']['Equity']).pct_change().dropna()
# qs.reports.html(returns, benchmark='SPY', output='quantstats_tearsheet.html')
`;
  }

  // ==========================================
  // 9. GEORGIA TECH CS 7646 (ML4T) PROJECTS
  // ==========================================

  /**
   * Project 6: Theoretically Optimal Strategy (TOS)
   * Perfect foresight upper-bound benchmark.
   */
  runTheoreticallyOptimalStrategy(
    candles: HistoricalCandle[],
    symbol: string,
    initialCash: number = 100000,
    commission: number = 9.95,
    impact: number = 0.005
  ): TOSResult {
    if (!candles || candles.length < 2) {
      return {
        symbol,
        initialCash,
        finalEquity: initialCash,
        cumulativeReturnPercent: 0,
        sharpeRatio: 0,
        totalTrades: 0,
        longDays: 0,
        shortDays: 0,
        cashDays: 0,
        equityCurve: []
      };
    }

    let cash = initialCash;
    let currentPosition = 0; // -1000, 0, or +1000
    let totalTrades = 0;
    let longDays = 0;
    let shortDays = 0;
    let cashDays = 0;
    const equityCurve: { date: string; tosEquity: number; benchmarkEquity: number }[] = [];
    const dailyReturns: number[] = [];

    const firstPrice = candles[0].close;

    for (let t = 0; t < candles.length; t++) {
      const todayClose = candles[t].close;
      const todayDate = candles[t].date;

      let targetPosition = 0;
      if (t < candles.length - 1) {
        const tomorrowClose = candles[t + 1].close;
        if (tomorrowClose > todayClose) {
          targetPosition = 1000;
        } else if (tomorrowClose < todayClose) {
          targetPosition = -1000;
        }
      } else {
        targetPosition = 0; // liquidate on last day
      }

      // Execute trade if needed to achieve targetPosition
      const tradeShares = targetPosition - currentPosition;
      if (tradeShares !== 0) {
        totalTrades++;
        const execPrice = tradeShares > 0
          ? todayClose * (1 + impact)
          : todayClose * (1 - impact);
        const cost = tradeShares * execPrice + commission;
        cash -= cost;
        currentPosition = targetPosition;
      }

      if (currentPosition > 0) longDays++;
      else if (currentPosition < 0) shortDays++;
      else cashDays++;

      const portfolioVal = cash + currentPosition * todayClose;
      const benchmarkVal = initialCash * (todayClose / firstPrice);

      equityCurve.push({
        date: todayDate,
        tosEquity: Math.round(portfolioVal),
        benchmarkEquity: Math.round(benchmarkVal)
      });

      if (equityCurve.length > 1) {
        const prev = equityCurve[equityCurve.length - 2].tosEquity;
        dailyReturns.push((portfolioVal - prev) / prev);
      }
    }

    const finalEquity = equityCurve[equityCurve.length - 1].tosEquity;
    const cumulativeReturnPercent = ((finalEquity - initialCash) / initialCash) * 100;

    // Sharpe ratio
    const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
    const variance = dailyReturns.length > 1
      ? dailyReturns.reduce((acc, val) => acc + Math.pow(val - avgReturn, 2), 0) / (dailyReturns.length - 1)
      : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      symbol,
      initialCash,
      finalEquity: Math.round(finalEquity),
      cumulativeReturnPercent: Math.round(cumulativeReturnPercent * 10) / 10,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      totalTrades,
      longDays,
      shortDays,
      cashDays,
      equityCurve
    };
  }

  /**
   * Project 2: Optimize Something (Portfolio Optimization / Markowitz Sharpe Maximizer)
   */
  optimizePortfolio(stocks: Stock[]): PortfolioOptimizationResult {
    const validStocks = stocks.filter(s => s.candles && s.candles.length >= 60).slice(0, 5);
    if (validStocks.length === 0) {
      return {
        tickers: [],
        optimalWeights: [],
        expectedReturnPercent: 0,
        volatilityPercent: 0,
        optimizedSharpeRatio: 0,
        benchmarkSharpeRatio: 0
      };
    }

    const tickers = validStocks.map(s => s.symbol);
    const minBars = Math.min(...validStocks.map(s => s.candles.length));

    // Daily returns matrix
    const returnsMatrix: number[][] = validStocks.map(s => {
      const c = s.candles.slice(-minBars);
      const rets: number[] = [];
      for (let i = 1; i < c.length; i++) {
        rets.push((c[i].close - c[i - 1].close) / c[i - 1].close);
      }
      return rets;
    });

    const N = validStocks.length;
    const meanReturns: number[] = returnsMatrix.map(r => r.reduce((a, b) => a + b, 0) / r.length);

    // Covariance matrix
    const covMatrix: number[][] = [];
    for (let i = 0; i < N; i++) {
      covMatrix[i] = [];
      for (let j = 0; j < N; j++) {
        let cov = 0;
        const T = returnsMatrix[0].length;
        for (let k = 0; k < T; k++) {
          cov += (returnsMatrix[i][k] - meanReturns[i]) * (returnsMatrix[j][k] - meanReturns[j]);
        }
        covMatrix[i][j] = cov / (T - 1);
      }
    }

    // Benchmark: Equal Weights
    const eqWeight = 1 / N;
    let eqMean = 0;
    for (let i = 0; i < N; i++) eqMean += eqWeight * meanReturns[i];
    let eqVar = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        eqVar += eqWeight * eqWeight * covMatrix[i][j];
      }
    }
    const eqStd = Math.sqrt(Math.max(1e-8, eqVar));
    const benchmarkSharpe = (eqMean / eqStd) * Math.sqrt(252);

    // Monte Carlo + Simplex Optimizer
    let bestSharpe = -999;
    let bestWeights: number[] = Array(N).fill(1 / N);

    const iterations = 6000;
    for (let it = 0; it < iterations; it++) {
      const raw = Array(N).fill(0).map(() => -Math.log(Math.max(1e-6, Math.random())));
      const sum = raw.reduce((a, b) => a + b, 0);
      const w = raw.map(v => v / sum);

      let portMean = 0;
      for (let i = 0; i < N; i++) portMean += w[i] * meanReturns[i];

      let portVar = 0;
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          portVar += w[i] * w[j] * covMatrix[i][j];
        }
      }
      const portStd = Math.sqrt(Math.max(1e-8, portVar));
      const testSharpe = (portMean / portStd) * Math.sqrt(252);

      if (testSharpe > bestSharpe) {
        bestSharpe = testSharpe;
        bestWeights = w;
      }
    }

    let optMean = 0;
    for (let i = 0; i < N; i++) optMean += bestWeights[i] * meanReturns[i];
    let optVar = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        optVar += bestWeights[i] * bestWeights[j] * covMatrix[i][j];
      }
    }
    const optStd = Math.sqrt(Math.max(1e-8, optVar));

    return {
      tickers,
      optimalWeights: tickers.map((t, i) => ({ ticker: t, weight: Math.round(bestWeights[i] * 1000) / 1000 })),
      expectedReturnPercent: Math.round(optMean * 252 * 1000) / 10,
      volatilityPercent: Math.round(optStd * Math.sqrt(252) * 1000) / 10,
      optimizedSharpeRatio: Math.round(bestSharpe * 100) / 100,
      benchmarkSharpeRatio: Math.round(benchmarkSharpe * 100) / 100
    };
  }

  /**
   * Project 5: Marketsim (Georgia Tech Market Simulator)
   */
  runMarketsim(
    orders: MarketsimOrder[],
    candles: HistoricalCandle[],
    symbol: string,
    startVal: number = 100000,
    commission: number = 9.95,
    impact: number = 0.005
  ): MarketsimResult {
    let cash = startVal;
    let shares = 0;
    let commissionPaidTotal = 0;
    let impactCostTotal = 0;

    const history: { date: string; portfolioValue: number; cash: number }[] = [];
    const dailyReturns: number[] = [];

    const ordersByDate = new Map<string, MarketsimOrder[]>();
    for (const ord of orders) {
      if (!ordersByDate.has(ord.date)) ordersByDate.set(ord.date, []);
      ordersByDate.get(ord.date)!.push(ord);
    }

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const date = c.date;
      const price = c.close;

      const dayOrders = ordersByDate.get(date);
      if (dayOrders) {
        for (const ord of dayOrders) {
          if (ord.order === 'BUY') {
            const execPrice = price * (1 + impact);
            const impCost = price * impact * ord.shares;
            impactCostTotal += impCost;
            commissionPaidTotal += commission;
            cash -= (ord.shares * execPrice + commission);
            shares += ord.shares;
          } else if (ord.order === 'SELL') {
            const execPrice = price * (1 - impact);
            const impCost = price * impact * ord.shares;
            impactCostTotal += impCost;
            commissionPaidTotal += commission;
            cash += (ord.shares * execPrice - commission);
            shares -= ord.shares;
          }
        }
      }

      const portVal = cash + (shares * price);
      history.push({
        date,
        portfolioValue: Math.round(portVal),
        cash: Math.round(cash)
      });

      if (history.length > 1) {
        const prev = history[history.length - 2].portfolioValue;
        dailyReturns.push((portVal - prev) / prev);
      }
    }

    const endVal = history.length > 0 ? history[history.length - 1].portfolioValue : startVal;
    const cumulativeReturnPercent = ((endVal - startVal) / startVal) * 100;

    const avgDailyReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
    const variance = dailyReturns.length > 1
      ? dailyReturns.reduce((acc, val) => acc + Math.pow(val - avgDailyReturn, 2), 0) / (dailyReturns.length - 1)
      : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgDailyReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      startVal,
      endVal: Math.round(endVal),
      cumulativeReturnPercent: Math.round(cumulativeReturnPercent * 100) / 100,
      avgDailyReturnPercent: Math.round(avgDailyReturn * 10000) / 100,
      stdDailyReturnPercent: Math.round(stdDev * 10000) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      commissionPaidTotal: Math.round(commissionPaidTotal),
      impactCostTotal: Math.round(impactCostTotal),
      history
    };
  }

  /**
   * Project 8: Strategy Learner (Reinforcement Learning / Q-Learning)
   */
  runQLearningStrategy(
    candles: HistoricalCandle[],
    symbol: string,
    episodesCount: number = 25
  ): QLearningResult {
    const closes = candles.map(c => c.close);
    const bb = this.calculateBollingerBands(closes, 20, 2);
    const sma = this.calculateSMA(closes, 50);

    const states: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      const price = closes[i];
      const upper = bb.upper[i] || price * 1.05;
      const lower = bb.lower[i] || price * 0.95;
      const s = sma[i] || price;

      const bbPercent = (price - lower) / Math.max(0.01, upper - lower);
      const f1 = bbPercent < 0.2 ? 0 : (bbPercent > 0.8 ? 2 : 1);

      const smaRatio = price / s;
      const f2 = smaRatio < 0.98 ? 0 : (smaRatio > 1.02 ? 2 : 1);

      const mom = i >= 10 ? (price - closes[i - 10]) / closes[i - 10] : 0;
      const f3 = mom < -0.02 ? 0 : (mom > 0.02 ? 2 : 1);

      states.push(f1 * 9 + f2 * 3 + f3);
    }

    const numStates = 27;
    const numActions = 3;
    const Q: number[][] = Array(numStates).fill(0).map(() => Array(numActions).fill(0));

    const alpha = 0.2;
    const gamma = 0.9;
    let epsilon = 0.4;

    const episodes: { episode: number; cumulativeReward: number; finalPortfolioValue: number; sharpeRatio: number; tradesCount: number }[] = [];
    let bestEquityCurve: { date: string; qEquity: number; benchmarkEquity: number }[] = [];

    const firstPrice = closes[0];

    for (let ep = 1; ep <= episodesCount; ep++) {
      let cash = 100000;
      let pos = 0;
      let totalReward = 0;
      let tradeCount = 0;
      const epCurve: { date: string; qEquity: number; benchmarkEquity: number }[] = [];
      const epReturns: number[] = [];

      for (let t = 0; t < candles.length - 1; t++) {
        const s = states[t];
        const sNext = states[t + 1];
        const price = closes[t];
        const nextPrice = closes[t + 1];

        let a = 1;
        if (Math.random() < epsilon) {
          a = Math.floor(Math.random() * numActions);
        } else {
          a = Q[s][0] > Q[s][1] ? (Q[s][0] > Q[s][2] ? 0 : 2) : (Q[s][1] > Q[s][2] ? 1 : 2);
        }

        const targetPos = a === 0 ? -1000 : (a === 2 ? 1000 : 0);
        if (targetPos !== pos) {
          tradeCount++;
          cash -= (targetPos - pos) * price;
          pos = targetPos;
        }

        const todayVal = cash + pos * price;
        const tomorrowVal = cash + pos * nextPrice;
        const reward = tomorrowVal - todayVal;
        totalReward += reward;

        const maxQNext = Math.max(...Q[sNext]);
        Q[s][a] += alpha * (reward + gamma * maxQNext - Q[s][a]);

        epCurve.push({
          date: candles[t].date,
          qEquity: Math.round(todayVal),
          benchmarkEquity: Math.round(100000 * (price / firstPrice))
        });

        if (epCurve.length > 1) {
          const prev = epCurve[epCurve.length - 2].qEquity;
          epReturns.push((todayVal - prev) / prev);
        }
      }

      epsilon *= 0.95;

      const lastPrice = closes[closes.length - 1];
      const finalVal = cash + pos * lastPrice;
      epCurve.push({
        date: candles[candles.length - 1].date,
        qEquity: Math.round(finalVal),
        benchmarkEquity: Math.round(100000 * (lastPrice / firstPrice))
      });

      const avgRet = epReturns.length > 0 ? epReturns.reduce((a, b) => a + b, 0) / epReturns.length : 0;
      const varRet = epReturns.length > 1 ? epReturns.reduce((acc, v) => acc + Math.pow(v - avgRet, 2), 0) / (epReturns.length - 1) : 0;
      const epSharpe = varRet > 0 ? (avgRet / Math.sqrt(varRet)) * Math.sqrt(252) : 0;

      episodes.push({
        episode: ep,
        cumulativeReward: Math.round(totalReward),
        finalPortfolioValue: Math.round(finalVal),
        sharpeRatio: Math.round(epSharpe * 100) / 100,
        tradesCount: tradeCount
      });

      if (ep === episodesCount || ep === 1) {
        bestEquityCurve = epCurve;
      }
    }

    const lastEp = episodes[episodes.length - 1];
    const trainedReturn = ((lastEp.finalPortfolioValue - 100000) / 100000) * 100;
    const benchReturn = ((closes[closes.length - 1] - firstPrice) / firstPrice) * 100;

    return {
      symbol,
      episodes,
      trainedReturnPercent: Math.round(trainedReturn * 10) / 10,
      trainedSharpeRatio: lastEp.sharpeRatio,
      benchmarkReturnPercent: Math.round(benchReturn * 10) / 10,
      qTableSize: numStates * numActions,
      bestEquityCurve
    };
  }

  /**
   * Generates Python code matching Georgia Tech CS 7646 project specifications.
   */
  generateML4TPythonScript(project: ML4TProjectTab, symbol: string): string {
    switch (project) {
      case 'TOS':
        return `"""
GEORGIA TECH CS 7646: Machine Learning for Trading
Project 6: Theoretically Optimal Strategy (TheoreticallyOptimalStrategy.py)
Benchmark with perfect foresight (look-ahead) establishing theoretical ceiling.
"""

import datetime as dt
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def testPolicy(symbol="${symbol}", sd=dt.datetime(2023, 1, 1), ed=dt.datetime(2023, 12, 31), sv=100000):
    # Rule: If price[tomorrow] > price[today] -> hold +1000 shares
    #       If price[tomorrow] < price[today] -> hold -1000 shares
    df_prices = pd.DataFrame() # Load prices via get_data([symbol], dates)
    
    df_trades = pd.DataFrame(index=df_prices.index, columns=[symbol])
    df_trades.values[:] = 0
    
    current_pos = 0
    for i in range(len(df_prices) - 1):
        today_price = df_prices.iloc[i][symbol]
        next_price = df_prices.iloc[i + 1][symbol]
        
        target_pos = 1000 if next_price > today_price else -1000
        df_trades.iloc[i][symbol] = target_pos - current_pos
        current_pos = target_pos
        
    return df_trades
`;

      case 'PORTFOLIO_OPTIMIZATION':
        return `"""
GEORGIA TECH CS 7646: Machine Learning for Trading
Project 2: Optimize Something (optimization.py)
Finds optimal portfolio weights that maximize the Sharpe ratio using scipy.optimize.
"""

import scipy.optimize as spo
import numpy as np
import pandas as pd

def negative_sharpe(weights, prices, rfr=0.0):
    port_vals = (prices * weights).sum(axis=1)
    daily_rets = port_vals.pct_change().dropna()
    mean_ret = daily_rets.mean()
    std_ret = daily_rets.std()
    sharpe = np.sqrt(252) * (mean_ret - rfr) / std_ret
    return -sharpe

def optimize_portfolio(sd, ed, syms=['${symbol}', 'AAPL', 'MSFT', 'JPM', 'SPY']):
    prices = pd.DataFrame() # Load prices via get_data(syms)
    num_assets = len(syms)
    init_weights = [1.0 / num_assets] * num_assets
    bounds = tuple((0.0, 1.0) for _ in range(num_assets))
    constraints = ({'type': 'eq', 'fun': lambda w: np.sum(w) - 1.0})
    
    opts = spo.minimize(
        negative_sharpe,
        init_weights,
        args=(prices,),
        method='SLSQP',
        bounds=bounds,
        constraints=constraints
    )
    return opts.x  # Optimal portfolio weights
`;

      case 'MARKETSIM':
        return `"""
GEORGIA TECH CS 7646: Machine Learning for Trading
Project 5: Marketsim (marketsim.py)
Evaluates an orders.csv dataframe with commission and market impact fees.
"""

import pandas as pd
import numpy as np

def compute_portvals(orders_df, start_val=100000, commission=9.95, impact=0.005):
    # Tracks cash, holdings, and portfolio values over time
    start_date = orders_df.index.min()
    end_date = orders_df.index.max()
    # 1. Fetch prices
    # 2. Update cash and shares for every BUY/SELL order
    # 3. Sum daily holdings * prices + cash
    portvals = pd.Series()
    return portvals
`;

      case 'Q_LEARNING':
        return `"""
GEORGIA TECH CS 7646: Machine Learning for Trading
Project 8: Strategy Learner (StrategyLearner.py & QLearner.py)
Tabular Q-Learning trading agent discretizing indicators into states.
"""

import numpy as np
import random

class QLearner:
    def __init__(self, num_states=27, num_actions=3, alpha=0.2, gamma=0.9, rar=0.5, radr=0.99):
        self.num_states = num_states
        self.num_actions = num_actions
        self.alpha = alpha
        self.gamma = gamma
        self.rar = rar
        self.radr = radr
        self.q_table = np.zeros((num_states, num_actions))
        self.s = 0
        self.a = 0

    def query_set_state(self, s):
        self.s = s
        self.a = random.randint(0, self.num_actions - 1) if random.random() < self.rar else np.argmax(self.q_table[s])
        return self.a

    def query(self, s_prime, r):
        # Q(s, a) = (1 - alpha) * Q(s, a) + alpha * (r + gamma * max(Q(s', a')))
        self.q_table[self.s, self.a] = (1 - self.alpha) * self.q_table[self.s, self.a] + \\
            self.alpha * (r + self.gamma * np.max(self.q_table[s_prime]))
        self.s = s_prime
        self.a = random.randint(0, self.num_actions - 1) if random.random() < self.rar else np.argmax(self.q_table[s_prime])
        self.rar *= self.radr
        return self.a
`;
    }
  }
}
