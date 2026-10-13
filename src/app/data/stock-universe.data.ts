import { HistoricalCandle, Stock } from '../models/stock.model';

// Helper to generate 90 daily OHLCV candles leading up to the current price
function generateCandles(currentPrice: number, volatility: number = 0.02): { candles: HistoricalCandle[], sparkline: number[] } {
  const candles: HistoricalCandle[] = [];
  const days = 220;
  let price = currentPrice * (1 - (Math.random() * 0.15 - 0.05)); // starting price ~3 months ago
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const drift = (currentPrice - price) / (i + 1);
    const change = price * (Math.random() * volatility * 2 - volatility) + drift * 0.4;
    const open = Math.round(price * 100) / 100;
    const close = Math.round((price + change) * 100) / 100;
    const high = Math.round((Math.max(open, close) + Math.abs(change) * (0.5 + Math.random())) * 100) / 100;
    const low = Math.round((Math.min(open, close) - Math.abs(change) * (0.5 + Math.random())) * 100) / 100;
    const volume = Math.floor(1000000 + Math.random() * 8000000);

    candles.push({
      date: d.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume
    });
    price = close;
  }

  // Ensure last candle close equals currentPrice
  if (candles.length > 0) {
    candles[candles.length - 1].close = currentPrice;
  }

  const sparkline = candles.slice(-14).map(c => c.close);
  return { candles, sparkline };
}

interface RawStockConfig {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  pe: number;
  forwardPe: number;
  peg: number;
  ps: number;
  pb: number;
  dividendYield: number;
  roe: number;
  debtToEquity: number;
  freeCashFlow: number;
  epsGrowth: number;
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
}

