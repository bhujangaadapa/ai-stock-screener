# Aura AI • Institutional Stock Scanner & Screener

A standalone, institutional-grade replica of modern AI stock screener platforms (inspired by **Danelfin**, **AInvest**, and **Finviz Elite**), built with **Angular 20** (Standalone Components, Signals, RxJS) and **Firebase Cloud Firestore**.

---

## 🚀 Quick Start

### 1. Run the Development Server
```bash
npm start
```
The application will launch at **`http://localhost:4300/`**.

### 2. Build for Production
```bash
npm run build
```
Production assets are generated in `dist/ai-stock-screener`.

---

## 🌟 Key Features

### 1. Conversational AI Screener Prompt Bar
* Input natural language queries such as:
  * *"Find undervalued tech stocks with P/E < 25 and strong momentum"*
  * *"Safe dividend yields > 3.5% with low debt"*
  * *"Breakout semiconductor stocks near 52W high with heavy volume"*
  * *"Oversold dip-buys with RSI < 40"*
* Built-in natural language query parser (`AiScreenerService`) translates conversational queries into quantitative multi-factor filters and annotates matching stocks with AI rationale tags.

### 2. Danelfin-Style Multi-Factor AI Score (1 to 10)
* Every stock displays a composite AI Score (1-10) with an estimated probability of outperforming the S&P 500 benchmark over the next 60 trading days.
* Decomposed into 4 pillar sub-scores:
  * 📈 **Technical Score**: Price vs SMA 50/200 DMA trend, RSI 14 momentum, volume accumulation.
  * 💎 **Fundamental Score**: PEG ratio, ROE, Free Cash Flow yield, Debt/Equity solvency.
  * 🎯 **Sentiment Score**: Wall Street analyst price target upside %, consensus revisions.
  * 🛡️ **Risk Score**: Beta market sensitivity, drawdown variance, capital structure.

### 3. Finviz-Style Multi-View Data Grid
* Tabbed views:
  * **Overview**: Ticker, Name, Sector, Price, Change %, AI Score (1-10 badge), Market Cap, P/E, RSI, Volume, Sparkline.
  * **Valuation**: Trailing P/E, Forward P/E, PEG, P/S, Wall St Target Price, Upside %.
  * **Technicals**: RSI (14), SMA 50, SMA 200, Beta, 52-Week Range Bar.
  * **Financials**: ROE %, Debt/Equity, Free Cash Flow ($B), EPS Growth YoY %, Dividend Yield %.
* Instant column sorting (ascending / descending) on any metric.
* Export to CSV button for financial analysts.

### 4. Interactive Candlestick Charts & Technical Indicators
* Click **📊 Chart** on any ticker to launch the interactive financial charting modal.
* Displays daily OHLCV candlesticks with volume histogram bars.
* Overlays: **SMA 20**, **SMA 50**, **SMA 200** with toggle controls.
* Secondary oscillator panel: **RSI (14)** with overbought (70) and oversold (30) levels.
* Interactive crosshair and inspection HUD showing Date, Open, High, Low, Close, Volume on mouse hover.
* Timeframe toggles: 1W, 1M, 3M, 6M, 1Y.

### 5. AI Deep-Dive Investment Dossier Modal
* Click **🧠 Dossier** on any ticker for an institutional investment summary:
  * AI Conviction verdict and probability gauge.
  * 4-pillar sub-score progress bars.
  * 🟢 **AI Bullish Catalysts**: Detailed positive investment drivers.
  * 🔴 **Downside Risks & Vulnerabilities**: Sensitivity warnings.
  * 🧭 **Valuation Compass**: Current Price vs DCF Fair Value vs Wall Street Consensus Target.
  * Full fundamental ratio matrix.

### 6. S&P 500 Sector Heatmap
* Visual grid of all 11 market sectors color-coded by daily performance.
* Displays leading stock and tracked count for each sector.
* Clicking any sector card filters the screener instantly.

### 7. Firebase Cloud Firestore Live Persistence
* Real-time synchronization with Firestore `stocks` and `stock_watchlists` collections.
* **1-Click Database Seeder**: Click the **⚡ Seed Firestore** button in the header to batch-upload 100+ equities with financials and historical candlestick data directly to your Firestore database.
* Local fallback: Works instantly out-of-the-box even before Firebase credentials are configured.

---

## 📁 Project Architecture

```
ai-stock-screener/
├── package.json
├── angular.json
├── tsconfig.json
├── tsconfig.app.json
├── vitest.config.ts
├── README.md
└── src/
    ├── index.html
    ├── main.ts
    ├── styles.css
    ├── environments/
    │   └── environment.ts              (Firebase credentials & config)
    └── app/
        ├── app.config.ts               (Angular providers & Firebase app init)
        ├── app.ts                      (Root application component)
        ├── models/
        │   └── stock.model.ts          (Stock, AIScoreBreakdown, HistoricalCandle interfaces)
        ├── services/
        │   ├── ai-screener.service.ts      (NLP conversational query parser & filter engine)
        │   ├── quant-scoring.service.ts    (Danelfin-style 1-10 AI scoring algorithm)
        │   └── firestore-stock.service.ts  (Firestore CRUD, live listeners, seeder, watchlist)
        ├── data/
        │   └── stock-universe.data.ts  (Rich 100+ stock universe with OHLCV candle generator)
        └── components/
            ├── stock-scanner.component.ts      (Main dashboard, ticker tape, table, heatmap)
            ├── stock-chart-modal.component.ts  (Interactive candlestick & RSI chart modal)
            └── stock-detail-modal.component.ts (AI investment conviction dossier modal)
```
