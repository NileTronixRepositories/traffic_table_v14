interface SignalR {
  hubConnection(url?: string): any;
}

interface JQueryStatic {
  connection?: any;
  hubConnection?(url?: string): any;
}

declare var $: JQueryStatic;
declare module 'leaflet';

export interface TrafficLog {
  IpAdress: string;
  L1: string;
  T: number;
  L2: string;
}
