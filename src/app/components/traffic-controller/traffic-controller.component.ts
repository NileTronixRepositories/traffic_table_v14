import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import {
  filter,
  map,
  take,
  timeout,
  catchError,
  takeUntil,
} from 'rxjs/operators';
import { SignalRServiceService } from 'src/app/services/SignalR/signal-rservice.service';
import { environment } from 'src/environments/environment';

export interface Traffic {
  id: number;
  ipAddress?: string;
  name: string;
  status?: 'R' | 'G' | 'Y';
  active?: boolean;
  L1?: 'R' | 'G' | 'Y';
  L2?: 'R' | 'G' | 'Y';
  T1?: number;
  T2?: number;
  T?: number;
  Latitude?: string | null;
  Longitude?: string | null;
  LightPatternId: number;
}

export interface PatternDto {
  ID: number;
  Name: string;
  Red: number;
  Green: number;
  Amber: number;
  GreenAmberOverlab?: boolean;
  Pedstrain?: boolean;
  ShowPedstrainCounter?: boolean;
  SignTemplates?: any;
}

export interface Pattern {
  id: number;
  name: string;
  red: number;
  green: number;
  amber: number;
  overlap?: boolean;
  pedstrain?: boolean;
  showPedstrainCounter?: boolean;
  signTemplates?: any;
}

@Component({
  selector: 'app-traffic-controller',
  templateUrl: './traffic-controller.component.html',
  styleUrls: ['./traffic-controller.component.css'],
})
export class TrafficControllerComponent implements OnInit, OnDestroy {
  traffics: Traffic[] = [];
  searchTerm = '';
  pageSize = 10;
  currentPage = 1;

  // Patterns
  patterns: Pattern[] = [];
  /** يحتفظ بالـ patternId المختار لكل صف (key = traffic.id) */
  selectedPatternId: Record<number, number | null> = {};
  isLoadingPatterns = false;
  patternLoadError = '';

  // Popup
  popupVisible = false;
  popupX = 0;
  popupY = 0;
  popupData: Traffic | null = null;
  popupDisconnected = false;

  // Timer & control
  private interval: any;
  private countingForId: number | null = null;

  // Filters/UI
  statusColors: Record<'RED' | 'GREEN' | 'YELLOW', string> = {
    RED: '#FF4757',
    GREEN: '#2ED573',
    YELLOW: '#FFA502',
  };
  activeLabel = 'Active';
  inactiveLabel = 'Inactive';
  signalColors: Array<'RED' | 'GREEN' | 'YELLOW'> = ['RED', 'GREEN', 'YELLOW'];
  statusFilter: Record<'RED' | 'GREEN' | 'YELLOW', boolean> = {
    RED: true,
    GREEN: true,
    YELLOW: true,
  };
  activeFilter: 'ALL' | 'ACTIVE' | 'INACTIVE' = 'ALL';
  showStatusFilter = false;
  showActiveFilter = false;

  private destroy$ = new Subject<void>();

