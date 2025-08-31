import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { SignalRServiceService } from 'src/app/services/SignalR/signal-rservice.service';
import { TrafficLog } from 'src/types/signalr';

export interface Traffic {
  id: number;
  ipAddress?: string;
  name: string;
  status?: 'RED' | 'GREEN' | 'YELLOW';
  active?: boolean;
  L1?: 'RED' | 'GREEN' | 'YELLOW';
  T?: number;
  L2?: 'RED' | 'GREEN' | 'YELLOW';
  Latitude?: string | null;
  Longitude?: string | null;
}

export interface UnitAction {
  id: string;
  L1: 'RED' | 'GREEN' | 'YELLOW';
  L2: 'RED' | 'GREEN' | 'YELLOW';
  T: number;
}

@Component({
  selector: 'app-traffic-signal',
  templateUrl: './traffic-signal.component.html',
  styleUrls: ['./traffic-signal.component.css'],
})
export class TrafficSignalComponent implements OnInit, OnDestroy {
  // Data
  traffics: Traffic[] = [];
  lastMsg?: any;
  lastAction?: any;
  parsed: TrafficLog = {} as TrafficLog;

  // Popup
  popupVisible = false;
  popupX = 0;
  popupY = 0;
  popupData: Traffic | null = null;

  // Pagination
  pageSize = 10;
  currentPage = 1;

  // Status & Counter
  currentStatus: 'RED' | 'GREEN' | 'YELLOW' = 'RED';
  counters: Record<'RED' | 'GREEN' | 'YELLOW', number> = {
    RED: 0,
    GREEN: 0,
    YELLOW: 0,
  };
  private interval: any;
  duration = 10;

  // Filters
  searchTerm = '';
  statusFilter: Record<'RED' | 'GREEN' | 'YELLOW', boolean> = {
    RED: true,
    GREEN: true,
    YELLOW: true,
  };
  activeFilter: 'ALL' | 'ACTIVE' | 'INACTIVE' = 'ALL';
  showStatusFilter = false;
  showActiveFilter = false;

  // Table
  tableHeaders: string[] = ['ID', 'IP Address', 'Traffic Name', 'Active'];

  // Colors & Labels
  statusColors: Record<'RED' | 'GREEN' | 'YELLOW', string> = {
    RED: '#ff4757',
    GREEN: '#2ed573',
    YELLOW: '#ffa502',
  };
  activeLabel = 'Active';
  inactiveLabel = 'Inactive';
  signalColors: Array<'RED' | 'GREEN' | 'YELLOW'> = ['RED', 'GREEN', 'YELLOW'];

  constructor(private signalR: SignalRServiceService) {}

  ngOnInit() {
    // Subscribe to SignalR actions
    this.signalR.unitActions$.subscribe((action: UnitAction | null) => {
      if (!action) return;
      const traffic = this.traffics.find((t) => t.id === Number(action.id));
      if (traffic) {
        traffic.L1 = action.L1;
        traffic.L2 = action.L2;
        traffic.T = action.T;
        traffic.status = action.L1;
        if (this.popupData?.id === traffic.id) {
          this.popupData = { ...traffic };
          this.startCounter();
        }
      }
    });

    // Subscribe to SignalR messages
    this.signalR.messages$.subscribe((msg) => {
      this.parsed = JSON.parse(msg.message);
    });

    // Fetch governorates from backend
    this.signalR.getGovernorates().subscribe((data) => {
      this.traffics = data.map((item) => ({
        id: item.ID,
        name: item.Name,
        Latitude: item.Latitude,
        Longitude: item.Longitude,
        status: 'RED',
        active: true,
      }));
    });
    // Fetch control boxes
    this.signalR.getControlBoxes().subscribe((data) => {
      this.traffics = data.map((item: any) => ({
        ...item,
        status:
          item.status === 'RED' ||
          item.status === 'GREEN' ||
          item.status === 'YELLOW'
            ? item.status
            : 'RED',
      }));
    });
  }

  ngOnDestroy() {
    clearInterval(this.interval);
  }

  // Popup Logic
  showPopup(traffic: Traffic, event: MouseEvent) {
    this.popupData = traffic;
    this.popupVisible = true;
    this.updatePopupPosition(event);
    this.startCounter();
  }

