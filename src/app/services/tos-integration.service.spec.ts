import { describe, it, expect } from 'vitest';
import { TosIntegrationService } from './tos-integration.service';

describe('TosIntegrationService', () => {
  const service = new TosIntegrationService();

  it('should parse standard ThinkorSwim CSV export lines', () => {
    const csvContent = `Symbol,Description,Bid,Ask,Last,Net Chng
NVDA,NVIDIA CORP,138.20,138.25,138.25,+4.12
AAPL,APPLE INC,232.75,232.80,232.80,+1.45
MSFT,MICROSOFT CORP,422.40,422.50,422.50,+3.20`;

    const symbols = service.parseTosExport(csvContent);
    expect(symbols).toContain('NVDA');
    expect(symbols).toContain('AAPL');
    expect(symbols).toContain('MSFT');
    expect(symbols.length).toBe(3);
  });

  it('should parse comma and newline delimited ticker strings', () => {
    const raw = 'SPY, QQQ; MSFT\nNVDA  AMD   AMZN';
    const symbols = service.parseTosExport(raw);
    expect(symbols).toEqual(['SPY', 'QQQ', 'MSFT', 'NVDA', 'AMD', 'AMZN']);
  });

  it('should generate valid ThinkorSwim bracket order command syntax', () => {
    const cmd = service.generateOrderCommand('MSFT', 420.00, 480.00);
    expect(cmd).toContain('BUY +100 MSFT @ 420.00 LMT');
    expect(cmd).toContain('STOP: 403.20');
    expect(cmd).toContain('TGT: 480.00');
  });

  it('should synthesize missing stocks with valid candles and fundamentals', () => {
    const synthetic = service.synthesizeMissingStock('COIN');
    expect(synthetic.symbol).toBe('COIN');
    expect(synthetic.price).toBeGreaterThan(0);
    expect(synthetic.candles.length).toBeGreaterThan(50);
    expect(synthetic.sparkline.length).toBe(14);
    expect(synthetic.isTosImported).toBe(true);
    expect(synthetic.aiScore.overall).toBeGreaterThanOrEqual(1);
  });

  it('should maintain built-in sample presets for KRK and earnings scans', () => {
    expect(service.samplePresets.length).toBeGreaterThanOrEqual(3);
    const krkPreset = service.samplePresets.find(p => p.id === 'krk_200ma_bounce');
    expect(krkPreset).toBeDefined();
    expect(krkPreset!.symbols).toContain('SPY');
    expect(krkPreset!.symbols).toContain('MSFT');
  });
});
