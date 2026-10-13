import { Injectable } from '@angular/core';
import { Stock, StockFilterCriteria } from '../models/stock.model';

export interface AIScreenResult {
  criteria: StockFilterCriteria;
  summary: string;
  matchedCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class AiScreenerService {

  /**
   * Parses natural language investor query into structured filter criteria and generates
   * conversational AI rationale tags.
   */
  parsePrompt(prompt: string): AIScreenResult {
    const p = prompt.toLowerCase().trim();
    const criteria: StockFilterCriteria = {};
    const rationaleParts: string[] = [];

    // 1. Sector recognition
    if (p.includes('tech') || p.includes('software') || p.includes('semi') || p.includes('chip') || p.includes('ai')) {
      criteria.sector = 'Technology';
      rationaleParts.push('Sector: Technology / Semis');
    } else if (p.includes('health') || p.includes('pharma') || p.includes('biotech') || p.includes('drug')) {
      criteria.sector = 'Healthcare';
      rationaleParts.push('Sector: Healthcare / Pharma');
    } else if (p.includes('financ') || p.includes('bank') || p.includes('credit') || p.includes('wall st')) {
      criteria.sector = 'Financials';
      rationaleParts.push('Sector: Financials & Banking');
    } else if (p.includes('energy') || p.includes('oil') || p.includes('gas')) {
      criteria.sector = 'Energy';
      rationaleParts.push('Sector: Energy');
    } else if (p.includes('utilit') || p.includes('power')) {
      criteria.sector = 'Utilities';
      rationaleParts.push('Sector: Utilities & Power');
    } else if (p.includes('staple') || p.includes('retail') || p.includes('consumer')) {
      criteria.sector = p.includes('staple') ? 'Consumer Staples' : 'Consumer Discretionary';
      rationaleParts.push(`Sector: ${criteria.sector}`);
    } else if (p.includes('industri') || p.includes('defense') || p.includes('aerospace')) {
      criteria.sector = 'Industrials';
      rationaleParts.push('Sector: Industrials & Aerospace');
    }

    // 2. Valuation / PE ratio
    if (p.includes('undervalued') || p.includes('cheap') || p.includes('value play') || p.includes('low pe') || p.includes('low p/e')) {
      // Check for explicit number (e.g. pe < 25)
      const peMatch = p.match(/(?:pe|p\/e)[^0-9><]*?(?:<|under|below|less than)?\s*(\d+)/i);
      if (peMatch && peMatch[1]) {
        criteria.maxPe = parseInt(peMatch[1], 10);
      } else {
        criteria.maxPe = 25;
      }
      rationaleParts.push(`P/E ≤ ${criteria.maxPe}`);
    }

    // 3. Dividend yield
    if (p.includes('dividend') || p.includes('yield') || p.includes('income')) {
      const yieldMatch = p.match(/(?:yield|dividend)[^0-9><]*?(?:>|above|over|more than)?\s*(\d+(?:\.\d+)?)/i);
      if (yieldMatch && yieldMatch[1]) {
        criteria.minDividendYield = parseFloat(yieldMatch[1]);
      } else {
        criteria.minDividendYield = 2.0;
      }
      rationaleParts.push(`Dividend Yield ≥ ${criteria.minDividendYield}%`);
    }

    // 4. Technical oversold / RSI
    if (p.includes('oversold') || p.includes('dip') || p.includes('rebound') || p.includes('bounce') || p.includes('rsi <')) {
      const rsiMatch = p.match(/rsi\s*(?:<|under|below)?\s*(\d+)/i);
      if (rsiMatch && rsiMatch[1]) {
        criteria.maxRsi = parseInt(rsiMatch[1], 10);
      } else {
        criteria.maxRsi = 45;
      }
      rationaleParts.push(`RSI(14) ≤ ${criteria.maxRsi} (Oversold)`);
    }

    // 5. Momentum / Breakout / 52W High
    if (p.includes('breakout') || p.includes('high momentum') || p.includes('52w') || p.includes('52 week') || p.includes('ath') || p.includes('all time high')) {
      criteria.near52wHigh = true;
      rationaleParts.push('Near 52-Week High (Within 8%)');
    }

    // 6. Balance Sheet & Low Debt
    if (p.includes('low debt') || p.includes('clean balance sheet') || p.includes('safe') || p.includes('no debt')) {
      criteria.maxDebtToEquity = 0.8;
      rationaleParts.push('Debt/Equity ≤ 0.8');
    }

    // 7. High AI Score / Top conviction
    if (p.includes('top') || p.includes('best') || p.includes('high score') || p.includes('conviction') || p.includes('outperform') || p.includes('strong buy')) {
      criteria.minAiScore = 8;
      rationaleParts.push('AI Quant Score ≥ 8/10');
    }

    // 8. EPS Growth
    if (p.includes('growth') || p.includes('eps') || p.includes('revenue')) {
      criteria.minEpsGrowth = 15;
      rationaleParts.push('EPS Growth ≥ 15%');
    }

    // 9. Volume spike
    if (p.includes('volume') || p.includes('accumulation') || p.includes('heavy volume')) {
      criteria.volumeSpike = true;
      rationaleParts.push('Volume > 110% of 30D Average');
    }

    const summary = rationaleParts.length > 0
      ? `AI Parameters Activated: ${rationaleParts.join(' • ')}`
      : `AI Keyword Filter: Displaying stocks matching prompt search terms.`;

    return {
      criteria,
      summary,
      matchedCount: 0
    };
  }

  /**
   * Applies the parsed criteria to a list of stocks and attaches AI rationale tags.
   */
  filterStocks(stocks: Stock[], criteria: StockFilterCriteria): Stock[] {
    return stocks.filter(stock => {
      // Search term
      if (criteria.search) {
        const q = criteria.search.toLowerCase();
        const matchesQuery = stock.symbol.toLowerCase().includes(q) ||
                             stock.name.toLowerCase().includes(q) ||
                             stock.industry.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Sector
      if (criteria.sector && stock.sector.toLowerCase() !== criteria.sector.toLowerCase()) {
        return false;
      }

      // AI Score
      if (criteria.minAiScore && stock.aiScore.overall < criteria.minAiScore) {
        return false;
      }

      // Price
      if (criteria.minPrice && stock.price < criteria.minPrice) return false;
      if (criteria.maxPrice && stock.price > criteria.maxPrice) return false;

      // PE
      if (criteria.minPe && stock.pe < criteria.minPe) return false;
      if (criteria.maxPe && stock.pe > criteria.maxPe) return false;

      // Dividend Yield
      if (criteria.minDividendYield && stock.dividendYield < criteria.minDividendYield) return false;

      // RSI
      if (criteria.minRsi && stock.rsi14 < criteria.minRsi) return false;
      if (criteria.maxRsi && stock.rsi14 > criteria.maxRsi) return false;

      // Debt to Equity
      if (criteria.maxDebtToEquity && stock.debtToEquity > criteria.maxDebtToEquity) return false;

      // EPS Growth
      if (criteria.minEpsGrowth && stock.epsGrowth < criteria.minEpsGrowth) return false;

      // Near 52W High (within 8%)
      if (criteria.near52wHigh && stock.price < stock.high52w * 0.92) return false;

      // Volume spike
      if (criteria.volumeSpike && stock.volume < stock.avgVolume * 1.05) return false;

      return true;
    }).map(stock => {
      // Annotate with dynamic AI reason tag
      const reasons: string[] = [];
      if (stock.aiScore.overall >= 8) reasons.push(`AI Score ${stock.aiScore.overall}/10`);
      if (stock.pe > 0 && stock.pe < 25) reasons.push(`P/E ${stock.pe.toFixed(1)}`);
      if (stock.dividendYield >= 2.0) reasons.push(`Div ${stock.dividendYield.toFixed(1)}%`);
      if (stock.rsi14 < 40) reasons.push(`RSI ${stock.rsi14.toFixed(0)} Oversold`);
      if (stock.price >= stock.high52w * 0.94) reasons.push('Near 52W High');

      return {
        ...stock,
        aiReasonTag: reasons.slice(0, 2).join(' • ')
      };
    });
  }
}