  hidePopup() {
    this.popupVisible = false;
    this.popupData = null;
    clearInterval(this.interval);
  }

  movePopup(event: MouseEvent) {
    if (this.popupVisible) this.updatePopupPosition(event);
  }

  private updatePopupPosition(event: MouseEvent) {
    const offset = 5,
      pw = 220,
      ph = 180;
    let x = event.clientX + offset;
    let y = event.clientY - ph - offset;
    if (x + pw > window.innerWidth) x = event.clientX - pw - offset;
    if (y < 0) y = event.clientY + offset;
    this.popupX = x + window.scrollX;
    this.popupY = y + window.scrollY;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.status-filter-dropdown'))
      this.showStatusFilter = false;
    if (!target.closest('.active-filter-dropdown'))
      this.showActiveFilter = false;
  }

  // Counter Logic
  private resetCounters() {
    this.counters = { RED: 0, GREEN: 0, YELLOW: 0 };
    if (this.popupData && this.popupData.status)
      this.counters[this.popupData.status] = this.duration;
  }

  startCounter() {
    clearInterval(this.interval);
    if (!this.popupData || !this.popupData.T || this.popupData.T <= 0) return;
    let timeLeft = this.popupData.T;
    this.interval = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        this.popupData!.T = timeLeft;
      }
      if (timeLeft <= 0) clearInterval(this.interval);
    }, 1000);
  }

  closePopup() {
    this.popupVisible = false;
    clearInterval(this.interval);
  }

  // Status Logic
  getEmoji(color: 'RED' | 'GREEN' | 'YELLOW'): string {
    switch (color) {
      case 'RED':
        return '🔴';
      case 'GREEN':
        return '🟢';
      case 'YELLOW':
        return '🟡';
      default:
        return '';
    }
  }

  private nextStatus(
    current: 'RED' | 'GREEN' | 'YELLOW'
  ): 'RED' | 'GREEN' | 'YELLOW' {
    const order: Array<'RED' | 'GREEN' | 'YELLOW'> = ['RED', 'GREEN', 'YELLOW'];
    return order[(order.indexOf(current) + 1) % order.length];
  }

  switchStatus(nextStatus: 'RED' | 'GREEN' | 'YELLOW') {
    this.currentStatus = nextStatus;
    this.startCounter();
  }

  get oppositeStatus(): 'RED' | 'GREEN' | 'YELLOW' {
    if (this.currentStatus === 'RED') return 'GREEN';
    if (this.currentStatus === 'GREEN') return 'RED';
    return 'YELLOW';
  }

  // Filters Logic
  get filteredTraffics(): Traffic[] {
    return this.traffics.filter((traffic) => {
      const matchesSearch =
        traffic.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        traffic.id.toString().includes(this.searchTerm);
      const matchesStatus = this.statusFilter[traffic.status ?? 'RED'];
      const matchesActive =
        this.activeFilter === 'ALL' ||
        (this.activeFilter === 'ACTIVE' && traffic.active) ||
        (this.activeFilter === 'INACTIVE' && !traffic.active);
      return matchesSearch && matchesStatus && matchesActive;
    });
  }

  toggleStatusFilter(status: 'RED' | 'GREEN' | 'YELLOW') {
    this.statusFilter[status] = !this.statusFilter[status];
  }

  toggleAllStatusFilters() {
    const allSelected = this.allStatusSelected;
    Object.keys(this.statusFilter).forEach(
      (key) =>
        (this.statusFilter[key as 'RED' | 'GREEN' | 'YELLOW'] = !allSelected)
    );
  }

  get allStatusSelected(): boolean {
    return Object.values(this.statusFilter).every((v) => v);
  }

  get someStatusSelected(): boolean {
    return (
      Object.values(this.statusFilter).some((v) => v) && !this.allStatusSelected
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

  // Pagination Logic
  get paginatedTraffics(): Traffic[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTraffics.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTraffics.length / this.pageSize) || 1;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  // Misc
  toggleActive(traffic: Traffic) {
    traffic.active = !traffic.active;
  }

  sendTest() {
    this.signalR.sendMessage('Client', 'Hello from Angular 14!');
  }
}
