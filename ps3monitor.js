"use strict";

// Std library modules
var fs = require('fs');       // files system

// App modules
var ping = require ('./ping');
var rpc = require('./mq/rpc');
var tools = require('./tools');

/*----------------------------------------------------
    Settings
----------------------------------------------------*/
var APPNAME = 'ps3monitor';
var DEVICENAME = 'PS3';
var HOST = '192.168.1.2';     // PS3 IP address (NOT host name)
var REFRESH = 1000;    // ping every 1000 milliseconds (ms)

var MODULE = 'ps3monitor';
var VERSION = '0.3';


/*----------------------------------------------------
    Signal and exception handlers
----------------------------------------------------*/
// Log uncaught exceptions
process.on('uncaughtException', function(err) {
  log('Uncaught exception: ' + err);
});

// register signal handlers (to enable graceful exit)
process.once('SIGINT', function () {
  // test with:   sudo kill -s SIGINT <PID>
  log('Interrupt signal (SIGINT) received.');
  exitGracefully();
});

process.once("SIGTERM", function() {
    // Exit gracefully on a terminate signal
    log('Terminate signal (SIGTERM) received.');
    exitGracefully();
 });

function exitGracefully() {
  log ('Exiting gracefully...');
  pinger.stop();
  
  log(': Pinger stopped.');
}

/*----------------------------------------------------
    Logging
    Note: Upstart will capture stdout/stderr and redirect to the log file at /var/log/upstart/ps3monitor.log
----------------------------------------------------*/

function log(message) {
    // Add date/time and module name then log
    console.log(tools.getDateTime() + ' : ' + MODULE + ': ' + message);
}

/*----------------------------------------------------
    Main App
----------------------------------------------------*/
log(APPNAME + ' is starting up...');

// Set up the pinger
log('Initialising the pinger...');
var pinger = new ping.PingerClass(HOST, REFRESH, 3, 0, 10);

pinger.on('device', function(status) {
  /*
    Triggered when a device status changes ON/OFF
  */
  var activity = null;
  var location = null;
  var cb = null;

  log(DEVICENAME + ' is now: ' + status + '.');

  if (status === ping.ONSTATUS) {
    activity = 'USE THE PS3';  // USE THE PS3
    location = 'LOUNGE';
    cb = rpcCallback;
  } else if (status === ping.OFFSTATUS) {
    activity = 'LOUNGE OFF';
    location = 'LOUNGE';
    cb = rpcCallback;
  }

  if (activity && location && cb) {
    var q = 'activitymanager';
    log('Invoking activity: ' + activity + ' at location: ' + location);
    rpc.send(rpc.messageEncode(activity=activity, location=location), q, cb);
  } else {
    log('ERROR: Device changed to unknown status');
  }
});


function rpcCallback(err, response) {
  /*
    Default handler for the RPC response
  */

  // Indicate that a response was received
  rpc.responseReceived();

  // Extract the response from the message
  response = rpc.messageDecode(response);

  // Process the response
  if(err) {
    log('RPC ERROR: ', err.message);
  } else if (response) {
    if (typeof response === 'boolean'){
      if (response) {
        log('RPC Response: OK');
      } else {
        log('RPC Response: NOT OK');
      }
    } else {
      log('RPC Response: ', response);
    }
  } else if (!response){
    log ('RPC command failed.');
  }
  // Close the connection
  rpc.close();
}


process.on('exit', function() {
  log('All Done');
});

// Now start the pinger
log('Starting up...');
pinger.start();

