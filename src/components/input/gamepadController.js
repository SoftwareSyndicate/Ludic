let ps4Mapping = {
  buttons: ['cross','circle','square','triangle','l1','r1','l2','r2','extra','start','l3','r3','up','down','left','right','home','select'],
  axes: ['lx','ly','rx','ry'],
  sticks: {
    lx:'leftStick',
    ly:'leftStick',
    rx:'rightStick',
    ry:'rightStick'
  }
};

let gamepadMaps = {
  'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 05c4)':ps4Mapping // ps4 controller
};

let gamepadsAxisDeadZone = 0.08;
let gamepadsConfig = {};

class GamepadController {
  constructor() {
    this.initGamepads();
  }

  install(inputController){
    this.inputController = inputController;
  }

  initGamepads(){
    this.gamepads = {};
    this.lastButtonStates = [
      [], // gamepad index 0
      [], // gamepad index 1
      [], // gamepad index 2
      []  // gamepad index 3
    ];
    this.lastAxisStates = [
      [], // gamepad index 0
      [], // gamepad index 1
      [], // gamepad index 2
      []  // gamepad index 3
    ];
    window.addEventListener("gamepadconnected", (e)=>{
      console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
        e.gamepad.index, e.gamepad.id,
        e.gamepad.buttons.length, e.gamepad.axes.length);
      console.log(e.gamepad);
      this.getGamepads();
    });
    window.addEventListener("gamepaddisconnected", (e)=>{
      console.log('Gamepad disconnected: ',e);
      this.getGamepads();
    });

