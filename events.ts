export class Events {
  triggers: any[] = [];

  on(event: any, callback: any) {
    if (!this.triggers[event]) {
      this.triggers[event] = [];
    }
    this.triggers[event].push(callback);
  }

  triggerHandler(event, params) {
    if (this.triggers[event]) {
      for (var i in this.triggers[event]) {
        this.triggers[event][i](params);
      }
    }
  }
}

export default Events;
