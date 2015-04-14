/*
  ping.js
  
  pings the nominated IP device and triggers an event if the device is turned on or off
  
  usage:
    see test at end of this module
*/

"use strict";

// Std library modules
var events = require('events');
var util = require('util');     // previously call sys module
var exec = require('child_process').exec;

// Global Configuration defaults
var ONCOUNT = 3;      // Number of statuses to retain in the status queue/history
var RETRIES = 0;      // Retries for each ping command sent
var TIMEOUT = 50;    // in milliseconds (ms) Ping google takes about 40ms, ping ps3 takes < 1 ms

var ONSTATUS = 'on';
var OFFSTATUS = 'off';
var UNKNOWNSTATUS = 'unknown';

var MODULE = 'ping.js';
var VERSION = '1.0';

// expose the class and constants to other modules
exports.PingerClass = PingerClass;
exports.ONSTATUS = ONSTATUS;
exports.OFFSTATUS = OFFSTATUS;


function PingerClass(host, refresh, oncount, retries, timeout) {
  /*
    User defined class constructor function
    Fires off the constructor for the parent class: events.EventEmitter
  */
  
  if (false === (this instanceof PingerClass)) {
    // not called as a new class instance so return as a class instance and start again
    return new PingerClass(host, refresh, oncount, retries, timeout);
  }
  
  var self = this;    // the specific instance of this class
  
  // Required arguments
  if (!host || !refresh) {
    console.log(MODULE + ': Missing required argument');
    return null;
  } else {
    self.host = host;
    self.refresh = refresh;
  }
  
  // Use default options if not specified
  if (typeof oncount === 'undefined') {
    self.oncount = ONCOUNT;
  } else {
    self.oncount = oncount;
  }
  if (typeof retries === 'undefined') {
    self.retries = RETRIES;
  } else {
    self.retries = retries;
  }
  if (typeof timeout === 'undefined') {
    self.timeout = TIMEOUT;
  } else {
    self.timeout = timeout;
  }

  // Fire the parent class constructor
  events.EventEmitter.call(self);
}

// Sub-class events.EventEmitter and inherit the prototype methods from the parent constructor
util.inherits(PingerClass, events.EventEmitter);

/* ----------------------------------
 Define the class methods separately
-------------------------------------*/
PingerClass.prototype.start = function(){
  /*
    Start pinging
  */
  var self = this;    // the object instance
  self.laststatus = OFFSTATUS;
  self.pingResults = [self.laststatus];   // Queue (list) of ping results from oldest to newest

  if(!(self instanceof PingerClass)) {
    console.log(MODULE + ': Invalid class instance reference in PingerClass.start()');
    return;
  }

  console.log(MODULE + ': Starting...');

  // Listen to ping events and determine whether the device has turned on or off
  self.on('ping', function(result){
    self.deviceStatus(result);
    //console.log(MODULE + ': On: ' + result);
  });
  
  // Start regular pinging
  // Pass the host name/ip and the PingerClass instance to the ping function
  self.pingerId = setInterval(self.ping, self.refresh, self);
}


PingerClass.prototype.stop = function(){
  /*
    Stop pinging
  */
  var self = this;    // The class instance

  if(!(self instanceof PingerClass)) {
    console.log('Invalid class instance reference in PingerClass.stop()');
    return;
  }
  console.log(MODULE + ': Stopping pinger...');

  clearInterval(self.pingerId);
  self.removeAllListeners();
}

PingerClass.prototype.ping = function(self){
  //self needs to be passed to this method because it is an instance of setTimeout and not PingerClass

  if(!(self instanceof PingerClass)) {
    console.log(MODULE + ': Invalid class instance reference in PingerClass.ping()');
    return;
  }
  
  // Ping the nominated host once. Redirect all output to null
  var cmd = 'ping -n -W ' + self.timeout + ' -c 1 ' + self.host + ' > /dev/null 2>&1';
  var child = exec(cmd, function (error, stdout, stderr) {
    //console.log('stdout: ' + stdout);
    if (error) {
      // Timeout or other error (invalid IP etc)
      //console.log('Ping timeout or error: ' + error);
      //console.log('stderr: ' + stderr);
      self.emit('ping', OFFSTATUS);
    } else {
      // Host is alive
      self.emit('ping', ONSTATUS);
      //console.log('ALIVE\n: ' + ONSTATUS);
    }
  });
}

PingerClass.prototype.deviceStatus = function(currentPingResult) {
  /*
  */
  var self = this;    // The class instance

  if(!(self instanceof PingerClass)) {
    console.log(MODULE + ': Invalid class instance reference in PingerClass.deviceStatus()');
    return;
  }

  // add the latest ping result to the status list e.g. ['unknown', 'on', 'on']
  self.pingResults.push(currentPingResult);
  if (self.pingResults.length > self.oncount) {
      // Keep only the last <oncount> results, so drop the oldest
      self.pingResults.shift();
  }

  // Determine the current status of the device
  // Count the number of ons and offs in the list
  var on = 0;
  var off = 0;
  var i;
  for (i=0; i < self.pingResults.length; i++) {
    if (self.pingResults[i] === ONSTATUS) {
      on++;
    } else if (self.pingResults[i] === OFFSTATUS) {
      off++;
    }
  }

  if (on === self.oncount) {
    // 3 ons so Definitely on
    self.currentstatus = ONSTATUS;
  } else if (off === self.oncount) {
    // 3 offs so definitely off
    self.currentstatus = OFFSTATUS;
  } else {
    // Not sure
    self.currentstatus = UNKNOWNSTATUS;
  }
  
  // Check whether the device's status has changed
  if (self.currentstatus !== self.laststatus && self.currentstatus !== UNKNOWNSTATUS) {
    // The status has changed so trigger a device event
    self.emit('device', self.currentstatus);
   // Save the current status
    self.laststatus = self.currentstatus;
  }
}


// Housekeeping
process.on('exit', function() {
  console.log(MODULE + ': All Done.');
});
process.on('uncaughtException', function(err) {
  console.log(MODULE + ': Uncaught exception: ' + err);
});



// Tests
if(require.main === module) {
  var host = '192.168.1.1';
  var refresh = 500;

  var p = new PingerClass(host, refresh);
  p.on('device', function(status) {
    console.log(MODULE + ': Device status changed to: ' + status);
  });

  process.once('SIGINT', function() {
    console.log('\n' + MODULE + ': Interrupt received. Now exiting...');
    p.stop();
  });

  p.start();
}

