import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { filter, map, take, timeout, catchError, takeUntil } from 'rxjs/operators';
import { SignalRServiceService } from 'src/app/services/SignalR/signal-rservice.service';

export interface Traffic {
  id: number;
  ipAddress?: string;
  name: string;
  status?: 'R' | 'G' | 'Y';
  active?: boolean;
  L1?: 'R' | 'G' | 'Y';
  L2?: 'R' | 'G' | 'Y';
  /** مؤقّتان منفصلان لكل لامبة */
  T1?: number;
  T2?: number;
  /** اختياري: للجدول فقط */
  T?: number;
  Latitude?: string | null;
  Longitude?: string | null;
}

@Component({
  selector: 'app-traffic-signal',
  templateUrl: './traffic-signal.component.html',
  styleUrls: ['./traffic-signal.component.css'],
})
export class TrafficSignalComponent implements OnInit, OnDestroy {
  // Data
  traffics: Traffic[] = [];
  searchTerm = '';
  pageSize = 10;
  currentPage = 1;

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

  constructor(private signalR: SignalRServiceService, private http: HttpClient) {}

  ngOnInit() {
    // جدول
    this.signalR
      .getControlBoxes()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => (this.traffics = data));

    // حالة الاتصال
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

    // استقبال الرسائل العامة
    this.signalR.messages$
      .pipe(takeUntil(this.destroy$), map((m) => this.parseIncoming(m?.message)))
      .subscribe((action) => {
        if (!action) return;
        console.log(action)
        // حدّث الصف
        const t = this.traffics.find((x) => x.id === action.id);
        if (t) {
          t.L1 = action.L1;
          t.L2 = action.L2;
          t.T1 = action.T1;
          t.T2 = action.T2;
          t.T = this.deriveT(action.T1, action.T2, t.T);
          t.status = action.L1;
        }
        // لو الـ Popup مفتوح لنفس الـ id → حدّثه وابدأ العدّادين
        if (this.popupData?.id === action.id) {
          this.popupData = { ...(t ?? this.popupData) };
          this.countingForId = action.id;
          if (!this.popupDisconnected) this.startDualCounters();
        } else {
          // رسالة لغير نفس الـ id → أوقف العدّادين
          this.stopCounters();
        }
      });
  }

  ngOnDestroy() {
    this.stopCounters();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Click row → POST + فتح Popup (بدون عدّاد)
  applyCurrent(row: Traffic, event: MouseEvent) {
    this.showPopup(row, event);
    const id = row.id;
    const url = 'http://192.168.1.43/TLC/signals/apply-current';
    const body = { SignId: id };

    // (اختياري) انتظار أول رسالة لنفس الـ id
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
      .subscribe(() => {
        // التحديث بيتم في الاشتراك العام
      });

    this.http.post<any>(url, body).subscribe({
      next: (res) => console.log(':white_tick: POST Success', res),
      error: (err) => console.error(':x: POST Error', err),
    });
  }

  // Parse رسالة SignalR
  private parseIncoming(raw?: string):
    | { id: number; L1: 'R' | 'G' | 'Y'; L2: 'R' | 'G' | 'Y'; T1?: number; T2?: number }
    | null {
    if (!raw) return null;
    try {
      const obj = JSON.parse(raw);
      const id = Number(
        obj.id ?? obj.ID ?? obj.signId ?? obj.SignId ?? obj.signedId ?? obj.SignedId
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

  /** اشتقاق T اختياري للجدول فقط */
  private deriveT(T1?: number, T2?: number, fallback?: number) {
    if (typeof T1 === 'number' || typeof T2 === 'number') {
      return Math.max(T1 ?? 0, T2 ?? 0);
    }
    return fallback;
  }

  // Popup & dual timers
  showPopup(traffic: Traffic, event: MouseEvent) {
    this.popupData = traffic;
    this.popupVisible = true;
    this.updatePopupPosition(event);
    this.stopCounters(); // لا تبدأ عدّادين عند الفتح
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

  /** المؤقّت الآن يحدّث T1 و T2 معًا */
  private startDualCounters() {
    this.stopCounters();
    if (this.popupDisconnected) return;
    if (!this.popupData || this.countingForId !== this.popupData.id) return;

    let t1 = typeof this.popupData.T1 === 'number' ? this.popupData.T1! : undefined;
    let t2 = typeof this.popupData.T2 === 'number' ? this.popupData.T2! : undefined;

    // لو مفيش أي مؤقّت، مفيش داعي للتشغيل
    if ((t1 ?? 0) <= 0 && (t2 ?? 0) <= 0) return;

    this.interval = setInterval(() => {
      if (this.popupDisconnected || this.countingForId !== this.popupData?.id) {
        this.stopCounters();
        return;
      }
      // قلّل T1
      if (typeof t1 === 'number' && t1 > 0) {
        t1--;
        this.popupData!.T1 = t1;
      }
      // قلّل T2
      if (typeof t2 === 'number' && t2 > 0) {
        t2--;
        this.popupData!.T2 = t2;
      }
      // لو الاتنين خلّصوا → أوقف
      if ((t1 ?? 0) <= 0 && (t2 ?? 0) <= 0) {
        this.stopCounters();
      }
    }, 1000);
  }

  private stopCounters() {
    clearInterval(this.interval);
    this.countingForId = null;
  }

  // Helpers
  mapSignalColor(color: 'R' | 'G' | 'Y' | undefined): 'RED' | 'GREEN' | 'YELLOW' {
    return color === 'G' ? 'GREEN' : color === 'Y' ? 'YELLOW' : 'RED';
  }

getEmoji(c: 'RED' | 'GREEN' | 'YELLOW') {
  // 🔴 U+1F534, 🟢 U+1F7E2, 🟡 U+1F7E1
  const map: Record<'RED'|'GREEN'|'YELLOW', string> = {
    RED: '\u{1F534}',    // 🔴
    GREEN: '\u{1F7E2}',  // 🟢
    YELLOW: '\u{1F7E1}', // 🟡
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
    return Object.values(this.statusFilter).some((v) => v) && !this.allStatusSelected;
  }

  toggleAllStatusFilters() {
    const all = this.allStatusSelected;
    (Object.keys(this.statusFilter) as Array<'RED' | 'GREEN' | 'YELLOW'>).forEach(
      (k) => (this.statusFilter[k] = !all)
    );
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
    if (!target.closest('.status-filter-dropdown')) this.showStatusFilter = false;
    if (!target.closest('.active-filter-dropdown')) this.showActiveFilter = false;
  }
}
