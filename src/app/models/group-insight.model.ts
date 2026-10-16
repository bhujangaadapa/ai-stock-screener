export type TradeDirection = 'LONG' | 'SHORT' | 'WATCH';
export type InsightStatus = 'PENDING_TRIGGER' | 'ACTIVE' | 'TARGET_HIT' | 'STOPPED_OUT' | 'INVALIDATED';
export type InsightSource = 'WhatsApp' | 'Discord' | 'Telegram' | 'X/Twitter' | 'Direct Note';

export interface GroupTradeInsight {
  id: string;
  member: string; // e.g. "~ ~KRK"
  phoneOrHandle?: string; // e.g. "+1 (716) 430-4227"
  symbol: string; // e.g. "SPY"
  direction: TradeDirection; // LONG
  setupType: string; // e.g. "Trendline Breakdown to 200 MA Retest"
  messageText: string; // The verbatim WhatsApp message
  chartNotes: string; // Analysis of indicators (200 MA, MACD, Volume)
  currentPriceAtPost: number; // e.g. 582.50
  triggerPrice?: number; // e.g. 555.00 (200 MA zone)
  targetPrice?: number; // e.g. 600.00
  stopLossPrice?: number; // e.g. 542.00
  status: InsightStatus;
  date: string;
  time: string;
  source: InsightSource;
  channelName?: string; // e.g. "Alpha Traders WhatsApp"
  imageUrl?: string;
  votesUp: number;
  tags: string[];
}
