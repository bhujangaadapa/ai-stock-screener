import { HistoricalCandle, Stock } from './stock.model';

export type StrategyType = 
  | 'DANELFIN_AI_MOMENTUM'
  | 'SMA_GOLDEN_CROSS'
  | 'RSI_MEAN_REVERSION'
  | 'BOLLINGER_BREAKOUT'
  | 'MACD_TREND'
  | 'CUSTOM_AI_PROMPT';

export interface StrategyParamDefinition {
  key: string;
  label: string;
  type: 'number' | 'select';
  defaultValue: number | string;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string | number }[];
  description: string;
}

export interface TradingStrategyConfig {
  id: string;
  name: string;
  type: StrategyType;
  description: string;
  hypothesis: string; // Economic rationale / market anomaly
  rationale: string;
  params: Record<string, any>;
  targetTicker: string; // Single ticker or 'PORTFOLIO_TOP5'
  stopLossPercent: number; // e.g. 5%
  takeProfitPercent: number; // e.g. 15%
}

export interface BacktestSettings {
  initialCapital: number; // e.g. $100,000
  positionSizePercent: number; // e.g. 20% of capital per trade
  commissionPerTrade: number; // e.g. $1.00
  slippageBps: number; // basis points, e.g. 5 bps (0.05%)
  benchmarkTicker: string; // e.g. 'SPY'
  startDate?: string;
  endDate?: string;
}

export interface EquityPoint {
  date: string;
  strategyEquity: number;
  benchmarkEquity: number;
  drawdownPercent: number;
  cash: number;
  shares: number;
  inPosition: boolean;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  shares: number;
  pnl: number;
  returnPercent: number;
  holdingDays: number;
  reason: string;
  slippageCost: number;
  commissionCost: number;
}

export interface PerformanceMetrics {
  totalReturnPercent: number;
  benchmarkReturnPercent: number;
  alphaPercent: number;
  cagrPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  profitFactor: number;
  winRatePercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdownPercent: number;
  maxDrawdownDurationDays: number;
  calmarRatio: number;
  averageTradeReturnPercent: number;
  expectancy: number; // in $
  avgWinLossRatio: number;
}

export interface BacktestResult {
  strategyConfig: TradingStrategyConfig;
  settings: BacktestSettings;
  metrics: PerformanceMetrics;
  equityCurve: EquityPoint[];
  trades: TradeRecord[];
  candles: HistoricalCandle[];
  symbol: string;
  executedAt: string;
}

export type OverfittingRiskLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface WalkForwardResult {
  inSampleResult: BacktestResult;
  outOfSampleResult: BacktestResult;
  trainSplitPercent: number; // e.g. 70%
  inSampleBars: number;
  outOfSampleBars: number;
  sharpeDegradationRatio: number; // OOS Sharpe / IS Sharpe
  returnDegradationRatio: number; // OOS Return / IS Return
  overfittingRisk: OverfittingRiskLevel;
  overfittingDiagnosis: string;
  recommendations: string[];
  parameterSensitivities: {
    paramKey: string;
    variations: { value: number; oosSharpe: number; oosReturn: number }[];
  }[];
}

export interface PaperOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  price: number;
  shares: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  timestamp: string;
  executionPrice?: number;
  slippagePaid?: number;
}

export interface PaperPosition {
  symbol: string;
  shares: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedReturnPercent: number;
  costBasis: number;
  marketValue: number;
}

export interface PaperTradingAccount {
  cash: number;
  initialCash: number;
  portfolioValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalReturnPercent: number;
  positions: PaperPosition[];
  orderHistory: PaperOrder[];
  isBotRunning: boolean;
  botSpeedMs: number; // Tick speed
  currentSimulatedBarIndex: number;
}

export interface LiveRiskSettings {
  liveCapitalAllocation: number; // Allocated USD for live trading e.g. $10,000 (10% of total)
  maxPositionSizePercent: number; // Max capital in single position e.g. 10%
  dailyMaxLossPercent: number; // Circuit breaker daily loss limit e.g. 2.0%
  maxStrategyDrawdownPercent: number; // Emergency kill-switch drawdown e.g. 7.5%
  recommendedKellyFraction: number; // Fractional Kelly recommendation e.g. 0.25 (Half-Kelly)
  circuitBreakerTripped: boolean;
  circuitBreakerReason?: string;
  killSwitchActive: boolean;
  executionDragBpsTracked: number; // Difference between paper test and live fills
}

// ==========================================
// GEORGIA TECH CS 7646 (ML4T) MODELS
// ==========================================
export type ML4TProjectTab = 'TOS' | 'PORTFOLIO_OPTIMIZATION' | 'MARKETSIM' | 'Q_LEARNING';

export interface TOSResult {
  symbol: string;
  initialCash: number;
  finalEquity: number;
  cumulativeReturnPercent: number;
  sharpeRatio: number;
  totalTrades: number;
  longDays: number;
  shortDays: number;
  cashDays: number;
  equityCurve: { date: string; tosEquity: number; benchmarkEquity: number }[];
}

export interface PortfolioOptimizationResult {
  tickers: string[];
  optimalWeights: { ticker: string; weight: number }[];
  expectedReturnPercent: number;
  volatilityPercent: number;
  optimizedSharpeRatio: number;
  benchmarkSharpeRatio: number;
}

export interface MarketsimOrder {
  date: string;
  symbol: string;
  order: 'BUY' | 'SELL';
  shares: number;
}

export interface MarketsimResult {
  startVal: number;
  endVal: number;
  cumulativeReturnPercent: number;
  avgDailyReturnPercent: number;
  stdDailyReturnPercent: number;
  sharpeRatio: number;
  commissionPaidTotal: number;
  impactCostTotal: number;
  history: { date: string; portfolioValue: number; cash: number }[];
}

export interface QLearningStepResult {
  episode: number;
  cumulativeReward: number;
  finalPortfolioValue: number;
  sharpeRatio: number;
  tradesCount: number;
}

export interface QLearningResult {
  symbol: string;
  episodes: QLearningStepResult[];
  trainedReturnPercent: number;
  trainedSharpeRatio: number;
  benchmarkReturnPercent: number;
  qTableSize: number;
  bestEquityCurve: { date: string; qEquity: number; benchmarkEquity: number }[];
}

// ==========================================
// STRATEGY PERFORMANCE TRACKER & REGISTRY
// ==========================================
export type TrackedStrategyStatus = 'BACKTESTED' | 'VALIDATED_OOS' | 'PAPER_TRADING' | 'LIVE' | 'ARCHIVED';

export interface TrackedStrategy {
  id: string;
  name: string;
  symbol: string;
  type: StrategyType;
  status: TrackedStrategyStatus;
  createdAt: string;
  lastUpdated: string;
  config: TradingStrategyConfig;
  settings: BacktestSettings;
  metrics: PerformanceMetrics;
  kellyFractionPercent: number;
  equityCurveSummary: { date: string; equity: number }[];
  oosDegradation?: number;
  notes?: string;
}
