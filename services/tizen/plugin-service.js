/* global module, require, process */
"use strict";

var SERVICE_TAG = "[Nuvio PluginService]";
var DEFAULT_PORT = 2711;
var FALLBACK_PORT = 11471;

function runtimeProcess() {
  try {
    return typeof process !== "undefined" && process ? process : null;
  } catch (_) {
    return null;
  }
}

function runtimeEnv(name) {
  var currentProcess = runtimeProcess();
  return currentProcess && currentProcess.env ? currentProcess.env[name] : null;
}

var configuredPort = normalizePort(runtimeEnv("NUVIO_PLUGIN_SERVICE_PORT"), DEFAULT_PORT);
var candidates = [configuredPort];
if (FALLBACK_PORT !== configuredPort) candidates.push(FALLBACK_PORT);
var candidateIndex = 0;
var server = null;
var activePort = 0;
var startRequested = false;
var lifecycleToken = 0;

function normalizePort(value, fallback) {
  var parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1024 && parsed <= 65535 ? parsed : fallback;
}

function errorText(error) {
  return error && error.stack ? error.stack : String(error || "Unknown plugin service error");
}

function closeServer(target) {
  if (!target || typeof target.close !== "function") return;
  try {
    target.close();
  } catch (_) {
    // A server that failed during listen may already be closed.
  }
}

function probeNodeRuntime() {
  var http = require("http");
  if (typeof http.createServer !== "function") {
    throw new Error("http.createServer is unavailable");
  }
}

function failStart(token, error) {
  if (token !== lifecycleToken) return;
  startRequested = false;
  activePort = 0;
  if (server) {
    closeServer(server);
    server = null;
  }
  console.error(SERVICE_TAG + " failed to listen", errorText(error));
}

function bindCandidate(token, pluginHttp) {
  if (token !== lifecycleToken) return;
  if (candidateIndex >= candidates.length) {
    failStart(token, new Error("No available local plugin service port"));
    return;
  }

  var candidate = candidates[candidateIndex];
  var localServer;
  try {
    localServer = pluginHttp.createPluginHttpServer({ port: candidate });
    if (!localServer || typeof localServer.listen !== "function") {
      throw new Error("Plugin HTTP server is unavailable");
    }
  } catch (error) {
    failStart(token, error);
    return;
  }

  server = localServer;
  var listening = false;
  var handled = false;
  function markListening() {
    if (token !== lifecycleToken || handled) {
      closeServer(localServer);
      return;
    }
    listening = true;
    activePort = candidate;
  }
  localServer.on("listening", markListening);
  localServer.on("error", function (error) {
    if (token !== lifecycleToken) {
      closeServer(localServer);
      return;
    }
    if (listening) {
      console.error(SERVICE_TAG + " server error", errorText(error));
      return;
    }
    if (handled) return;
    handled = true;
    closeServer(localServer);
    if (error && error.code === "EADDRINUSE" && candidateIndex < candidates.length - 1) {
      server = null;
      candidateIndex += 1;
      console.warn(
        SERVICE_TAG +
          " port " +
          candidate +
          " is already in use; trying 127.0.0.1:" +
          candidates[candidateIndex]
      );
      bindCandidate(token, pluginHttp);
      return;
    }
    server = null;
    failStart(token, error);
  });

  try {
    // Keep the exact one-argument overload used by the working EngineFS
    // runtime. Some Tizen lightweight runtimes acknowledge the host/callback
    // overload without creating a reachable loopback listener.
    localServer.listen(candidate);
  } catch (error) {
    if (!handled) {
      handled = true;
      closeServer(localServer);
      server = null;
      failStart(token, error);
    }
  }
}

function start() {
  if (startRequested) {
    return;
  }

  startRequested = true;
  candidateIndex = 0;
  activePort = 0;
  var token = ++lifecycleToken;
  try {
    probeNodeRuntime();
    var pluginHttp = require("../plugin-http.cjs");
    if (!pluginHttp || typeof pluginHttp.createPluginHttpServer !== "function") {
      throw new Error("Plugin HTTP implementation is unavailable");
    }
    bindCandidate(token, pluginHttp);
  } catch (error) {
    failStart(token, error);
  }
}

function stop() {
  lifecycleToken += 1;
  startRequested = false;
  candidateIndex = 0;
  activePort = 0;
  var current = server;
  server = null;
  closeServer(current);
}

// Tizen Web Service applications are entered through onStart. Keeping the
// server out of module evaluation makes startup, failure reporting and
// shutdown follow the same lifecycle as the working EngineFS service.
module.exports.onStart = start;
module.exports.onExit = stop;
// Compatibility alias for older Tizen service runtimes.
module.exports.onStop = stop;
