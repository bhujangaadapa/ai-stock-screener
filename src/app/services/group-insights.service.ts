import { Injectable, signal, computed } from '@angular/core';
import { GroupTradeInsight, InsightStatus } from '../models/group-insight.model';

const STORAGE_KEY = 'aura_whatsapp_group_insights';

@Injectable({
  providedIn: 'root'
})
export class GroupInsightsService {
  private readonly _insights = signal<GroupTradeInsight[]>([]);
  readonly insights = this._insights.asReadonly();

  // Computed summary metrics
  readonly totalCount = computed(() => this._insights().length);
  readonly pendingCount = computed(() => this._insights().filter(i => i.status === 'PENDING_TRIGGER').length);
  readonly activeCount = computed(() => this._insights().filter(i => i.status === 'ACTIVE').length);
  readonly targetHitCount = computed(() => this._insights().filter(i => i.status === 'TARGET_HIT').length);

  readonly membersList = computed(() => {
    const set = new Set<string>();
    this._insights().forEach(i => set.add(i.member));
    return Array.from(set);
  });

  constructor() {
    this.loadInsights();
  }

  private loadInsights(): void {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this._insights.set(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load group insights from localStorage:', e);
    }

    // Default Seed with KRK's WhatsApp trade insight from October 2026
    const initialSeed: GroupTradeInsight[] = [
      {
        id: 'krk-spy-200ma-01',
        member: '~ ~KRK',
        phoneOrHandle: '+1 (716) 430-4227',
        symbol: 'SPY',
        direction: 'LONG',
        setupType: 'Trendline Breakdown to 200 MA Retest',
        messageText: 'SPY if we break this trend line we are going to that 200 MA may be which would be a nice opportunity to long.',
        chartNotes: 'ThinkorSwim Daily Chart. Ascending support trendline is under pressure. 200-day Simple Moving Average (200 MA) serves as key institutional support zone below. MACD is cooling off into oversold.',
        currentPriceAtPost: 582.40,
        triggerPrice: 554.00, // 200 MA level
        targetPrice: 605.00,
        stopLossPrice: 544.50,
        status: 'PENDING_TRIGGER',
        date: '2026-10-16',
        time: '2:27 PM',
        source: 'WhatsApp',
        channelName: 'Alpha Swing Traders WA',
        votesUp: 14,
        tags: ['200 MA', 'Trendline Break', 'Dip Buyer', 'Index ETF']
      },
      {
        id: 'seed-nvda-breakout-02',
        member: 'Alex_Quant',
        phoneOrHandle: '@alex_trades',
        symbol: 'NVDA',
        direction: 'LONG',
        setupType: 'Bull Flag Breakout + AI Momentum',
        messageText: 'NVDA consolidation range tightening between $210 and $218. Looking for volume breakout above $220 with target $245.',
        chartNotes: 'Daily bull flag above 20 EMA. Danelfin AI Score 10/10. Relative volume surge on tech earnings anticipation.',
        currentPriceAtPost: 216.50,
        triggerPrice: 220.00,
        targetPrice: 245.00,
        stopLossPrice: 208.00,
        status: 'ACTIVE',
        date: '2026-10-15',
        time: '11:15 AM',
        source: 'WhatsApp',
        channelName: 'Alpha Swing Traders WA',
        votesUp: 9,
        tags: ['Bull Flag', 'AI Chip', 'Breakout']
      },
      {
        id: 'seed-tsla-reversal-03',
        member: 'MacroDave',
        phoneOrHandle: '+1 (415) 882-9011',
        symbol: 'TSLA',
        direction: 'LONG',
        setupType: 'Double Bottom Support Bounce',
        messageText: 'TSLA defending 50-day moving average. Daily RSI reset to 38. Good risk/reward for long swing into delivery numbers.',
        chartNotes: 'Oversold RSI dip with hammer candle off $235 horizontal support shelf.',
        currentPriceAtPost: 238.20,
        triggerPrice: 236.00,
        targetPrice: 268.00,
        stopLossPrice: 229.00,
        status: 'ACTIVE',
        date: '2026-10-14',
        time: '9:45 AM',
        source: 'WhatsApp',
        channelName: 'Alpha Swing Traders WA',
        votesUp: 11,
        tags: ['50 MA', 'RSI Oversold', 'Double Bottom']
      }
    ];

    this._insights.set(initialSeed);
    this.saveToStorage(initialSeed);
  }

  addInsight(insight: Omit<GroupTradeInsight, 'id' | 'date' | 'time' | 'votesUp'>): GroupTradeInsight {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newEntry: GroupTradeInsight = {
      ...insight,
      id: 'insight-' + Date.now(),
      date: dateStr,
      time: timeStr,
      votesUp: 1
    };

    const updated = [newEntry, ...this._insights()];
    this._insights.set(updated);
    this.saveToStorage(updated);
    return newEntry;
  }

  updateStatus(id: string, status: InsightStatus): void {
    const updated = this._insights().map(i => i.id === id ? { ...i, status } : i);
    this._insights.set(updated);
    this.saveToStorage(updated);
  }

  upvote(id: string): void {
    const updated = this._insights().map(i => i.id === id ? { ...i, votesUp: i.votesUp + 1 } : i);
    this._insights.set(updated);
    this.saveToStorage(updated);
  }

  deleteInsight(id: string): void {
    const updated = this._insights().filter(i => i.id !== id);
    this._insights.set(updated);
    this.saveToStorage(updated);
  }

  private saveToStorage(list: GroupTradeInsight[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save group insights to localStorage:', e);
    }
  }
}
