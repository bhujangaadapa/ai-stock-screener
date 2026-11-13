import { describe, it, expect } from 'vitest';
import { QuantScoringService } from './quant-scoring.service';
import { AiScreenerService } from './ai-screener.service';
import { getBundledStockUniverse } from '../data/stock-universe.data';

describe('AI Stock Screener Services', () => {
  const quantService = new QuantScoringService();
  const aiScreener = new AiScreenerService();
  const universe = getBundledStockUniverse();

  it('should compute valid multi-factor AI score between 1 and 10', () => {
    const nvda = universe.find(s => s.symbol === 'NVDA')!;
    const score = quantService.computeAIScore(nvda);

    expect(score.overall).toBeGreaterThanOrEqual(1);
    expect(score.overall).toBeLessThanOrEqual(10);
    expect(score.winProbability).toBeGreaterThan(20);
    expect(score.winProbability).toBeLessThan(100);
    expect(score.technicalScore).toBeGreaterThanOrEqual(1);
    expect(score.fundamentalScore).toBeGreaterThanOrEqual(1);
    expect(score.sentimentScore).toBeGreaterThanOrEqual(1);
    expect(score.riskScore).toBeGreaterThanOrEqual(1);
    expect(score.bullishCatalysts.length).toBeGreaterThan(0);
    expect(score.bearishRisks.length).toBeGreaterThan(0);
  });

  it('should parse natural language query into concrete filter criteria', () => {
    const result = aiScreener.parsePrompt('Find undervalued tech stocks with P/E < 25');
    expect(result.criteria.sector).toBe('Technology');
    expect(result.criteria.maxPe).toBe(25);
  });

  it('should filter stocks based on dividend yield and low debt', () => {
    const result = aiScreener.parsePrompt('High dividend stocks > 3% with low debt');
    expect(result.criteria.minDividendYield).toBe(3);
    expect(result.criteria.maxDebtToEquity).toBe(0.8);

    const filtered = aiScreener.filterStocks(universe, result.criteria);
    for (const stock of filtered) {
      expect(stock.dividendYield).toBeGreaterThanOrEqual(3);
      expect(stock.debtToEquity).toBeLessThanOrEqual(0.8);
    }
  });

  it('should parse oversold RSI dip queries', () => {
    const result = aiScreener.parsePrompt('Oversold rebound with RSI < 40');
    expect(result.criteria.maxRsi).toBe(40);
  });

  it('should parse Nasdaq 100 and S&P 500 index queries and filter properly', () => {
    const nasdaqResult = aiScreener.parsePrompt('Find nasdaq 100 tech leaders');
    expect(nasdaqResult.criteria.indexFilter).toBe('NASDAQ100');
    expect(nasdaqResult.criteria.sector).toBe('Technology');

    const nasdaqStocks = aiScreener.filterStocks(universe, nasdaqResult.criteria);
    expect(nasdaqStocks.length).toBeGreaterThan(15);
    for (const stock of nasdaqStocks) {
      expect(stock.indices).toContain('NASDAQ100');
      expect(stock.sector).toBe('Technology');
    }

    const sp500Result = aiScreener.parsePrompt('S&P 500 dividend stocks with yield > 3%');
    expect(sp500Result.criteria.indexFilter).toBe('SP500');
    const sp500Stocks = aiScreener.filterStocks(universe, sp500Result.criteria);
    expect(sp500Stocks.length).toBeGreaterThan(5);
    for (const stock of sp500Stocks) {
      expect(stock.indices).toContain('SP500');
      expect(stock.dividendYield).toBeGreaterThanOrEqual(3);
    }
  });

  it('should contain comprehensive 100+ stock universe with valid benchmark index tags', () => {
    expect(universe.length).toBeGreaterThanOrEqual(100);
    const spCount = universe.filter(s => s.indices?.includes('SP500')).length;
    const ndxCount = universe.filter(s => s.indices?.includes('NASDAQ100')).length;
    expect(spCount).toBeGreaterThanOrEqual(80);
    expect(ndxCount).toBeGreaterThanOrEqual(50);
  });
});
