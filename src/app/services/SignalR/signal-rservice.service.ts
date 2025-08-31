import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Subject, timer } from 'rxjs';
import { UnitAction } from 'src/app/components/traffic-signal/traffic-signal.component';
import { TrafficLog } from 'src/types/signalr';

@Injectable({
  providedIn: 'root',
})
export class SignalRServiceService {
  constructor(private zone: NgZone, private http: HttpClient) {
    this.init();
  }

  getGovernorates() {
    return this.http.get<any[]>('/api/get/control-box');
  }

  getControlBoxes() {
    return this.http.get<any[]>('/api/get/control-box').pipe(
      map((data) =>
        data.map((item) => ({
          id: item.ID,
          name: item.Name,
          Latitude: item.Latitude?.trim() || null,
          Longitude: item.Longitude?.trim() || null,
          ipAddress: item.IpAddress,
          status: '',
          active: true,
          L1: '',
          L2: '',
          T: 0,
        }))
      )
    );
  }
  private connection: any;
  private hub: any;

  private readonly baseUrl = 'http://197.168.209.50/TLC';
  //private readonly baseUrl = 'http://localhost/TLC'; // سيرفرك
  private readonly hubName = 'messageHub';

  private starting = false;
  private connected = false;

  private backoffMs = 1000; // 1s
  private readonly maxBackoffMs = 10000; // 10s

  // Streams
  private messagesSub = new Subject<{ name: string; message: string }>();
  messages$ = this.messagesSub.asObservable();

  private unitActionsSub = new Subject<{
    roomId: string;
    actionId: string;
    operatorData: string;
  }>();

  unitActions$ = this.unitActionsSub.asObservable().pipe(
    map(({ roomId, actionId, operatorData }) => {
      let parsed: any;
      try {
        parsed = JSON.parse(operatorData);
      } catch (e) {
        console.error('❌ Error parsing operatorData:', operatorData, e);
        return null;
      }

      return {
        id: actionId,
        L1: parsed.L1 as 'R' | 'G' | 'Y',
        L2: parsed.L2 as 'R' | 'G' | 'Y',
        T: parsed.T as number,
      } as UnitAction;
    })
  );

  private init() {
    const $any = (window as any).$;
    if (!$any || !$any.hubConnection) {
      console.error(
        'jQuery/SignalR not found. Check scripts order in index.html'
      );
      return;
    }

    // 1) Create connection + hub proxy
    this.connection = $any.hubConnection(this.baseUrl); // http://197.168.209.50/signalr
    this.hub = this.connection.createHubProxy(this.hubName);

    // 2) Server -> Client handlers (أسماء السيرفر)
    this.hub.on('ReceiveMessage', (name: string, message: string) => {
      this.zone.run(() => this.messagesSub.next({ name, message }));
    });

    this.hub.on(
      'ReceiveUnitAction',
      (roomId: string, actionId: string, operatorData: string) => {
        this.zone.run(() =>
          this.unitActionsSub.next({ roomId, actionId, operatorData })
        );
      }
    );

    // 3) State
    this.connection.stateChanged((chg: any) => {
      // 0 connecting, 1 connected, 2 reconnecting, 4 disconnected
      this.connected = chg.newState === 1;
    });

    // 4) Start
    this.start();
  }

  /** يبدأ الاتصال مع إعادة المحاولة (exponential backoff) */
  start(): Promise<void> {
    if (this.starting || this.connected || !this.connection)
      return Promise.resolve();
    this.starting = true;

    return new Promise<void>((resolve) => {
      const tryStart = () => {
        this.connection
          .start()
          .done(() => {
            this.starting = false;
            this.connected = true;
            this.backoffMs = 1000;
            console.log('✅ SignalR connected:', this.connection.id);
            resolve();
          })
          .fail((err: any) => {
            this.starting = false;
            this.connected = false;
            console.warn('⚠️ SignalR start failed, retrying...', err);
            this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
            timer(this.backoffMs).subscribe(() => this.start());
          });
      };
      tryStart();
    });
  }

  // ===== Public API =====

  /** يرسل رسالة إلى الهَب (ينادي SendMessage على السيرفر) */
  sendMessage(user: string, message: string) {
    if (!this.hub) return;
    this.hub
      .invoke('SendMessage', user, message)
      .fail((e: any) => console.error('SendMessage failed', e));
  }

  /** يرسل UnitAction (ينادي SendUnitAction على السيرفر) */
  sendUnitAction(roomId: string, actionId: string, operatorData: string) {
    if (!this.hub) return;
    this.hub
      .invoke('SendUnitAction', roomId, actionId, operatorData)
      .fail((e: any) => console.error('SendUnitAction failed', e));
  }

  /** انضمام لجروب */
  join(groupName: string) {
    if (!this.hub) return;
    this.hub
      .invoke('Join', groupName)
      .fail((e: any) => console.error('Join failed', e));
  }
}