    // window.addEventListener('gamepadbuttondown', (e)=>{
    //   console.log('gamepad button down: ',e);
    // });
    //
    // window.addEventListener('gamepadbuttonup', (e)=>{
    //   console.log('gamepad button up: ',e);
    // });
  }

  getGamepads(){
    var gps = navigator.getGamepads() || [];
    var gp;
    for(var i=0;i<gps.length;i++){
      gp = gps[i];
      if(gp){
        this.gamepads[gp.index] = gp;
      }
    }
    return this.gamepads;
  }

  update(){
    this._stepGamepads();
  }

  _stepGamepads(){
    var gps = this.getGamepads();
    var gp;
    for(var i in gps){
      gp = gps[i]; // gamepad instance from api
      if(gp){

        // for each gamepad that the api reads; poll the state of each button,
        //  sending an event when pressed
        gp.buttons.forEach( (b,ix)=>{
          // get the last known state of the button
          var lastState = this.getLastState(i,ix);
          b.index = ix; // tell the button what it's index is
          b.lastState = lastState;

          if(b.pressed){
            // if pressed, create a button event and set the buttons last known state
            this.gamepadButtonEvent(gp,b,true);
            this.setLastState(i,ix,true);
          } else {
            if(lastState) {
              // if the button is not pressed but its last state was pressed, create a 'button up' event
              if(lastState.pressed) {
                this.gamepadButtonEvent(gp,b,false);
              }
            }
            // set the buttons last known state for not pressed
            this.setLastState(i,ix,false);
          }
        });

        // do the same thing for each of the axis (analog sticks)
        // loop through each and poll state
        gp.axes.forEach( (value,axis)=>{
          // get the deadZone associated with each axis
          var dz = this.getDeadZone(axis);
          // get the last known state for the axis
          var lastState = this.getLastAxisState(i,axis);

          // if the value of the axis is withing the bounds of the deadzone
          //  create an axis event
          if( value < -dz || value > dz ){
            this.gamepadAxisEvent(gp,axis,value,false);
          } else if(!lastState.zeroed){
            this.gamepadAxisEvent(gp,axis,0,true);
          }
        });
      } else {
        console.log('no gamepad!',i);
      }
    }
  }

  getLastAxisState(gpIndex,axis){
    var b = this.lastAxisStates[gpIndex][axis] || {zeroed:true};
    return b;
  }

  setLastAxisState(gpIndex,axis,state){
    this.lastAxisStates[gpIndex][axis] = {zeroed:state};
  }

  getDeadZone(gamepadIndex){
    if(gamepadsConfig.hasOwnProperty(gamepadIndex) && gamepadsConfig[gamepadIndex].hasOwnProperty(deadZone)){
      return gamepadsConfig[gamepadIndex].deadZone;
    }
    return gamepadsAxisDeadZone;
  }

  setDeadZone(deadZone,gamepadIndex){
    if(gamepadIndex !== null && gamepadIndex !== undefined){
      if(gamepadsConfig.hasOwnProperty(gamepadIndex)){
        gamepadsConfig[gamepadIndex].deadZone = deadZone;
      } else {
        gamepadsConfig[gamepadIndex] = {deadZone: deadZone};
      }
    } else {
      gamepadsAxisDeadZone = deadZone;
    }
  }

  getLastState(i,ix){
    var b = this.lastButtonStates[i][ix];
    return b;
  }

  setLastState(i,ix,state){
    this.lastButtonStates[i][ix] = {pressed:state};
  }

  gamepadButtonEvent(gamepad,button,down) {
    button.id = gamepadMaps[gamepad.id].buttons[button.index];
    if(button.id){
      this.inputController.dispatchEvent(this,this.onGamepadButtonEvent,new GamepadButtonEvent(gamepad,button,down));
    } else {
      console.log(arguments);
    }
  }

  onGamepadButtonEvent(l,evt){
    if(!l || !l.enabled){
      return;
    }
    let func = l[evt.keyIdentifier];
    if(!func){
      return;
    }
    if(l.gamepadIndex >= 0 && l.gamepadIndex !== evt.gamepadIndex){
      return;
    }

    let bndr = l.binder || l;
    let b = func.call(bndr,evt.down,evt);
    if(b === true){
      return true;
    }
    // check for if listener wants the only control
    if(l.stopPropagation){
      return true;
    }
  }

  _onGamepadButtonEvent(evt){
    var l;
    let down = evt.down;

    // if(this.config.logAllKeys){
    //   console.log(evt.keyCode,evt.keyIdentifier);
    // }
    for(let i=listeners.length-1; i>=0; i--){
      l = listeners[i];
      if(!l || !l.enabled){
        continue;
      }
      let func = l[evt.keyIdentifier];
      if(!func){
        continue;
      }
      if(l.gamepadIndex >= 0 && l.gamepadIndex !== evt.gamepadIndex){
        continue;
      }

      let bndr = l.binder || l;
      let b = func.call(bndr,down,evt);
      if(b === true){
        return;
      }
      // check for if listener wants the only control
      if(l.stopPropagation){
        break;
      }
    }
    // if(this.config.logUnmappedKeys){
    //   console.log(evt.keyCode,evt.keyIdentifier,evt.button.value, listeners.length===0?"No listeners":"");
    // }
  }

  getGamepadMap(gamepadId){
    return gamepadMaps[gamepadId] || {};
  }

  gamepadAxisEvent(gamepad,axisIndex,value,zeroed){
    this.setLastAxisState(gamepad.index,axisIndex,zeroed);
    var gpMap = this.getGamepadMap(gamepad.id);
    var axis = {};
    axis.id = gpMap.axes[axisIndex];
    axis.stick = gpMap.sticks[axis.id];
    axis.index = axisIndex;
    axis.value = value;
    axis.zeroed = zeroed;

    var evt = new GamepadAxisEvent(gamepad,axis);
    evt.values = {};
    if(axis.stick==='leftStick'){
      evt.values.x = gamepad.getValueByAxisId('lx');
      evt.values.y = gamepad.getValueByAxisId('ly');
    } else if(axis.stick==='rightStick'){
      evt.values.x = gamepad.getValueByAxisId('rx');
      evt.values.y = gamepad.getValueByAxisId('ry');
    }

    // this.onGamepadAxis(evt);
    this.inputController.dispatchEvent(this,this.onGamepadAxis, evt);
  }

  _onGamepadAxis(evt){
    var l;
    for(var i=listeners.length-1; i>=0; i--){
      l = listeners[i];
      if(!l){
        continue;
      }

      let func = l[evt.stick];
      if(!func){
        continue;
      }
      // only fire for correct gamepadIndex
      if(l.gamepadIndex >= 0 && l.gamepadIndex !== evt.gamepadIndex){
        continue;
      }

      let bndr = l.binder || l;
      if(func.call(bndr,evt.values.x,evt.values.y,evt) === false){
        continue;
      }
      return;
    }
  }
  onGamepadAxis(l,evt){
    let func = l[evt.stick];
    if(!func){
      return
    }
    // only fire for correct gamepadIndex
    if(l.gamepadIndex >= 0 && l.gamepadIndex !== evt.gamepadIndex){
      return
    }

    let bndr = l.binder || l;
    if(func.call(bndr,evt.values.x,evt.values.y,evt) === false){
      return
    }
  }
}

class GamepadButtonEvent {
  constructor(gamepad,button,down) {
    this.gamepad = gamepad;
    this.gamepadIndex = gamepad.index;
    this.button = button;
    this.down = down;
    this.type = 'gamepadButtonEvent';
    this.keyCode = button.index;
    this.keyIdentifier = button.id;
  }
}



class GamepadAxisEvent {
  constructor(gamepad,axis) {
    this.gamepad = gamepad;
    this.gamepadIndex = gamepad.index;
    this.axis = axis;
    this.stick = axis.stick;
    this.keyCode = 200+axis.index;
    this.keyIdentifier = axis.id;
    this.values = axis.values;
    this.type = 'gamepadAxisEvent';
  }
}

Gamepad.prototype.getValueByAxisId = function(axisId){
  var gp = gamepadMaps[this.id];
  var ix = gp.axes.indexOf(axisId);
  if(ix>-1){
    return this.axes[ix];
  }
  return;
}

export default GamepadController