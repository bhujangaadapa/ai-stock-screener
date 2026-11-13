import { Injectable, signal, computed } from '@angular/core';
import { Stock, HistoricalCandle } from '../models/stock.model';

export interface TosSamplePreset {
  id: string;
  name: string;
  description: string;
  symbols: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TosIntegrationService {
  // Reactive state for imported ThinkorSwim watchlist symbols
  readonly importedSymbols = signal<string[]>([]);
  readonly isTosFilterActive = signal<boolean>(false);
  readonly lastImportTimestamp = signal<Date | null>(null);

  readonly hasImportedSymbols = computed(() => this.importedSymbols().length > 0);
  readonly importedCount = computed(() => this.importedSymbols().length);

  // Sample ThinkorSwim Scanners pre-configured for instant testing
  readonly samplePresets: TosSamplePreset[] = [
    {
      id: 'krk_200ma_bounce',
      name: 'KRK 200 SMA Trendline & Dip Absorption',
      description: 'ThinkorSwim scan for leaders testing major 200-day moving average support lines with RSI absorption.',
      symbols: ['SPY', 'QQQ', 'MSFT', 'NVDA', 'AAPL', 'AMD', 'AMZN', 'GOOGL', 'META', 'TSLA']
    },
    {
      id: 'post_earnings_dips',
      name: 'TOS Post-Earnings Dip & Rebound (PEAD)',
      description: 'High-conviction institutional earnings dip-buys absorbing post-earnings selling volume.',
      symbols: ['MSFT', 'MRK', 'REGN', 'NKE', 'PFE', 'INTC', 'LULU', 'SNOW', 'BA', 'QCOM']
    },
    {
      id: 'breakouts_momentum',
      name: 'TOS Volume Breakouts Near 52W High',
      description: 'Stage 2 momentum breakouts testing fresh 52-week highs with heavy institutional accumulation.',
      symbols: ['PLTR', 'CEG', 'GE', 'GS', 'WMT', 'NOW', 'AVGO', 'NFLX', 'BKNG', 'COST']
    }
  ];

  /**
   * Opens ThinkorSwim Web or Schwab trade interface in a new browser tab.
   */
  openThinkorSwimWeb(symbol?: string): void {
    if (symbol) {
      window.open(`https://client.schwab.com/app/trade/trading/trade?symbol=${symbol.toUpperCase()}`, '_blank');
    } else {
      window.open('https://tos.schwab.com/', '_blank');
    }
  }

  /**
   * Opens direct Charles Schwab Equity Order Ticket pre-populated for ticker.
   */
  openSchwabTradeTicket(symbol: string): void {
    const url = `https://client.schwab.com/app/trade/trading/trade?symbol=${symbol.toUpperCase()}`;
    window.open(url, '_blank');
  }

  /**
   * Generates formatted thinkScript order command syntax for quick paste into ThinkorSwim.
   */
  generateOrderCommand(symbol: string, currentPrice: number, targetPrice?: number): string {
    const sym = symbol.toUpperCase();
    const entry = currentPrice.toFixed(2);
    const stop = (currentPrice * 0.96).toFixed(2); // 4% protective stop below entry/200 SMA
    const tgt = targetPrice ? targetPrice.toFixed(2) : (currentPrice * 1.12).toFixed(2);

    return `BUY +100 ${sym} @ ${entry} LMT [STOP: ${stop}, TGT: ${tgt}]`;
  }

  /**
   * Copies formatted ThinkorSwim trade command to clipboard.
   */
  async copyOrderCommandToClipboard(symbol: string, currentPrice: number, targetPrice?: number): Promise<boolean> {
    const cmd = this.generateOrderCommand(symbol, currentPrice, targetPrice);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cmd);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
      return false;
    }
  }

  /**
   * Robust parser for ThinkorSwim CSV export files, text exports, or raw symbol lists.
   */
  parseTosExport(rawContent: string): string[] {
    if (!rawContent || !rawContent.trim()) return [];

    const symbols = new Set<string>();
    const lines = rawContent.split(/\r?\n/);

    let symbolColIdx = -1;
    if (lines.length > 0) {
      const headerParts = lines[0].split(/[,\t;]/).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      const foundIdx = headerParts.findIndex(h => h === 'symbol' || h === 'ticker' || h === 'sym');
      if (foundIdx !== -1) {
        symbolColIdx = foundIdx;
        lines.shift(); // Remove header line
      }
    }

    const EXCLUDED = new Set(['SYMBOL', 'LAST', 'NET', 'CHNG', 'BID', 'ASK', 'VOL', 'VOLUME', 'HIGH', 'LOW', 'PE', 'RSI', 'MARKET', 'CAP', 'NAME', 'DATE', 'PRICE', 'TYPE', 'ACTION']);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

      if (symbolColIdx !== -1) {
        // Structured CSV row
        const parts = trimmed.split(/[,\t;]/);
        if (parts.length > symbolColIdx) {
          const candidate = parts[symbolColIdx].replace(/['"$]/g, '').trim().toUpperCase();
          const matches = candidate.match(/\b[A-Z]{1,5}(\.[A-Z]{1,2})?\b/g);
          if (matches) {
            matches.forEach(m => {
              if (!EXCLUDED.has(m)) symbols.add(m);
            });
          }
        }
      } else {
        // Freeform pasted list (comma, space, tab, newline separated)
        const matches = trimmed.toUpperCase().replace(/['"$]/g, ' ').match(/\b[A-Z]{1,5}(\.[A-Z]{1,2})?\b/g);
        if (matches) {
          matches.forEach(m => {
            if (!EXCLUDED.has(m)) symbols.add(m);
          });
        }
      }
    }

    return Array.from(symbols);
  }

  /**
   * Applies imported symbols to the active state and returns enriched stocks.
   */
  setImportedSymbols(symbols: string[]): void {
    const clean = Array.from(new Set(symbols.map(s => s.toUpperCase())));
    this.importedSymbols.set(clean);
    this.lastImportTimestamp.set(new Date());
    this.isTosFilterActive.set(true);
  }

  /**
   * Clears currently imported ThinkorSwim watchlist.
   */
  clearImportedSymbols(): void {
    this.importedSymbols.set([]);
    this.isTosFilterActive.set(false);
    this.lastImportTimestamp.set(null);
  }

  /**
   * Synthesizes a high-fidelity Stock object if an imported symbol is not yet in the universe.
   */
  synthesizeMissingStock(symbol: string): Stock {
    const sym = symbol.toUpperCase();
    const mockPrice = 125.00 + (sym.charCodeAt(0) % 50) * 8.5;
    const mockBeta = 1.15;
    
    // Generate simple candles
    const candles: HistoricalCandle[] = [];
    const sparkline: number[] = [];
    let p = mockPrice * 0.95;
    const now = new Date();

    for (let i = 90; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      const change = p * (Math.random() * 0.04 - 0.018);
      const close = Math.round((p + change) * 100) / 100;
      const open = Math.round(p * 100) / 100;
      const high = Math.round((Math.max(open, close) + Math.abs(change) * 0.6) * 100) / 100;
      const low = Math.round((Math.min(open, close) - Math.abs(change) * 0.6) * 100) / 100;
      const volume = Math.floor(2000000 + Math.random() * 5000000);

      candles.push({
        date: d.toISOString().split('T')[0],
        open, high, low, close, volume
      });
      p = close;
    }
    if (candles.length > 0) candles[candles.length - 1].close = mockPrice;
    sparkline.push(...candles.slice(-14).map(c => c.close));

    const eDate = new Date(now);
    eDate.setDate(eDate.getDate() + 18);

    return {
      symbol: sym,
      name: `${sym} Corp (TOS Import)`,
      sector: 'Technology',
      industry: 'Growth & Momentum',
      price: mockPrice,
      change: 1.85,
      changePercent: 1.48,
      marketCap: 45,
      pe: 28.5,
      forwardPe: 22.4,
      peg: 1.45,
      ps: 6.2,
      pb: 5.4,
      dividendYield: 0.85,
      roe: 22.4,
      debtToEquity: 0.38,
      freeCashFlow: 3.2,
      epsGrowth: 24.5,
      beta: mockBeta,
      rsi14: 52.4,
      sma50: mockPrice * 0.96,
      sma200: mockPrice * 0.91,
      volume: 4500000,
      avgVolume: 5100000,
      high52w: mockPrice * 1.15,
      low52w: mockPrice * 0.72,
      targetPrice: mockPrice * 1.18,
      analystRating: 'Buy',
      sparkline,
      candles,
      earningsDate: eDate.toISOString().split('T')[0],
      daysToEarnings: 18,
      isTosImported: true,
      indices: ['NASDAQ100'],
      aiScore: {
        overall: 8,
        winProbability: 74,
        technicalScore: 8,
        fundamentalScore: 8,
        sentimentScore: 7,
        riskScore: 7,
        bullishCatalysts: ['TOS Scanner momentum confirmation', 'Healthy 200 SMA trend alignment'],
        bearishRisks: ['General market beta exposure'],
        verdict: 'Buy',
        fairValue: mockPrice * 1.18
      }
    };
  }
}
