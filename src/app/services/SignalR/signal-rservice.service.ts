import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, timer } from 'rxjs';
import { map } from 'rxjs/operators';
@Injectable({ providedIn: 'root' })
export class SignalRServiceService {
  BaseBackUrl = 'http://192.168.1.43/TLC';

  // --------- SignalR internals ---------
  private connection: any;
  private hub: any;
  private readonly baseUrl = 'http://192.168.1.43/TLC';
  private readonly hubName = 'messageHub';
  private starting = false;
  private connected = false;
  private backoffMs = 1000;
  private readonly maxBackoffMs = 10000;
  // --------- Streams ---------
  private messagesSub = new Subject<{ name: string; message: string }>();
  messages$ = this.messagesSub.asObservable();
  private connectionStateSub = new Subject<
    'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  >();
  connectionState$ = this.connectionStateSub.asObservable();
  constructor(private zone: NgZone, private http: HttpClient) {
    this.init();
  }
  // --------- REST ---------
  getControlBoxes() {
    return this.http.get<any[]>(`${this.BaseBackUrl}/api/get/control-box`).pipe(
      map((data) =>
        data.map((item) => ({
          id: item.ID,
          name: item.Name,
          Latitude: item.Latitude?.trim() || null,
          Longitude: item.Longitude?.trim() || null,
          ipAddress: item.IpAddress,
          status: 'R' as 'R' | 'G' | 'Y',
          active: true,
          L1: 'R' as 'R' | 'G' | 'Y',
          L2: 'R' as 'R' | 'G' | 'Y',
          T: 0,
        }))
      )
    );
  }
  // --------- SignalR setup ---------
  private init() {
    const $any = (window as any).$;
    if (!$any || !$any.hubConnection) {
      console.error(
        'jQuery/SignalR not found. Check scripts order in index.html'
      );
      return;
    }
    this.connection = $any.hubConnection(this.baseUrl);
    this.hub = this.connection.createHubProxy(this.hubName);
    // Server -> Client handlers
    this.hub.on('ReceiveMessage', (name: string, message: string) => {
      this.zone.run(() => this.messagesSub.next({ name, message }));
    });
    // State changes
    this.connection.stateChanged((chg: any) => {
      const cs = $any.signalR.connectionState;
      switch (chg.newState) {
        case cs.connecting:
          this.connected = false;
          this.emitState('connecting');
          break;
        case cs.connected:
          this.connected = true;
          this.backoffMs = 1000;
          this.emitState('connected');
          break;
        case cs.reconnecting:
          this.connected = false;
          this.emitState('reconnecting');
          break;
        case cs.disconnected:
          this.connected = false;
          this.emitState('disconnected');
          this.scheduleRestart();
          break;
      }
    });
    if (typeof this.connection.disconnected === 'function') {
      this.connection.disconnected(() => {
        this.connected = false;
        this.emitState('disconnected');
        this.scheduleRestart();
      });
    }
    this.start();
  }
  private emitState(
    s: 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  ) {
    this.zone.run(() => this.connectionStateSub.next(s));
  }
  start(): Promise<void> {
    if (this.starting || this.connected || !this.connection)
      return Promise.resolve();
    this.starting = true;
    return new Promise<void>((resolve) => {
      this.connection
        .start()
        .done(() => {
          this.starting = false;
          this.connected = true;
          this.backoffMs = 1000;
          console.log(':white_tick: SignalR connected:', this.connection.id);
          this.emitState('connected');
          resolve();
        })
        .fail((err: any) => {
          this.starting = false;
          this.connected = false;
          console.warn(':warning: SignalR start failed, retrying...', err);
          this.emitState('disconnected');
          this.scheduleRestart();
          resolve();
        });
    });
  }
  private scheduleRestart() {
    this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
    timer(this.backoffMs).subscribe(() => this.start());
  }
  // Optional utility
  get isConnected() {
    return this.connected;
  }
  // Optional: send message
  sendMessage(user: string, message: string) {
    if (!this.hub) return;
    this.hub
      .invoke('SendMessage', user, message)
      .fail((e: any) => console.error('SendMessage failed', e));
  }
}