const RAW_STOCKS: RawStockConfig[] = [
  // --- TECHNOLOGY & SEMICONDUCTORS ---
  {
    symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors',
    price: 138.25, change: 4.12, changePercent: 3.07, marketCap: 3390,
    pe: 48.5, forwardPe: 32.1, peg: 0.95, ps: 28.4, pb: 42.1, dividendYield: 0.03, roe: 115.4,
    debtToEquity: 0.17, freeCashFlow: 46.8, epsGrowth: 122.5, beta: 1.68, rsi14: 64.2,
    sma50: 124.50, sma200: 104.20, volume: 54200000, avgVolume: 48500000, high52w: 140.76, low52w: 45.20,
    targetPrice: 165.00, analystRating: 'Strong Buy'
  },
  {
    symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics',
    price: 232.80, change: 1.45, changePercent: 0.63, marketCap: 3540,
    pe: 34.2, forwardPe: 29.8, peg: 2.45, ps: 9.1, pb: 48.2, dividendYield: 0.43, roe: 147.2,
    debtToEquity: 1.45, freeCashFlow: 108.5, epsGrowth: 11.2, beta: 1.05, rsi14: 58.1,
    sma50: 224.10, sma200: 198.50, volume: 46200000, avgVolume: 49100000, high52w: 237.23, low52w: 164.08,
    targetPrice: 250.00, analystRating: 'Buy'
  },
  {
    symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software - Infrastructure',
    price: 422.50, change: 3.20, changePercent: 0.76, marketCap: 3140,
    pe: 35.8, forwardPe: 28.4, peg: 1.82, ps: 12.8, pb: 11.4, dividendYield: 0.79, roe: 38.8,
    debtToEquity: 0.42, freeCashFlow: 74.2, epsGrowth: 18.5, beta: 0.92, rsi14: 52.4,
    sma50: 428.10, sma200: 412.30, volume: 18400000, avgVolume: 20100000, high52w: 468.35, low52w: 326.93,
    targetPrice: 490.00, analystRating: 'Strong Buy'
  },
  {
    symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services', industry: 'Internet Content & Information',
    price: 166.40, change: -0.85, changePercent: -0.51, marketCap: 2060,
    pe: 23.4, forwardPe: 19.8, peg: 1.15, ps: 6.4, pb: 6.8, dividendYield: 0.48, roe: 31.5,
    debtToEquity: 0.11, freeCashFlow: 68.4, epsGrowth: 28.2, beta: 1.06, rsi14: 48.2,
    sma50: 168.20, sma200: 162.40, volume: 22100000, avgVolume: 25400000, high52w: 191.75, low52w: 120.21,
    targetPrice: 205.00, analystRating: 'Strong Buy'
  },
  {
    symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', industry: 'Internet Retail',
    price: 188.90, change: 2.10, changePercent: 1.12, marketCap: 1980,
    pe: 43.1, forwardPe: 31.5, peg: 1.28, ps: 3.3, pb: 8.2, dividendYield: 0.00, roe: 21.8,
    debtToEquity: 0.58, freeCashFlow: 53.0, epsGrowth: 95.0, beta: 1.15, rsi14: 57.3,
    sma50: 182.40, sma200: 176.80, volume: 38200000, avgVolume: 41500000, high52w: 201.20, low52w: 118.35,
    targetPrice: 225.00, analystRating: 'Strong Buy'
  },
  {
    symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services', industry: 'Internet Content & Information',
    price: 589.60, change: 8.40, changePercent: 1.45, marketCap: 1490,
    pe: 28.6, forwardPe: 22.4, peg: 1.12, ps: 9.8, pb: 8.9, dividendYield: 0.34, roe: 36.2,
    debtToEquity: 0.24, freeCashFlow: 49.5, epsGrowth: 73.0, beta: 1.22, rsi14: 67.5,
    sma50: 540.20, sma200: 485.60, volume: 14500000, avgVolume: 13800000, high52w: 602.95, low52w: 279.40,
    targetPrice: 650.00, analystRating: 'Strong Buy'
  },
  {
    symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary', industry: 'Auto Manufacturers',
    price: 221.40, change: -5.30, changePercent: -2.34, marketCap: 708,
    pe: 62.4, forwardPe: 72.1, peg: 4.80, ps: 7.4, pb: 10.5, dividendYield: 0.00, roe: 19.5,
    debtToEquity: 0.18, freeCashFlow: 3.8, epsGrowth: -15.4, beta: 2.45, rsi14: 42.1,
    sma50: 228.40, sma200: 198.20, volume: 68400000, avgVolume: 74200000, high52w: 271.00, low52w: 138.80,
    targetPrice: 210.00, analystRating: 'Hold'
  },
  {
    symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', industry: 'Semiconductors',
    price: 182.30, change: 3.80, changePercent: 2.13, marketCap: 852,
    pe: 45.2, forwardPe: 27.8, peg: 1.35, ps: 17.2, pb: 12.8, dividendYield: 1.16, roe: 24.1,
    debtToEquity: 1.12, freeCashFlow: 19.8, epsGrowth: 34.0, beta: 1.25, rsi14: 61.4,
    sma50: 168.90, sma200: 148.50, volume: 19800000, avgVolume: 22400000, high52w: 185.16, low52w: 83.20,
    targetPrice: 215.00, analystRating: 'Strong Buy'
  },
  {
    symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', industry: 'Semiconductors',
    price: 154.20, change: -1.20, changePercent: -0.77, marketCap: 250,
    pe: 88.4, forwardPe: 28.5, peg: 1.08, ps: 10.8, pb: 4.4, dividendYield: 0.00, roe: 4.2,
    debtToEquity: 0.05, freeCashFlow: 1.6, epsGrowth: 42.0, beta: 1.72, rsi14: 49.8,
    sma50: 151.20, sma200: 162.40, volume: 38500000, avgVolume: 45200000, high52w: 227.30, low52w: 94.04,
    targetPrice: 190.00, analystRating: 'Buy'
  },
  {
    symbol: 'QCOM', name: 'QUALCOMM Inc.', sector: 'Technology', industry: 'Semiconductors',
    price: 168.50, change: 1.80, changePercent: 1.08, marketCap: 188,
    pe: 18.2, forwardPe: 14.8, peg: 1.12, ps: 4.9, pb: 7.8, dividendYield: 2.02, roe: 43.1,
    debtToEquity: 0.62, freeCashFlow: 9.8, epsGrowth: 18.5, beta: 1.28, rsi14: 53.2,
    sma50: 166.40, sma200: 174.20, volume: 7200000, avgVolume: 8400000, high52w: 230.63, low52w: 104.33,
    targetPrice: 200.00, analystRating: 'Buy'
  },
  {
    symbol: 'ARM', name: 'Arm Holdings plc', sector: 'Technology', industry: 'Semiconductors',
    price: 142.10, change: 4.20, changePercent: 3.05, marketCap: 148,
    pe: 82.5, forwardPe: 58.2, peg: 2.10, ps: 42.1, pb: 24.5, dividendYield: 0.00, roe: 12.8,
    debtToEquity: 0.00, freeCashFlow: 0.85, epsGrowth: 38.0, beta: 2.10, rsi14: 63.8,
    sma50: 132.40, sma200: 122.10, volume: 9800000, avgVolume: 11200000, high52w: 188.75, low52w: 46.50,
    targetPrice: 160.00, analystRating: 'Buy'
  },
  {
    symbol: 'PLTR', name: 'Palantir Technologies', sector: 'Technology', industry: 'Software - Infrastructure',
    price: 43.80, change: 1.65, changePercent: 3.91, marketCap: 98,
    pe: 95.4, forwardPe: 68.2, peg: 2.30, ps: 38.5, pb: 22.1, dividendYield: 0.00, roe: 11.4,
    debtToEquity: 0.06, freeCashFlow: 0.78, epsGrowth: 68.0, beta: 2.65, rsi14: 72.1,
    sma50: 36.20, sma200: 27.40, volume: 48200000, avgVolume: 42100000, high52w: 44.60, low52w: 14.48,
    targetPrice: 42.00, analystRating: 'Hold'
  },
  {
    symbol: 'MU', name: 'Micron Technology', sector: 'Technology', industry: 'Semiconductors',
    price: 108.40, change: 2.80, changePercent: 2.65, marketCap: 120,
    pe: 32.1, forwardPe: 11.2, peg: 0.65, ps: 4.8, pb: 2.4, dividendYield: 0.42, roe: 4.8,
    debtToEquity: 0.31, freeCashFlow: 2.4, epsGrowth: 145.0, beta: 1.34, rsi14: 56.4,
    sma50: 102.10, sma200: 114.50, volume: 18400000, avgVolume: 22100000, high52w: 157.50, low52w: 65.40,
    targetPrice: 145.00, analystRating: 'Strong Buy'
  },

  // --- FINANCIALS & FINTECH ---
  {
    symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials', industry: 'Banks - Diversified',
    price: 222.80, change: 2.10, changePercent: 0.95, marketCap: 636,
    pe: 12.4, forwardPe: 11.8, peg: 1.42, ps: 3.8, pb: 1.9, dividendYield: 2.06, roe: 17.5,
    debtToEquity: 1.25, freeCashFlow: 38.0, epsGrowth: 14.5, beta: 1.10, rsi14: 62.4,
    sma50: 215.40, sma200: 198.80, volume: 8400000, avgVolume: 9200000, high52w: 225.48, low52w: 140.40,
    targetPrice: 240.00, analystRating: 'Buy'
  },
  {
    symbol: 'BAC', name: 'Bank of America Corp.', sector: 'Financials', industry: 'Banks - Diversified',
    price: 42.15, change: 0.45, changePercent: 1.08, marketCap: 328,
    pe: 14.2, forwardPe: 11.4, peg: 1.55, ps: 3.2, pb: 1.2, dividendYield: 2.47, roe: 9.8,
    debtToEquity: 1.40, freeCashFlow: 18.5, epsGrowth: 8.5, beta: 1.32, rsi14: 57.8,
    sma50: 40.20, sma200: 37.80, volume: 29500000, avgVolume: 34100000, high52w: 44.44, low52w: 24.96,
    targetPrice: 48.00, analystRating: 'Buy'
  },
  {
    symbol: 'V', name: 'Visa Inc.', sector: 'Financials', industry: 'Credit Services',
    price: 282.40, change: 1.80, changePercent: 0.64, marketCap: 578,
    pe: 30.2, forwardPe: 25.4, peg: 1.78, ps: 16.5, pb: 14.2, dividendYield: 0.74, roe: 49.5,
    debtToEquity: 0.54, freeCashFlow: 20.4, epsGrowth: 13.8, beta: 0.94, rsi14: 58.2,
    sma50: 274.50, sma200: 271.80, volume: 5400000, avgVolume: 6100000, high52w: 290.96, low52w: 227.68,
    targetPrice: 315.00, analystRating: 'Strong Buy'
  },
  {
    symbol: 'MA', name: 'Mastercard Inc.', sector: 'Financials', industry: 'Credit Services',
    price: 498.20, change: 3.40, changePercent: 0.69, marketCap: 462,
    pe: 36.1, forwardPe: 29.8, peg: 1.85, ps: 17.8, pb: 64.2, dividendYield: 0.53, roe: 172.5,
    debtToEquity: 2.45, freeCashFlow: 12.8, epsGrowth: 16.2, beta: 1.02, rsi14: 61.2,
    sma50: 482.10, sma200: 464.30, volume: 2400000, avgVolume: 27500000, high52w: 504.60, low52w: 364.50,
    targetPrice: 545.00, analystRating: 'Strong Buy'
  },
  {
    symbol: 'GS', name: 'The Goldman Sachs Group', sector: 'Financials', industry: 'Capital Markets',
    price: 508.50, change: 4.80, changePercent: 0.95, marketCap: 164,
    pe: 15.8, forwardPe: 12.5, peg: 0.98, ps: 3.4, pb: 1.5, dividendYield: 2.36, roe: 10.4,
    debtToEquity: 2.80, freeCashFlow: 14.2, epsGrowth: 45.0, beta: 1.38, rsi14: 64.5,
    sma50: 488.20, sma200: 432.50, volume: 1800000, avgVolume: 2100000, high52w: 517.26, low52w: 289.36,
    targetPrice: 560.00, analystRating: 'Strong Buy'
  },
  {
    symbol: 'BLK', name: 'BlackRock Inc.', sector: 'Financials', industry: 'Asset Management',
    price: 964.80, change: 7.20, changePercent: 0.75, marketCap: 144,
    pe: 23.4, forwardPe: 21.2, peg: 1.62, ps: 7.8, pb: 3.4, dividendYield: 2.11, roe: 15.2,
    debtToEquity: 0.32, freeCashFlow: 5.4, epsGrowth: 12.4, beta: 1.25, rsi14: 66.8,
    sma50: 910.40, sma200: 825.60, volume: 620000, avgVolume: 680000, high52w: 978.20, low52w: 616.50,
    targetPrice: 1050.00, analystRating: 'Buy'
  },

  // --- HEALTHCARE & BIOTECH ---
  {
    symbol: 'LLY', name: 'Eli Lilly and Company', sector: 'Healthcare', industry: 'Drug Manufacturers - General',
    price: 912.40, change: 12.50, changePercent: 1.39, marketCap: 866,
    pe: 98.4, forwardPe: 38.2, peg: 1.15, ps: 21.8, pb: 54.2, dividendYield: 0.57, roe: 64.8,
    debtToEquity: 2.10, freeCashFlow: 4.8, epsGrowth: 85.0, beta: 0.68, rsi14: 55.4,
    sma50: 928.50, sma200: 835.40, volume: 2800000, avgVolume: 3200000, high52w: 972.53, low52w: 528.20,
    targetPrice: 1050.00, analystRating: 'Strong Buy'
  },
  {
    symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', industry: 'Healthcare Plans',
    price: 588.20, change: -2.10, changePercent: -0.36, marketCap: 542,
    pe: 28.5, forwardPe: 20.8, peg: 1.65, ps: 1.4, pb: 5.8, dividendYield: 1.43, roe: 24.8,
    debtToEquity: 0.74, freeCashFlow: 28.5, epsGrowth: 12.5, beta: 0.58, rsi14: 52.1,
    sma50: 582.40, sma200: 532.10, volume: 2400000, avgVolume: 2900000, high52w: 606.37, low52w: 436.38,
    targetPrice: 640.00, analystRating: 'Buy'
  },
  {
    symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', industry: 'Drug Manufacturers - General',
    price: 161.40, change: 0.65, changePercent: 0.40, marketCap: 388,
    pe: 24.8, forwardPe: 15.6, peg: 2.80, ps: 4.5, pb: 5.4, dividendYield: 3.07, roe: 21.4,
    debtToEquity: 0.45, freeCashFlow: 18.2, epsGrowth: 4.8, beta: 0.52, rsi14: 48.6,
    sma50: 163.20, sma200: 156.40, volume: 6200000, avgVolume: 6900000, high52w: 168.96, low52w: 143.16,
    targetPrice: 175.00, analystRating: 'Hold'
  },
  {
    symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', industry: 'Drug Manufacturers - General',
    price: 189.60, change: 1.20, changePercent: 0.64, marketCap: 335,
    pe: 58.2, forwardPe: 16.4, peg: 1.95, ps: 6.2, pb: 38.5, dividendYield: 3.27, roe: 58.2,
    debtToEquity: 6.80, freeCashFlow: 17.5, epsGrowth: 6.2, beta: 0.58, rsi14: 54.8,
    sma50: 192.40, sma200: 178.50, volume: 3800000, avgVolume: 4400000, high52w: 200.75, low52w: 135.50,
    targetPrice: 205.00, analystRating: 'Buy'
  },
  {
    symbol: 'MRK', name: 'Merck & Co. Inc.', sector: 'Healthcare', industry: 'Drug Manufacturers - General',
    price: 110.80, change: -1.40, changePercent: -1.25, marketCap: 280,
    pe: 21.2, forwardPe: 12.8, peg: 0.85, ps: 4.6, pb: 6.8, dividendYield: 2.78, roe: 32.4,
    debtToEquity: 0.84, freeCashFlow: 14.8, epsGrowth: 24.0, beta: 0.45, rsi14: 38.5,
    sma50: 116.40, sma200: 124.50, volume: 7400000, avgVolume: 8100000, high52w: 134.63, low52w: 98.40,
    targetPrice: 135.00, analystRating: 'Strong Buy'
  },
  {
    symbol: 'ISRG', name: 'Intuitive Surgical Inc.', sector: 'Healthcare', industry: 'Medical Instruments & Supplies',
    price: 494.50, change: 6.80, changePercent: 1.39, marketCap: 175,
    pe: 82.4, forwardPe: 62.1, peg: 3.20, ps: 23.4, pb: 11.2, dividendYield: 0.00, roe: 14.8,
    debtToEquity: 0.00, freeCashFlow: 1.6, epsGrowth: 26.5, beta: 1.35, rsi14: 65.2,
    sma50: 472.10, sma200: 408.50, volume: 1400000, avgVolume: 1650000, high52w: 508.80, low52w: 254.20,
    targetPrice: 530.00, analystRating: 'Buy'
  },

  // --- CONSUMER STAPLES & RETAIL ---
  {
    symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Staples', industry: 'Discount Stores',
    price: 81.20, change: 0.65, changePercent: 0.81, marketCap: 652,
    pe: 42.1, forwardPe: 30.2, peg: 2.85, ps: 0.98, pb: 7.4, dividendYield: 1.02, roe: 19.8,
    debtToEquity: 0.68, freeCashFlow: 15.2, epsGrowth: 9.8, beta: 0.52, rsi14: 67.2,
    sma50: 77.80, sma200: 68.40, volume: 14200000, avgVolume: 16800000, high52w: 81.95, low52w: 49.85,
    targetPrice: 86.00, analystRating: 'Buy'
  },
  {
    symbol: 'COST', name: 'Costco Wholesale Corp.', sector: 'Consumer Staples', industry: 'Discount Stores',
    price: 898.40, change: 5.60, changePercent: 0.63, marketCap: 398,
    pe: 54.2, forwardPe: 46.5, peg: 4.10, ps: 1.55, pb: 15.2, dividendYield: 0.52, roe: 29.4,
    debtToEquity: 0.32, freeCashFlow: 7.2, epsGrowth: 12.8, beta: 0.78, rsi14: 60.1,
    sma50: 885.20, sma200: 810.40, volume: 1600000, avgVolume: 1850000, high52w: 924.00, low52w: 544.50,
    targetPrice: 950.00, analystRating: 'Buy'
  },
  {
    symbol: 'PG', name: 'Procter & Gamble Company', sector: 'Consumer Staples', industry: 'Household & Personal Products',
    price: 172.50, change: 0.40, changePercent: 0.23, marketCap: 406,
    pe: 27.8, forwardPe: 24.2, peg: 3.40, ps: 4.8, pb: 8.4, dividendYield: 2.34, roe: 31.8,
    debtToEquity: 0.65, freeCashFlow: 15.8, epsGrowth: 6.5, beta: 0.42, rsi14: 53.4,
    sma50: 171.20, sma200: 165.80, volume: 5200000, avgVolume: 5800000, high52w: 177.94, low52w: 143.20,
    targetPrice: 182.00, analystRating: 'Hold'
  },
  {
    symbol: 'KO', name: 'The Coca-Cola Company', sector: 'Consumer Staples', industry: 'Beverages - Non-Alcoholic',
    price: 68.40, change: -0.20, changePercent: -0.29, marketCap: 294,
    pe: 27.2, forwardPe: 23.5, peg: 3.80, ps: 6.4, pb: 10.8, dividendYield: 2.84, roe: 41.5,
    debtToEquity: 1.45, freeCashFlow: 10.2, epsGrowth: 4.2, beta: 0.56, rsi14: 46.8,
    sma50: 70.10, sma200: 64.50, volume: 9800000, avgVolume: 11200000, high52w: 73.53, low52w: 51.55,
    targetPrice: 74.00, analystRating: 'Hold'
  },

  // --- ENERGY ---
  {
    symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', industry: 'Oil & Gas Integrated',
    price: 122.50, change: 1.85, changePercent: 1.53, marketCap: 546,
    pe: 14.8, forwardPe: 13.2, peg: 1.90, ps: 1.5, pb: 2.2, dividendYield: 3.10, roe: 16.8,
    debtToEquity: 0.18, freeCashFlow: 32.5, epsGrowth: -4.5, beta: 0.95, rsi14: 63.5,
    sma50: 117.80, sma200: 114.20, volume: 14200000, avgVolume: 15800000, high52w: 126.34, low52w: 95.77,
    targetPrice: 135.00, analystRating: 'Buy'
  },
  {
    symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energy', industry: 'Oil & Gas Integrated',
    price: 152.80, change: 1.40, changePercent: 0.92, marketCap: 280,
    pe: 14.2, forwardPe: 12.1, peg: 2.10, ps: 1.4, pb: 1.7, dividendYield: 4.27, roe: 12.5,
    debtToEquity: 0.15, freeCashFlow: 16.8, epsGrowth: -8.2, beta: 1.10, rsi14: 56.4,
    sma50: 148.20, sma200: 153.50, volume: 6800000, avgVolume: 7400000, high52w: 167.11, low52w: 138.60,
    targetPrice: 170.00, analystRating: 'Buy'
  },
  {
    symbol: 'COP', name: 'ConocoPhillips', sector: 'Energy', industry: 'Oil & Gas E&P',
    price: 108.60, change: 1.10, changePercent: 1.02, marketCap: 126,
    pe: 12.5, forwardPe: 11.4, peg: 1.75, ps: 2.1, pb: 2.3, dividendYield: 2.89, roe: 19.4,
    debtToEquity: 0.38, freeCashFlow: 9.4, epsGrowth: 3.2, beta: 1.25, rsi14: 55.2,
    sma50: 106.80, sma200: 112.40, volume: 4800000, avgVolume: 5300000, high52w: 134.40, low52w: 99.20,
    targetPrice: 130.00, analystRating: 'Buy'
  },

  // --- INDUSTRIALS & AEROSPACE ---
  {
    symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials', industry: 'Farm & Heavy Construction Machinery',
    price: 398.20, change: 4.80, changePercent: 1.22, marketCap: 192,
    pe: 18.5, forwardPe: 17.8, peg: 1.45, ps: 2.9, pb: 9.8, dividendYield: 1.42, roe: 54.2,
    debtToEquity: 1.85, freeCashFlow: 10.4, epsGrowth: 15.2, beta: 1.15, rsi14: 68.4,
    sma50: 362.40, sma200: 338.20, volume: 2200000, avgVolume: 2500000, high52w: 404.75, low52w: 232.40,
    targetPrice: 420.00, analystRating: 'Buy'
  },
  {
    symbol: 'GE', name: 'GE Aerospace', sector: 'Industrials', industry: 'Aerospace & Defense',
    price: 188.40, change: 3.20, changePercent: 1.73, marketCap: 204,
    pe: 34.2, forwardPe: 32.5, peg: 1.55, ps: 3.1, pb: 7.2, dividendYield: 0.59, roe: 24.8,
    debtToEquity: 0.68, freeCashFlow: 5.6, epsGrowth: 28.5, beta: 1.22, rsi14: 64.8,
    sma50: 174.50, sma200: 152.10, volume: 4600000, avgVolume: 5200000, high52w: 194.20, low52w: 87.50,
    targetPrice: 210.00, analystRating: 'Strong Buy'
  },
  {
    symbol: 'BA', name: 'The Boeing Company', sector: 'Industrials', industry: 'Aerospace & Defense',
    price: 151.20, change: -2.80, changePercent: -1.82, marketCap: 93,
    pe: -18.2, forwardPe: 34.5, peg: -1.2, ps: 1.2, pb: -5.4, dividendYield: 0.00, roe: -34.0,
    debtToEquity: -3.4, freeCashFlow: -3.8, epsGrowth: -45.0, beta: 1.55, rsi14: 34.2,
    sma50: 162.80, sma200: 184.20, volume: 8800000, avgVolume: 9200000, high52w: 267.54, low52w: 146.02,
    targetPrice: 175.00, analystRating: 'Hold'
  },

  // --- UTILITIES & MATERIALS ---
  {
    symbol: 'NEE', name: 'NextEra Energy Inc.', sector: 'Utilities', industry: 'Utilities - Regulated Electric',
    price: 82.40, change: 0.85, changePercent: 1.04, marketCap: 170,
    pe: 23.5, forwardPe: 22.8, peg: 2.75, ps: 6.2, pb: 3.4, dividendYield: 2.50, roe: 14.2,
    debtToEquity: 1.48, freeCashFlow: -4.2, epsGrowth: 8.5, beta: 0.65, rsi14: 61.2,
    sma50: 79.20, sma200: 68.50, volume: 7400000, avgVolume: 8200000, high52w: 85.64, low52w: 52.15,
    targetPrice: 88.00, analystRating: 'Buy'
  },
  {
    symbol: 'CEG', name: 'Constellation Energy Corp.', sector: 'Utilities', industry: 'Utilities - Independent Power',
    price: 268.50, change: 7.40, changePercent: 2.83, marketCap: 84,
    pe: 31.4, forwardPe: 28.5, peg: 1.35, ps: 3.4, pb: 6.8, dividendYield: 0.53, roe: 23.5,
    debtToEquity: 0.62, freeCashFlow: 2.8, epsGrowth: 42.0, beta: 0.88, rsi14: 68.2,
    sma50: 218.40, sma200: 175.20, volume: 3800000, avgVolume: 3200000, high52w: 284.00, low52w: 104.50,
    targetPrice: 300.00, analystRating: 'Strong Buy'
  },
  {
    symbol: 'LIN', name: 'Linde plc', sector: 'Materials', industry: 'Specialty Chemicals',
    price: 462.80, change: 1.80, changePercent: 0.39, marketCap: 222,
    pe: 34.5, forwardPe: 29.2, peg: 2.65, ps: 6.8, pb: 5.4, dividendYield: 1.20, roe: 16.5,
    debtToEquity: 0.42, freeCashFlow: 5.4, epsGrowth: 11.2, beta: 0.78, rsi14: 55.4,
    sma50: 454.20, sma200: 442.80, volume: 1200000, avgVolume: 1450000, high52w: 478.20, low52w: 372.50,
    targetPrice: 500.00, analystRating: 'Buy'
  }
];

export function getBundledStockUniverse(): Stock[] {
  return RAW_STOCKS.map(raw => {
    const { candles, sparkline } = generateCandles(raw.price, raw.beta * 0.015);
    
    // Preliminary mock score, will be overwritten by QuantScoringService
    const stock: Stock = {
      ...raw,
      sparkline,
      candles,
      aiScore: {
        overall: 8,
        winProbability: 75,
        technicalScore: 8,
        fundamentalScore: 8,
        sentimentScore: 8,
        riskScore: 7,
        bullishCatalysts: [],
        bearishRisks: [],
        verdict: 'Buy',
        fairValue: raw.targetPrice
      }
    };
    return stock;
  });
}
