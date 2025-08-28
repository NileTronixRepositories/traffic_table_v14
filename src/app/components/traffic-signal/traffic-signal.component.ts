import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { SignalRServiceService } from 'src/app/services/SignalR/signal-rservice.service';
import { TrafficLog } from 'src/types/signalr';

export interface Traffic {
  id: number;
  ipAddress: string;
  name: string;
  status: 'RED' | 'GREEN' | 'YELLOW';
  active: boolean;
  L1?: 'RED' | 'GREEN' | 'YELLOW';
  T?: number;
  L2?: 'RED' | 'GREEN' | 'YELLOW';
}

export interface UnitAction {
  id: string;
  L1: 'RED' | 'GREEN' | 'YELLOW';
  L2: 'RED' | 'GREEN' | 'YELLOW';
  T: number;
}

export interface UnitAction {
  id: string;
  L1: 'RED' | 'GREEN' | 'YELLOW';
  L2: 'RED' | 'GREEN' | 'YELLOW';
  T: number;
}

declare var $: any;
@Component({
  selector: 'app-traffic-signal',
  templateUrl: './traffic-signal.component.html',
  styleUrls: ['./traffic-signal.component.css'],
})
export class TrafficSignalComponent implements OnInit, OnDestroy {
  lastMsg?: any;
  lastAction?: any; 
  parsed:TrafficLog ={} as TrafficLog // Real Value 

  constructor(private signalR: SignalRServiceService) {}

  // ================= Pagination =================
  pageSize = 10;
  currentPage = 1;

  // ================= Popup =================
  hoveredTraffic: Traffic | null = null;
  popupVisible = false;
  popupX = 0;
  popupY = 0;
  popupData: Traffic | null = null;

  // الحالة الحالية والمقابلة
  currentStatus: 'RED' | 'GREEN' | 'YELLOW' = 'RED';
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

  // ================= Counters =================
  counters: Record<'RED' | 'GREEN' | 'YELLOW', number> = {
    RED: 0,
    GREEN: 0,
    YELLOW: 0,
  };
  private interval: any;
  duration = 10;

  // ================= Filters =================
  searchTerm = '';
  statusFilter: { [key: string]: boolean } = {
    RED: true,
    GREEN: true,
    YELLOW: true,
  };
  activeFilter: 'ALL' | 'ACTIVE' | 'INACTIVE' = 'ALL';
  showStatusFilter = false;
  showActiveFilter = false;

  // ================= Table Headers ================= //
  tableHeaders: string[] = ['ID', 'IP Address', 'Traffic Name', 'Active'];

  // ================= Colors / Labels ================= //
  statusColors: { [key: string]: string } = {
    RED: '#ff4757',
    GREEN: '#2ed573',
    YELLOW: '#ffa502',
  };
  activeLabel = 'Active';
  inactiveLabel = 'Inactive';

  // ================= Traffic Data =================
  traffics: Traffic[] = [
    {
      id: 1,
      ipAddress: '192.168.1.101',
      name: 'Tahrir Square - Downtown Cairo',
      status: 'RED',
      active: true,
    },
    {
      id: 2,
      ipAddress: '192.168.1.102',
      name: '6th of October Bridge Entrance',
      status: 'GREEN',
      active: false,
    },
    {
      id: 3,
      ipAddress: '192.168.1.103',
      name: 'Nasr City - Abbas El Akkad',
      status: 'YELLOW',
      active: true,
    },
    {
      id: 4,
      ipAddress: '192.168.1.104',
      name: 'Ramses Square - Downtown',
      status: 'GREEN',
      active: true,
    },
    {
      id: 5,
      ipAddress: '192.168.1.105',
      name: 'Alexandria Desert Road Junction',
      status: 'YELLOW',
      active: false,
    },
    {
      id: 6,
      ipAddress: '192.168.1.106',
      name: 'Mohamed Naguib Square - Heliopolis',
      status: 'RED',
      active: true,
    },
    {
      id: 7,
      ipAddress: '192.168.1.107',
      name: 'Corniche El Nile - Zamalek',
      status: 'GREEN',
      active: false,
    },
    {
      id: 8,
      ipAddress: '192.168.1.108',
      name: 'Ring Road - Maadi Exit',
      status: 'RED',
      active: true,
    },
    {
      id: 9,
      ipAddress: '192.168.1.109',
      name: 'El Hegaz Square - Heliopolis',
      status: 'YELLOW',
      active: true,
    },
    {
      id: 10,
      ipAddress: '192.168.1.110',
      name: 'Giza Square - Pyramids Road',
      status: 'GREEN',
      active: true,
    },
    {
      id: 11,
      ipAddress: '192.168.1.111',
      name: 'City Stars Intersection - Nasr City',
      status: 'RED',
      active: false,
    },
    {
      id: 12,
      ipAddress: '192.168.1.112',
      name: 'Alexandria Corniche - Stanley',
      status: 'GREEN',
      active: true,
    },
    {
      id: 13,
      ipAddress: '192.168.1.113',
      name: 'Suez Road - Ain Sokhna Entrance',
      status: 'YELLOW',
      active: false,
    },
    {
      id: 14,
      ipAddress: '192.168.1.114',
      name: 'Mokattam Hills Intersection',
      status: 'RED',
      active: true,
    },
    {
      id: 15,
      ipAddress: '192.168.1.115',
      name: 'El Marg Road - Northern Cairo',
      status: 'GREEN',
      active: false,
    },
    {
      id: 16,
      ipAddress: '192.168.1.116',
      name: 'Maadi Corniche Intersection',
      status: 'YELLOW',
      active: true,
    },
    {
      id: 17,
      ipAddress: '192.168.1.117',
      name: 'El Obour City Main Junction',
      status: 'RED',
      active: true,
    },
    {
      id: 18,
      ipAddress: '192.168.1.118',
      name: 'Port Said Road - Ismailia Junction',
      status: 'GREEN',
      active: true,
    },
    {
      id: 19,
      ipAddress: '192.168.1.119',
      name: 'New Cairo - AUC Intersection',
      status: 'YELLOW',
      active: false,
    },
    {
      id: 20,
      ipAddress: '192.168.1.120',
      name: 'Alexandria International Airport Road',
      status: 'RED',
      active: true,
    },
  ];

