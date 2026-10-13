#!/bin/sh
set -eu

# Render Blueprints provide the managed database's host/port/name separately.
# Local Docker Compose and manually configured Render services can provide DB_URL directly.
if [ -z "${DB_URL:-}" ]; then
  : "${DB_HOST:?Set DB_URL or DB_HOST}"
  : "${DB_NAME:?Set DB_URL or DB_NAME}"
  DB_PORT="${DB_PORT:-5432}"
  export DB_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

exec java -jar /app/app.jar
