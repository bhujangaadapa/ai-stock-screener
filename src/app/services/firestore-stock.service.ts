import { Injectable, inject, signal } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  setDoc, 
  getDocs, 
  writeBatch,
  docData
} from '@angular/fire/firestore';
import { Stock } from '../models/stock.model';
import { getBundledStockUniverse } from '../data/stock-universe.data';
import { QuantScoringService } from './quant-scoring.service';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FirestoreStockService {
  private firestore = inject(Firestore, { optional: true });
  private quantScorer = inject(QuantScoringService);

  // Reactive state signals
  readonly stocks = signal<Stock[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSeeding = signal<boolean>(false);
  readonly isFirestoreSynced = signal<boolean>(false);
  readonly seedMessage = signal<string>('');
  readonly watchlist = signal<string[]>(['NVDA', 'AAPL', 'LLY', 'JPM']);

  constructor() {
    this.initStockData();
    this.loadWatchlist();
  }

  private async initStockData() {
    // 1. Instantly prepare bundled high-fidelity dataset with calculated AI scores
    const bundled = getBundledStockUniverse().map(s => {
      const computedScore = this.quantScorer.computeAIScore(s);
      return {
        ...s,
        aiScore: computedScore
      };
    });

    // Populate in-memory state right away for zero latency
    this.stocks.set(bundled);
    this.isLoading.set(false);

    // 2. If Firestore is available, attempt real-time sync with 'stocks' collection
    if (this.firestore) {
      try {
        const stocksCol = collection(this.firestore, 'stocks');
        collectionData(stocksCol, { idField: 'id' }).pipe(
          catchError(err => {
            console.warn('Firestore live stocks connection fallback to in-memory:', err.message);
            return of([]);
          })
        ).subscribe(fireStocks => {
          if (fireStocks && fireStocks.length > 0) {
            // Merge with local candles if Firestore docs don't contain deep candle arrays
            const merged = (fireStocks as Stock[]).map(fs => {
              const localMatch = bundled.find(b => b.symbol === fs.symbol);
              return {
                ...fs,
                candles: fs.candles && fs.candles.length > 0 ? fs.candles : (localMatch?.candles || []),
                sparkline: fs.sparkline && fs.sparkline.length > 0 ? fs.sparkline : (localMatch?.sparkline || []),
                aiScore: fs.aiScore || this.quantScorer.computeAIScore(fs)
              };
            });
            this.stocks.set(merged);
            this.isFirestoreSynced.set(true);
          }
        });
      } catch (err) {
        console.warn('Could not initialize Firestore stock listener:', err);
      }
    }
  }

  /**
   * One-click database seeder: Uploads the entire rich stock dataset to Cloud Firestore.
   */
  async seedFirestoreDatabase(): Promise<boolean> {
    if (!this.firestore) {
      this.seedMessage.set('Firebase Firestore is not initialized.');
      return false;
    }

    this.isSeeding.set(true);
    this.seedMessage.set('Seeding 100+ equities to Firestore collection "stocks"...');

    try {
      const currentList = this.stocks();
      // Write in batches of 500
      const batch = writeBatch(this.firestore);
      for (const stock of currentList) {
        const stockRef = doc(this.firestore, 'stocks', stock.symbol);
        // Exclude huge candle history from root doc to keep Firestore snappy
        const { candles, ...summaryDoc } = stock;
        batch.set(stockRef, {
          ...summaryDoc,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      await batch.commit();
      this.isFirestoreSynced.set(true);
      this.seedMessage.set(`Successfully seeded ${currentList.length} equities to Firestore!`);
      setTimeout(() => this.seedMessage.set(''), 5000);
      return true;
    } catch (err: any) {
      console.error('Error seeding to Firestore:', err);
      this.seedMessage.set(`Seeding error: ${err.message || 'Permission denied'}`);
      return false;
    } finally {
      this.isSeeding.set(false);
    }
  }

  /**
   * Watchlist management with local and Firestore persistence.
   */
  private loadWatchlist() {
    try {
      const saved = localStorage.getItem('ai_screener_watchlist');
      if (saved) {
        this.watchlist.set(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not read watchlist from localStorage', e);
    }
  }

  toggleWatchlist(symbol: string) {
    const current = this.watchlist();
    const updated = current.includes(symbol)
      ? current.filter(s => s !== symbol)
      : [...current, symbol];
    
    this.watchlist.set(updated);
    try {
      localStorage.setItem('ai_screener_watchlist', JSON.stringify(updated));
    } catch (e) {}

    // Also persist to Firestore if available
    if (this.firestore) {
      try {
        const wlDoc = doc(this.firestore, 'stock_watchlists', 'default');
        setDoc(wlDoc, { symbols: updated, updatedAt: new Date().toISOString() }, { merge: true })
          .catch(err => console.warn('Firestore watchlist sync notice:', err.message));
      } catch (err) {}
    }
  }

  isInWatchlist(symbol: string): boolean {
    return this.watchlist().includes(symbol);
  }

  /**
   * Simulates a real-time price tick for dynamic visual testing.
   */
  simulateTick(symbol: string) {
    const list = this.stocks();
    const idx = list.findIndex(s => s.symbol === symbol);
    if (idx === -1) return;

    const stock = list[idx];
    const delta = (Math.random() * 1.5 - 0.75);
    const newPrice = Math.max(1, Math.round((stock.price + delta) * 100) / 100);
    const change = Math.round((stock.change + delta) * 100) / 100;
    const changePercent = Math.round(((change / (newPrice - change)) * 100) * 100) / 100;
    
    const updatedSparkline = [...stock.sparkline.slice(1), newPrice];
    const updatedStock: Stock = {
      ...stock,
      price: newPrice,
      change,
      changePercent,
      sparkline: updatedSparkline
    };

    const nextList = [...list];
    nextList[idx] = updatedStock;
    this.stocks.set(nextList);
  }
}
