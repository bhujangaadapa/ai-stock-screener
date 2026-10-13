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
});
