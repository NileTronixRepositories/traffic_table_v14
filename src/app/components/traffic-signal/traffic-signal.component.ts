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
export interface Traffic {
  id: number;
  ipAddress?: string;
  name: string;
  status?: 'R' | 'G' | 'Y';
  active?: boolean;
  L1?: 'R' | 'G' | 'Y';
  T?: number;
  L2?: 'R' | 'G' | 'Y';
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
  // lifecycle
  private destroy$ = new Subject<void>();
  constructor(
    private signalR: SignalRServiceService,
    private http: HttpClient
  ) {}
  ngOnInit() {
    // جدول
    this.signalR
      .getControlBoxes()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.traffics = data;
      });
    // حالة الاتصال → إيقاف العدّاد فورًا لو غير connected
    this.signalR.connectionState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        if (state !== 'connected') {
          this.popupDisconnected = true;
          clearInterval(this.interval);
          this.countingForId = null;
        } else {
          this.popupDisconnected = false;
          // مش هنبدأ العدّاد إلا لما توصل رسالة لنفس الـ id
        }
      });
    // استقبال الرسائل العامة من SignalR
    this.signalR.messages$
      .pipe(
        takeUntil(this.destroy$),
        map((m) => this.parseIncoming(m?.message))
      )
      .subscribe((action) => {
        console.log(action);
        if (!action) return;
        // حدّث الصف
        const t = this.traffics.find((x) => x.id === action.id);
        if (t) {
          t.L1 = action.L1;
          t.L2 = action.L2;
          t.T = action.T;
          t.status = action.L1;
        }
        // لو الـ Popup مفتوح لنفس الـ id → حدّثه وابدأ العداد
        if (this.popupData?.id === action.id) {
          this.popupData = { ...(t ?? this.popupData) };
          // العدّاد يشتغل فقط الآن (وهو connected)
          clearInterval(this.interval);
          this.countingForId = action.id;
          if (!this.popupDisconnected) this.startCounter();
        } else {
          // رسالة لغير نفس الـ id → أوقف العدّاد فوريًا
          clearInterval(this.interval);
          this.countingForId = null;
        }
      });
  }
  ngOnDestroy() {
    clearInterval(this.interval);
    this.destroy$.next();
    this.destroy$.complete();
  }
  // Click row → POST + فتح Popup (بدون عدّاد) + انتظار أول رسالة لنفس id (اختياري)
  applyCurrent(row: Traffic, event: MouseEvent) {
    this.showPopup(row, event);
    const id = row.id;
    // console.log
    const url = 'http://192.168.1.43/TLC/signals/apply-current';
    const body = { SignId: id }; // غيّر لـ signedId لو API عايزه
    // اختياري: لو عايز تتعامل مع أول رسالة فقط بعد الضغط (غير لازم لأننا عاملين اشتراك عام فوق)
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
            T: number;
          } => !!a && a.id === id
        ),
        take(1),
        timeout({ first: 8000 }),
        catchError(() => of(null))
      )
      .subscribe((action) => {
        if (!action) return; // timeout
        // التحديث الأساسي هيتم في الاشتراك العام
        // هنا مشغلناش عدّاد؛ الاشتراك العام هو اللي بيشغله لضمان شرط نفس الـ id
      });
    // POST
    this.http.post<any>(url, body).subscribe({
      next: (res) => console.log(':white_tick: POST Success', res),
      error: (err) => console.error(':x: POST Error', err),
    });
  }
  // Parse رسالة SignalR → { id, L1, L2, T }
  private parseIncoming(
    raw?: string
  ): {
    id: number;
    L1: 'R' | 'G' | 'Y';
    L2: 'R' | 'G' | 'Y';
    T: number;
  } | null {
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
      const T = Number(obj.T ?? obj.timer ?? obj.countdown ?? 0);
      if (!Number.isFinite(id)) return null;
      const ok = (v: any) => v === 'R' || v === 'G' || v === 'Y';
      return {
        id,
        L1: ok(L1) ? L1 : 'R',
        L2: ok(L2) ? L2 : 'R',
        T: Number.isFinite(T) && T >= 0 ? T : 0,
      };
    } catch {
      return null;
    }
  }
  // Popup & timer
  showPopup(traffic: Traffic, event: MouseEvent) {
    this.popupData = traffic;
    this.popupVisible = true;
    this.updatePopupPosition(event);
    // مهم: لا تبدأ العدّاد عند الفتح
    clearInterval(this.interval);
    this.countingForId = null;
  }
  hidePopup() {
    this.popupVisible = false;
    this.popupData = null;
    clearInterval(this.interval);
    this.countingForId = null;
  }
  movePopup(event: MouseEvent) {
    if (this.popupVisible) this.updatePopupPosition(event);
  }
  private updatePopupPosition(event: MouseEvent) {
    const offset = 5,
      pw = 220,
      ph = 180;
    let x = event.clientX + offset,
      y = event.clientY - ph - offset;
    if (x + pw > window.innerWidth) x = event.clientX - pw - offset;
    if (y < 0) y = event.clientY + offset;
    this.popupX = x + window.scrollX;
    this.popupY = y + window.scrollY;
  }
  startCounter() {
    clearInterval(this.interval);
    if (this.popupDisconnected) return;
    if (!this.popupData || !this.popupData.T || this.popupData.T <= 0) return;
    if (this.countingForId !== this.popupData.id) return;
    let timeLeft = this.popupData.T;
    this.interval = setInterval(() => {
      if (this.popupDisconnected || this.countingForId !== this.popupData?.id) {
        clearInterval(this.interval);
        return;
      }
      if (timeLeft > 0) {
        timeLeft--;
        this.popupData!.T = timeLeft;
      }
      if (timeLeft <= 0) clearInterval(this.interval);
    }, 1000);
  }
  // Filters & helpers
  mapSignalColor(
    color: 'R' | 'G' | 'Y' | undefined
  ): 'RED' | 'GREEN' | 'YELLOW' {
    return color === 'G' ? 'GREEN' : color === 'Y' ? 'YELLOW' : 'RED';
  }
  getEmoji(c: 'RED' | 'GREEN' | 'YELLOW') {
    return c === 'RED'
      ? ':red_circle:'
      : c === 'GREEN'
      ? ':large_green_circle:'
      : ':large_yellow_circle:';
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
