#!/bin/bash

# Define application file names
APP_JS="app.js"
WS_SERVER_JS="wsServer.js"
PUSH_SERVER_JS="pushServer.js"  # New server file

# Find and kill processes for app.js
APP_PID=$(pgrep -f "node .*${APP_JS}")
if [ -n "$APP_PID" ]; then
  echo "Stopping ${APP_JS} with PID: $APP_PID"
  kill -9 "$APP_PID"
else
  echo "No running process found for ${APP_JS}"
fi

# Find and kill processes for wsServer.js
WS_SERVER_PID=$(pgrep -f "node .*${WS_SERVER_JS}")
if [ -n "$WS_SERVER_PID" ]; then
  echo "Stopping ${WS_SERVER_JS} with PID: $WS_SERVER_PID"
  kill -9 "$WS_SERVER_PID"
else
  echo "No running process found for ${WS_SERVER_JS}"
fi

# Find and kill processes for pushServer.js
PUSH_SERVER_PID=$(pgrep -f "node .*${PUSH_SERVER_JS}")
if [ -n "$PUSH_SERVER_PID" ]; then
  echo "Stopping ${PUSH_SERVER_JS} with PID: $PUSH_SERVER_PID"
  kill -9 "$PUSH_SERVER_PID"
else
  echo "No running process found for ${PUSH_SERVER_JS}"
fi

# Start app.js with nohup
echo "Starting ${APP_JS}..."
nohup node "${APP_JS}" > output.log 2>&1 &
echo "${APP_JS} started with PID: $!"

# Start wsServer.js with nohup
echo "Starting ${WS_SERVER_JS}..."
nohup node "${WS_SERVER_JS}" > weblog.log 2>&1 &
echo "${WS_SERVER_JS} started with PID: $!"

# Start pushServer.js with nohup
echo "Starting ${PUSH_SERVER_JS}..."
nohup node "${PUSH_SERVER_JS}" > pushlog.log 2>&1 &
echo "${PUSH_SERVER_JS} started with PID: $!"