  constructor(
    private signalR: SignalRServiceService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // 1) Load Patterns (قد توصل قبل/بعد الـ traffics — الكود آمن للحالتين)
    this.loadPatterns();

    // 2) Load table (control boxes)
    this.signalR
      .getControlBoxes()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.traffics = data;

        // اضبط القيمة الافتراضية لكل صف من LightPatternId لو مفيش اختيار سابق
        for (const t of data) {
          if (this.selectedPatternId[t.id] === undefined) {
            const lp = Number(t.LightPatternId);
            this.selectedPatternId[t.id] = Number.isFinite(lp) ? lp : null;
          }
        }
      });

    // Connection state
    this.signalR.connectionState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        if (state !== 'connected') {
          this.popupDisconnected = true;
          this.stopCounters();
        } else {
          this.popupDisconnected = false;
        }
      });

    // Incoming messages
    this.signalR.messages$
      .pipe(
        takeUntil(this.destroy$),
        map((m) => this.parseIncoming(m?.message))
      )
      .subscribe((action) => {
        if (!action) return;
        const t = this.traffics.find((x) => x.id === action.id);
        if (t) {
          t.L1 = action.L1;
          t.L2 = action.L2;
          t.T1 = action.T1;
          t.T2 = action.T2;
          t.T = this.deriveT(action.T1, action.T2, t.T);
          t.status = action.L1;
        }
        if (this.popupData?.id === action.id) {
          this.popupData = { ...(t ?? this.popupData) };
          this.countingForId = action.id;
          if (!this.popupDisconnected) this.startDualCounters();
        } else {
          this.stopCounters();
        }
      });
  }

  ngOnDestroy() {
    this.stopCounters();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------- Patterns ----------
  private loadPatterns() {
    this.isLoadingPatterns = true;
    this.patternLoadError = '';
    this.http
      .get<PatternDto[]>(`${environment.baseUrl}/api/Pattern/list`)
      .pipe(
        map((rows) =>
          rows.map((r) => ({
            id: r.ID,
            name: r.Name,
            red: Number(r.Red) || 0,
            green: Number(r.Green) || 0,
            amber: Number(r.Amber) || 0,
            overlap: !!r.GreenAmberOverlab,
            pedstrain: !!r.Pedstrain,
            showPedstrainCounter: !!r.ShowPedstrainCounter,
            signTemplates: r.SignTemplates,
          }))
        ),
        catchError((err) => {
          console.error('Failed to load patterns', err);
          this.patternLoadError = 'Failed to load patterns';
          return of<Pattern[]>([]);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((list) => {
        this.patterns = list;
        this.isLoadingPatterns = false;
        // مفيش لزوم نعمل re-map للـ selectedPatternId هنا — Angular هيطابق بالأرقام تلقائيًا
      });
  }

  onPatternSelected(row: Traffic, patternId: number | null) {
    this.selectedPatternId[row.id] = patternId ?? null;
    if (patternId != null) row.LightPatternId = patternId; // تحديث محلي اختياري
  }

  // ---------- Apply (POST /signals/apply-current) ----------
  /** يرسل فقط الحقول غير null/undefined */
  private compact<T extends object>(obj: T): Partial<T> {
    const out: Partial<T> = {};
    for (const k of Object.keys(obj) as (keyof T)[]) {
      const v = obj[k];
      if (v !== null && v !== undefined) out[k] = v;
    }
    return out;
  }

  applySelected(row: Traffic) {
    const url = `${environment.baseUrl}/signals/apply-current`;
    const lightPatternId = this.selectedPatternId[row.id] ?? undefined;

    const req = this.compact({
      SignId: row.id ?? undefined,
      Ip: row.ipAddress ?? undefined,
      LightPatternId: lightPatternId,
    });

    this.http.post(url, req).subscribe({
      next: (res)=> {

        console.log('ApplyCurrent success', res)
        alert("Apply  Successfully")
      } ,
      error: (err) => {
console.error('ApplyCurrent error', err),
alert("Apply Current Error")

      }
    });
  }

  // ---------- Popup / timers ----------
  applyCurrent(row: Traffic, event: MouseEvent) {
    this.showPopup(row, event);
    const id = row.id;
    const url = `${environment.baseUrl}/signals/apply-current`;
    const body = { SignId: id };

    this.signalR.messages$
      .pipe(
        takeUntil(this.destroy$),
        map((m) => this.parseIncoming(m?.message)),
        filter(
          (
            a
          ): a is {
            id: number;
            L1: 'R' | 'G' | 'Y';
            L2: 'R' | 'G' | 'Y';
            T1?: number;
            T2?: number;
          } => !!a && a.id === id
        ),
        take(1),
        timeout({ first: 8000 }),
        catchError(() => of(null))
      )
      .subscribe(() => {});

    this.http.post<any>(url, body).subscribe({
      next: (res) => console.log('POST Success', res),
      error: (err) => console.error('POST Error', err),
    });
  }

  private parseIncoming(
    raw?: string
  ):
    | {
        id: number;
        L1: 'R' | 'G' | 'Y';
        L2: 'R' | 'G' | 'Y';
        T1?: number;
        T2?: number;
      }
    | null {
    if (!raw) return null;
    try {
      const obj = JSON.parse(raw);
      const id = Number(
        obj.id ??
          obj.ID ??
          obj.signId ??
          obj.SignId ??
          obj.signedId ??
          obj.SignedId
      );
      const L1 = (obj.L1 ?? obj.status1 ?? obj.status) as 'R' | 'G' | 'Y';
      const L2 = (obj.L2 ?? obj.status2) as 'R' | 'G' | 'Y';
      const _T1 = Number(obj.T1);
      const _T2 = Number(obj.T2);

      if (!Number.isFinite(id)) return null;
      const ok = (v: any) => v === 'R' || v === 'G' || v === 'Y';

      return {
        id,
        L1: ok(L1) ? L1 : 'R',
        L2: ok(L2) ? L2 : 'R',
        T1: Number.isFinite(_T1) && _T1 >= 0 ? _T1 : undefined,
        T2: Number.isFinite(_T2) && _T2 >= 0 ? _T2 : undefined,
      };
    } catch {
      return null;
    }
  }

  private deriveT(T1?: number, T2?: number, fallback?: number) {
    if (typeof T1 === 'number' || typeof T2 === 'number') {
      return Math.max(T1 ?? 0, T2 ?? 0);
    }
    return fallback;
  }

  showPopup(traffic: Traffic, event: MouseEvent) {
    this.popupData = traffic;
    this.popupVisible = true;
    this.updatePopupPosition(event);
    this.stopCounters();
  }

  hidePopup() {
    this.popupVisible = false;
    this.popupData = null;
    this.stopCounters();
  }

  movePopup(event: MouseEvent) {
    if (this.popupVisible) this.updatePopupPosition(event);
  }

  private updatePopupPosition(event: MouseEvent) {
    const offset = 5,
      pw = 280,
      ph = 210;
    let x = event.clientX + offset,
      y = event.clientY - ph - offset;
    if (x + pw > window.innerWidth) x = event.clientX - pw - offset;
    if (y < 0) y = event.clientY + offset;
    this.popupX = x + window.scrollX;
    this.popupY = y + window.scrollY;
  }

  private startDualCounters() {
    this.stopCounters();
    if (this.popupDisconnected) return;
    if (!this.popupData || this.countingForId !== this.popupData.id) return;

    let t1 =
      typeof this.popupData.T1 === 'number' ? this.popupData.T1! : undefined;
    let t2 =
      typeof this.popupData.T2 === 'number' ? this.popupData.T2! : undefined;

    if ((t1 ?? 0) <= 0 && (t2 ?? 0) <= 0) return;

    this.interval = setInterval(() => {
      if (this.popupDisconnected || this.countingForId !== this.popupData?.id) {
        this.stopCounters();
        return;
      }
      if (typeof t1 === 'number' && t1 > 0) {
        t1--;
        this.popupData!.T1 = t1;
      }
      if (typeof t2 === 'number' && t2 > 0) {
        t2--;
        this.popupData!.T2 = t2;
      }
      if ((t1 ?? 0) <= 0 && (t2 ?? 0) <= 0) {
        this.stopCounters();
      }
    }, 1000);
  }

  private stopCounters() {
    clearInterval(this.interval);
    this.countingForId = null;
  }

  mapSignalColor(
    color: 'R' | 'G' | 'Y' | undefined
  ): 'RED' | 'GREEN' | 'YELLOW' {
    return color === 'G' ? 'GREEN' : color === 'Y' ? 'YELLOW' : 'RED';
  }

  getEmoji(c: 'RED' | 'GREEN' | 'YELLOW') {
    const map: Record<'RED' | 'GREEN' | 'YELLOW', string> = {
      RED: '\u{1F534}',
      GREEN: '\u{1F7E2}',
      YELLOW: '\u{1F7E1}',
    };
    return map[c];
  }

  get filteredTraffics(): Traffic[] {
    return this.traffics.filter((t) => {
      const matchesSearch =
        t.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        t.id.toString().includes(this.searchTerm);
      const mappedStatus = this.mapSignalColor(t.status);
      const matchesStatus = this.statusFilter[mappedStatus];
      const matchesActive =
        this.activeFilter === 'ALL' ||
        (this.activeFilter === 'ACTIVE' && t.active) ||
        (this.activeFilter === 'INACTIVE' && !t.active);
      return matchesSearch && matchesStatus && matchesActive;
    });
  }

  get paginatedTraffics(): Traffic[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTraffics.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTraffics.length / this.pageSize) || 1;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  toggleStatusFilter(s: 'RED' | 'GREEN' | 'YELLOW') {
    this.statusFilter[s] = !this.statusFilter[s];
  }

  get allStatusSelected() {
    return Object.values(this.statusFilter).every((v) => v);
  }

  get someStatusSelected() {
    return (
      Object.values(this.statusFilter).some((v) => v) && !this.allStatusSelected
    );
  }

  toggleAllStatusFilters() {
    const all = this.allStatusSelected;
    (
      Object.keys(this.statusFilter) as Array<'RED' | 'GREEN' | 'YELLOW'>
    ).forEach((k) => (this.statusFilter[k] = !all));
  }

  toggleStatusFilterDropdown() {
    this.showStatusFilter = !this.showStatusFilter;
    if (this.showStatusFilter) this.showActiveFilter = false;
  }

  toggleActiveFilterDropdown() {
    this.showActiveFilter = !this.showActiveFilter;
    if (this.showActiveFilter) this.showStatusFilter = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.status-filter-dropdown'))
      this.showStatusFilter = false;
    if (!target.closest('.active-filter-dropdown'))
      this.showActiveFilter = false;
  }
}
