import { Component } from '@angular/core';
import { StockScannerComponent } from './components/stock-scanner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [StockScannerComponent],
  template: `<app-stock-scanner></app-stock-scanner>`
})
export class App {}
