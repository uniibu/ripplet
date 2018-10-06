const RippleAPI = require('ripple-lib').RippleAPI;
const log = function(...args){
  console.log(`[[${new Date().toUTCString()}]]`,...args);
};
const listServers = ['wss://s-east.ripple.com:443', 'wss://s-west.ripple.com:443', 'wss://s1.ripple.com:443', 'wss://s2.ripple.com:443'];
let listId = 0;

class Ripple {
  constructor() {
    this.api = this._newApi(listId);
  }
  _newApi(id){    
    return new RippleAPI({
      server: listServers[id]
    });
  }
  _init() {
    this.api.on('error', (errorCode, errorMessage) => {
      log(`Server Error: ${errorCode}: ${errorMessage}`);
    });
    this.api.on('connected',function(){
      log('Succesfull connection to:',listServers[listId]);
    });
  }
  async _connect() {
    if (!this.api.isConnected()){
      this._init();
      try{
        log('Connecting to', listServers[listId]);
        await this.api.connect();
      }catch(e){
        listId++;
        if(listId > (listServers.length - 1)){
          listId = 0;
        }
        this.api = this._newApi(listId);
        await this._connect();
      }
    }
  }
  async listen(event, cb) {
    await this._connect();
    this.api.connection.on(event, cb);
  }
  async request(cmd, params) {
    await this._connect();
    const r = await this.api.request(cmd, params);
    return r;
  }
  async method(method, ...args) {
    await this._connect();
    return this.api[method](...args);
  }
  get errors() {
    return this.api.errors;
  }
}
module.exports = Ripple;