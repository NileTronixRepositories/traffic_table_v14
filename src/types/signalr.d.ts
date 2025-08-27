interface SignalR { hubConnection(url?: string): any; }

interface JQueryStatic {
  connection?: any;
  hubConnection?(url?: string): any;
}

declare var $: JQueryStatic;