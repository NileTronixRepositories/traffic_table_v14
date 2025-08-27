import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TrafficSignalrService {
  private hubConnection!: signalR.HubConnection;

  private messageSource = new Subject<{ name: string; message: string }>();
  message$ = this.messageSource.asObservable();

  private unitActionSource = new Subject<{ L1: string; L2: string }>();
  unitAction$ = this.unitActionSource.asObservable();

  constructor() {
    this.connect();
  }

  private connect() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.signalRUrl, {
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect() // auto reconnect
      .build();

    // Listen for events from server
    this.hubConnection.on('receiveMessage', (name: string, message: string) => {
      this.messageSource.next({ name, message });
    });

    this.hubConnection.on('unitAction', (L1: string, T: number, L2: string) => {
      this.unitActionSource.next({ L1, L2 });
    });

    // Start connection
    this.hubConnection
      .start()
      .then(() => {
        console.log('✅ SignalR connected: ', this.hubConnection.connectionId);
      })
      .catch((err) => console.error('❌ SignalR connect error:', err));
  }

  sendMessage(name: string, msg: string) {
    this.hubConnection
      .invoke('sendMessage', name, msg)
      .catch((err) => console.error(err));
  }
}
