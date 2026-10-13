export interface HistoricalCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AIScoreBreakdown {
  overall: number; // 1 to 10
  winProbability: number; // e.g. 82%
  technicalScore: number; // 1 to 10
  fundamentalScore: number; // 1 to 10
  sentimentScore: number; // 1 to 10
  riskScore: number; // 1 to 10
  bullishCatalysts: string[];
  bearishRisks: string[];
  verdict: string;
  fairValue: number;
}

export interface Stock {
  id?: string;
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number; // in Billions USD
  pe: number;
  forwardPe: number;
  peg: number;
  ps: number;
  pb: number;
  dividendYield: number; // %
  roe: number; // %
  debtToEquity: number;
  freeCashFlow: number; // in Billions USD
  epsGrowth: number; // % YoY
  beta: number;
  rsi14: number;
  sma50: number;
  sma200: number;
  volume: number;
  avgVolume: number;
  high52w: number;
  low52w: number;
  targetPrice: number;
  analystRating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell';
  aiScore: AIScoreBreakdown;
  sparkline: number[];
  candles: HistoricalCandle[];
  aiReasonTag?: string; // dynamic tag when matched by AI query
  updatedAt?: any;
}

export interface StockFilterCriteria {
  search?: string;
  sector?: string;
  minAiScore?: number;
  minPrice?: number;
  maxPrice?: number;
  minPe?: number;
  maxPe?: number;
  minDividendYield?: number;
  minRsi?: number;
  maxRsi?: number;
  maxDebtToEquity?: number;
  minEpsGrowth?: number;
  near52wHigh?: boolean;
  volumeSpike?: boolean;
}

export interface SectorPerformance {
  name: string;
  changePercent: number;
  weight: number; // market cap weight approx
  topStock: string;
  stockCount: number;
}

export type ScreenerViewMode = 'overview' | 'valuation' | 'technicals' | 'financials' | 'performance';
