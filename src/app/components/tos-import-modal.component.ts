import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TosIntegrationService, TosSamplePreset } from '../services/tos-integration.service';

@Component({
  selector: 'app-tos-import-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="brand-badge">
            <span class="tos-icon">📥</span>
            <div>
              <div class="header-tag">THINKORSWIM SCANNER & WATCHLIST IMPORTER</div>
              <h2 class="title">Import TOS Scans into AURA AI</h2>
            </div>
          </div>
          <button class="close-btn" (click)="close.emit()">✕</button>
        </div>

        <p class="modal-intro">
          Export any watchlist or study scanner from ThinkorSwim desktop (<strong>Right-click › Export to CSV</strong>) or paste tickers directly. AURA AI will run Danelfin-style multi-factor scores, 200 SMA dip absorption, and earnings models across all of them.
        </p>

        <!-- Mode Tabs -->
        <div class="tab-selector">
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === 'upload'" 
            (click)="activeTab.set('upload')">
            📁 Upload TOS CSV / TXT
          </button>
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === 'paste'" 
            (click)="activeTab.set('paste')">
            ✍️ Quick Paste / thinkScript
          </button>
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === 'presets'" 
            (click)="activeTab.set('presets')">
            ⚡ Quick Presets
          </button>
        </div>

        <!-- TAB 1: CSV FILE DROPZONE -->
        <div *ngIf="activeTab() === 'upload'" class="tab-pane">
          <div 
            class="dropzone" 
            [class.dragover]="isDragging()"
            (dragover)="onDragOver($event)"
            (dragleave)="isDragging.set(false)"
            (drop)="onFileDrop($event)"
            (click)="fileInput.click()">
            <input 
              #fileInput 
              type="file" 
              accept=".csv,.txt" 
              style="display: none" 
              (change)="onFileInputChange($event)" />
            <span class="drop-icon">📄</span>
            <div class="drop-title">
              {{ selectedFileName() ? selectedFileName() : 'Click or Drag & Drop ThinkorSwim CSV export here' }}
            </div>
            <p class="drop-hint">Supports standard TOS Watchlist CSV, thinkScript study export, or plain ticker lists.</p>
          </div>
        </div>

        <!-- TAB 2: QUICK PASTE -->
        <div *ngIf="activeTab() === 'paste'" class="tab-pane">
          <textarea 
            class="paste-textarea" 
            rows="6" 
            placeholder="Paste symbols separated by comma, space, or newline (e.g. SPY, QQQ, MSFT, NVDA, COIN, PLTR, ARM)..." 
            [(ngModel)]="rawTextContent"
            (input)="onTextInput()">
          </textarea>
        </div>

        <!-- TAB 3: POPULAR TOS PRESETS -->
        <div *ngIf="activeTab() === 'presets'" class="tab-pane presets-list">
          <div 
            *ngFor="let p of presets" 
            class="preset-card" 
            (click)="loadPreset(p)">
            <div class="pc-top">
              <span class="pc-name">{{ p.name }}</span>
              <span class="pc-count">{{ p.symbols.length }} Equities</span>
            </div>
            <p class="pc-desc">{{ p.description }}</p>
            <div class="pc-syms">
              <span *ngFor="let s of p.symbols.slice(0, 7)" class="mini-tag">{{ s }}</span>
              <span *ngIf="p.symbols.length > 7" class="mini-tag more">+{{ p.symbols.length - 7 }} more</span>
            </div>
          </div>
        </div>

        <!-- Parsed Symbols Preview -->
        <div class="preview-section" *ngIf="parsedSymbols().length > 0">
          <div class="preview-header">
            <span>Detected <strong>{{ parsedSymbols().length }}</strong> Tickers:</span>
            <button class="clear-preview-btn" (click)="clearSymbols()">Clear</button>
          </div>
          <div class="symbols-chip-cloud">
            <span *ngFor="let sym of parsedSymbols()" class="symbol-chip">
              {{ sym }}
            </span>
          </div>
        </div>

        <!-- Modal Footer Actions -->
        <div class="modal-footer">
          <button class="btn-cancel" (click)="close.emit()">Cancel</button>
          <button 
            class="btn-import" 
            [disabled]="parsedSymbols().length === 0" 
            (click)="executeImport()">
            🚀 Run AURA AI on {{ parsedSymbols().length }} TOS Equities
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.82);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .modal-card {
      background: #090e17;
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 1.25rem;
      width: 100%;
      max-width: 680px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(16, 185, 129, 0.15);
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-badge {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .tos-icon { font-size: 1.75rem; }
    .header-tag {
      font-size: 0.68rem;
      font-weight: 800;
      color: #10b981;
      letter-spacing: 0.05rem;
    }
    .title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #f8fafc;
      margin: 0;
    }
    .close-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .close-btn:hover { background: rgba(255, 255, 255, 0.15); color: white; }

    .modal-intro {
      font-size: 0.82rem;
      color: #94a3b8;
      margin: 0;
      line-height: 1.45;
    }
    .modal-intro strong { color: #f1f5f9; }

    /* Mode Tabs */
    .tab-selector {
      display: flex;
      gap: 0.4rem;
      background: #111827;
      padding: 0.25rem;
      border-radius: 0.6rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 0.45rem 0.75rem;
      border-radius: 0.45rem;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn:hover { color: #f8fafc; }
    .tab-btn.active {
      background: #1e293b;
      color: #10b981;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    }

    /* Dropzone */
    .dropzone {
      border: 2px dashed rgba(16, 185, 129, 0.35);
      background: rgba(16, 185, 129, 0.04);
      border-radius: 0.85rem;
      padding: 2rem 1.5rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
    }
    .dropzone:hover, .dropzone.dragover {
      background: rgba(16, 185, 129, 0.1);
      border-color: #10b981;
      transform: translateY(-2px);
    }
    .drop-icon { font-size: 2.2rem; }
    .drop-title { font-size: 0.95rem; font-weight: 700; color: #f8fafc; }
    .drop-hint { font-size: 0.75rem; color: #94a3b8; margin: 0; }

    /* Paste area */
    .paste-textarea {
      width: 100%;
      box-sizing: border-box;
      background: #030712;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 0.75rem;
      padding: 0.85rem;
      color: #f1f5f9;
      font-family: monospace;
      font-size: 0.82rem;
      outline: none;
      resize: vertical;
    }
    .paste-textarea:focus { border-color: #10b981; }

    /* Presets list */
    .presets-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .preset-card {
      background: #030712;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.75rem;
      padding: 0.85rem 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .preset-card:hover {
      border-color: rgba(16, 185, 129, 0.4);
      background: rgba(16, 185, 129, 0.06);
      transform: translateX(3px);
    }
    .pc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; }
    .pc-name { font-size: 0.9rem; font-weight: 700; color: #f8fafc; }
    .pc-count { font-size: 0.72rem; font-weight: 800; color: #10b981; }
    .pc-desc { font-size: 0.75rem; color: #94a3b8; margin: 0 0 0.5rem; }
    .pc-syms { display: flex; gap: 0.3rem; flex-wrap: wrap; }
    .mini-tag {
      font-size: 0.65rem;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.06);
      color: #cbd5e1;
      padding: 0.1rem 0.4rem;
      border-radius: 0.3rem;
    }
    .mini-tag.more { color: #38bdf8; background: rgba(56, 189, 248, 0.12); }

    /* Preview section */
    .preview-section {
      background: #030712;
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
    }
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      font-size: 0.78rem;
      color: #94a3b8;
    }
    .preview-header strong { color: #38bdf8; }
    .clear-preview-btn {
      background: transparent;
      border: none;
      color: #ef4444;
      font-size: 0.72rem;
      cursor: pointer;
    }
    .symbols-chip-cloud {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
      max-height: 110px;
      overflow-y: auto;
    }
    .symbol-chip {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #10b981;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.15rem 0.5rem;
      border-radius: 0.35rem;
      letter-spacing: 0.03rem;
    }

    /* Modal footer */
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    .btn-cancel {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cbd5e1;
      padding: 0.5rem 1rem;
      border-radius: 0.6rem;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-import {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      padding: 0.55rem 1.25rem;
      border-radius: 0.6rem;
      font-size: 0.85rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);
      transition: all 0.2s;
    }
    .btn-import:hover:not(:disabled) {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }
    .btn-import:disabled { opacity: 0.45; cursor: not-allowed; }
  `]
})
export class TosImportModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() imported = new EventEmitter<string[]>();

  private tosService = inject(TosIntegrationService);

  activeTab = signal<'upload' | 'paste' | 'presets'>('upload');
  isDragging = signal<boolean>(false);
  selectedFileName = signal<string>('');
  rawTextContent = '';
  parsedSymbols = signal<string[]>([]);

  readonly presets = this.tosService.samplePresets;

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onFileDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(false);
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      this.readFile(file);
    }
  }

  onFileInputChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.readFile(input.files[0]);
    }
  }

  private readFile(file: File): void {
    this.selectedFileName.set(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const symbols = this.tosService.parseTosExport(text);
      this.parsedSymbols.set(symbols);
    };
    reader.readAsText(file);
  }

  onTextInput(): void {
    const symbols = this.tosService.parseTosExport(this.rawTextContent);
    this.parsedSymbols.set(symbols);
  }

  loadPreset(preset: TosSamplePreset): void {
    this.parsedSymbols.set([...preset.symbols]);
  }

  clearSymbols(): void {
    this.parsedSymbols.set([]);
    this.selectedFileName.set('');
    this.rawTextContent = '';
  }

  executeImport(): void {
    const syms = this.parsedSymbols();
    if (syms.length > 0) {
      this.tosService.setImportedSymbols(syms);
      this.imported.emit(syms);
      this.close.emit();
    }
  }
}
