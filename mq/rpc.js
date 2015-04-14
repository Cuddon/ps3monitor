/*
  process a single Remote Procedure Call (RPC)
*/
"use strict";

// Std Modules
var amqp = require('amqp');
var util = require('util');

// Third Pary Modules
var amqprpc = require('./amqprpc');

var mqBrokerOptions = {
  host: '192.168.1.1',
  port: 5672,
  login: 'guest',
  password: 'guest',
  vhost: '/'
};

var MODULE = 'rpc.js';

// Create connection to RabbitMQ
//var connection = null;
var connection = null;
var rpc = null;
var outstanding = 0;    // Number of outstanding calls

function send(message, queue, callback) { 
  // Process an RPC call
  if (outstanding === 0) {
    connection = amqp.createConnection(mqBrokerOptions);
    rpc = new amqprpc(connection);
  }
  outstanding += 1;
  
  if (typeof callback === 'undefined') {
    callback = defaultResponseHandler;
  }
  
  connection.on("ready", function(){
    console.log("Sending request: " + util.inspect(message.content));

    // Make the request
    rpc.makeRequest(queue, message, callback);
  });
}

function close() {
  if (outstanding === 0) {
    connection.end();
    connection = null;
    rpc=null;
  }
}

function defaultResponseHandler(err, response) {
  /*
    Default RPC response handler
  */

  response = messageDecode(response);
  responseReceived();
  if(err) {
    console.error(err);
  } else {
    console.log(MODULE, ': Response: ', response);
  }
  
  // Close the connection
  close();
}

function responseReceived() {
  outstanding -= 1;
}

function messageEncode(activity, location, device, command) {
  activity = typeof activity !== 'undefined' ? activity : null;
  location = typeof location !== 'undefined' ? location : 'all';
  device = typeof device !== 'undefined' ? device : null;
  command = typeof command !== 'undefined' ? command : null;
  
  return {'content': {
    'location': location, 
    'activity': activity, 
    'device': device, 
    'command': command
  }};
}

function messageDecode(msg) {
  // converts stream to json text, then to an object, then returns item response within item content

  if (msg) {
    //console.log(JSON.parse(msg.data.toString('utf8')).content.response);
    return JSON.parse(msg.data.toString('utf8')).content.response;
  } else {
    // null, false etc
    console.log(MODULE + ': null/false message received from message broker');
    return msg;
  }
}


// Exports
exports.send = send;
exports.responseReceived = responseReceived;
exports.close = close;
exports.messageEncode = messageEncode;
exports.messageDecode = messageDecode;

// Tests
function getCurrentActivityCallback(err, response) {
  /*
    RPC response handler for getCurrentActivity
  */
  response = messageDecode(response);
  outstanding -= 1;
  if(err) {
    console.error(err);
  } else {
    console.log("Activity Status: ", response);
  }
  
  // Close the connection
  close();
}

if(require.main === module) {
  var q = 'activitymanager';
  var activity = 'USE THE PS3';
  var location = 'all';
  send(messageEncode(activity=activity, location=location), q);    // defaultResponseHandler
  send(messageEncode(activity='GET CURRENT ACTIVITY', location='all'), q, getCurrentActivityCallback);


}