  // ======== Lifecycle ========
  // ngOnInit() {
  //   // 1) ابدأ اتصال SignalR
  //   this.sr.start();

  //   // 2) استقبل رسائل السيرفر ReceiveMessage(name, message)
  //   this.sr.messages$.subscribe(({ name, message }) => {
  //     // لو تحب تعرض نوتيفيكيشن:
  //     console.log('ReceiveMessage:', { name, message });
  //     // مثال سريع: alert(`${name}: ${message}`);
  //     // أو لو message JSON لوجات/تحديثات — اعمل parse هنا حسب ما تحتاج
  //   });

  //   // 3) استقبل ReceiveUnitAction(roomId, actionId, operatorData)
  //   this.unitAction$.subscribe((action) => {
  //     const traffic = this.traffics.find((t) => t.id === action.id);

  //     if (traffic) {
  //       traffic.L1 = action.L1;
  //       traffic.L2 = action.L2;
  //       traffic.T = action.T;

  //       // status الأساسي هيبقى من L1
  //       traffic.status = action.L1 as 'RED' | 'GREEN' | 'YELLOW';
  //     }
  //   });
  // }

  ngOnInit() {
    this.signalR.unitActions$.subscribe((action: UnitAction | null) => {
      console.log(action)
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
          console.log()
        }
      }
    }); 
    this.signalR.messages$.subscribe((msg)=>
    {
 
    this.parsed = JSON.parse(msg.message);
   console.log(this.parsed.L1)
   console.log(this.parsed.L2)
   console.log(this.parsed.T)

    })

  }

  ngOnDestroy() {
    clearInterval(this.interval);
  }

  // ================= Popup Logic =================
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
    const offset = 5;
    const sx = window.scrollX;
    const sy = window.scrollY;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const pw = 220;
    const ph = 180;

    let x = event.clientX + offset;
    let y = event.clientY - ph - offset;

    if (x + pw > vw) x = event.clientX - pw - offset;
    if (y < 0) y = event.clientY + offset;

    this.popupX = x + sx;
    this.popupY = y + sy;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.status-filter-dropdown'))
      this.showStatusFilter = false;
    if (!target.closest('.active-filter-dropdown'))
      this.showActiveFilter = false;
  }

  // ================= Counter Logic =================
  private resetCounters() {
    this.counters = { RED: 0, GREEN: 0, YELLOW: 0 };
    if (this.popupData) this.counters[this.popupData.status] = this.duration;
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

      if (timeLeft <= 0) {
        clearInterval(this.interval);
      }
    }, 1000);
  }

  closePopup() {
    this.popupVisible = false;
    clearInterval(this.interval);
  }

  private nextStatus(
    current: 'RED' | 'GREEN' | 'YELLOW'
  ): 'RED' | 'GREEN' | 'YELLOW' {
    const order: ('RED' | 'GREEN' | 'YELLOW')[] = ['RED', 'GREEN', 'YELLOW'];
    return order[(order.indexOf(current) + 1) % order.length];
  }

  switchStatus(nextStatus: 'RED' | 'GREEN' | 'YELLOW') {
    this.currentStatus = nextStatus;
    this.startCounter();
  }

  // ================= Filters Logic =================
  get filteredTraffics(): Traffic[] {
    return this.traffics.filter((traffic) => {
      const matchesSearch =
        traffic.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        traffic.id.toString().includes(this.searchTerm);

      const matchesStatus = this.statusFilter[traffic.status];
      const matchesActive =
        this.activeFilter === 'ALL' ||
        (this.activeFilter === 'ACTIVE' && traffic.active) ||
        (this.activeFilter === 'INACTIVE' && !traffic.active);

      return matchesSearch && matchesStatus && matchesActive;
    });
  }

  toggleStatusFilter(status: string) {
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

  // ================= Pagination Logic =================
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

  // ================= Misc =================
  toggleActive(traffic: Traffic) {
    traffic.active = !traffic.active;
  }

  // (اختياري) زر تجريب إرسال رسالة
  sendTest() {
    this.signalR.sendMessage('Client', 'Hello from Angular 14!');
  }

  // الحالة العكسية (للعمود التاني في البوب أب)
  get oppositeStatus(): 'RED' | 'GREEN' | 'YELLOW' {
    if (this.currentStatus === 'RED') return 'GREEN';
    if (this.currentStatus === 'GREEN') return 'RED';
    return 'YELLOW';
  }

  signalColors: Array<'RED' | 'GREEN' | 'YELLOW'> = ['RED', 'GREEN', 'YELLOW'];
}
