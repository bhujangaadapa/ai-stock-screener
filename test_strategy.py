"""
AURA AI QUANT ENGINE • PYTHON STRATEGY EXPORT
Stack:
  - Data: yfinance
  - Indicators: pandas-ta (or pandas-ta-classic)
  - Backtest Engine: backtesting.py
  - Portfolio Analytics: quantstats
"""

import yfinance as yf
import pandas as pd

# Support both pandas_ta and pandas_ta_classic (Python 3.11+ drop-in)
try:
    import pandas_ta as ta
except ModuleNotFoundError:
    import pandas_ta_classic as ta

from backtesting import Backtest, Strategy
from backtesting.lib import crossover
import quantstats as qs

# 1. Fetch Market Data via yfinance
symbol = 'NVDA'
print(f"Downloading historical OHLCV data for {symbol}...")
df = yf.download(symbol, period='1y', interval='1d')
df.columns = [col[0] if isinstance(col, tuple) else col for col in df.columns]

# Ensure column names match backtesting.py conventions
df = df.rename(columns={
    'Open': 'Open',
    'High': 'High',
    'Low': 'Low',
    'Close': 'Close',
    'Volume': 'Volume'
})

# 2. Strategy Definition via backtesting.py
class DANELFINAIMOMENTUMStrategy(Strategy):
    # Strategy Hyperparameters
    fast_period = 20
    slow_period = 50
    stop_loss_pct = 0.06
    take_profit_pct = 0.16

    def init(self):
        # Calculate technical indicators using pandas-ta
        close = pd.Series(self.data.Close)
        self.fast_sma = self.I(ta.sma, close, length=self.fast_period)
        self.slow_sma = self.I(ta.sma, close, length=self.slow_period)
        self.rsi = self.I(ta.rsi, close, length=14)

    def next(self):
        price = self.data.Close[-1]

        # Entry Rule
        if not self.position:
            if crossover(self.fast_sma, self.slow_sma) or (self.rsi[-1] < 45):
                sl = price * (1 - self.stop_loss_pct)
                tp = price * (1 + self.take_profit_pct)
                self.buy(sl=sl, tp=tp)

        # Exit Rule
        elif crossover(self.slow_sma, self.fast_sma) or (self.rsi[-1] > 75):
            self.position.close()

# 3. Execute Historical Backtest
bt = Backtest(
    df,
    DANELFINAIMOMENTUMStrategy,
    cash=100000,
    commission=0.001,  # 0.1% fee
    exclusive_orders=True
)

stats = bt.run()
print("\n=== BACKTESTING.PY PERFORMANCE RESULTS ===")
print(stats)

# Interactive Chart Output (Saved to file, open in browser)
bt.plot(filename='strategy_backtest.html', open_browser=False)
print("\n[SUCCESS] Interactive HTML backtest visualization saved to 'strategy_backtest.html'!")
