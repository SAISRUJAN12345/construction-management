#!/bin/sh
# Lightweight Maven launcher. Uses installed Maven when available; otherwise downloads Maven 3.9.9.
set -eu
MAVEN_VERSION="3.9.9"
if command -v mvn >/dev/null 2>&1; then
    exec mvn "$@"
fi
MAVEN_USER_HOME="${MAVEN_USER_HOME:-${HOME}/.m2}"
MAVEN_ROOT="${MAVEN_USER_HOME}/wrapper/dists/apache-maven-${MAVEN_VERSION}"
MAVEN_HOME="${MAVEN_ROOT}/apache-maven-${MAVEN_VERSION}"
MAVEN_BIN="${MAVEN_HOME}/bin/mvn"
if [ ! -x "$MAVEN_BIN" ]; then
    mkdir -p "$MAVEN_ROOT"
    ARCHIVE="${MAVEN_ROOT}/apache-maven-${MAVEN_VERSION}-bin.zip"
    URL="https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/${MAVEN_VERSION}/apache-maven-${MAVEN_VERSION}-bin.zip"
    if command -v curl >/dev/null 2>&1; then
        curl -fL --retry 2 "$URL" -o "$ARCHIVE"
    elif command -v wget >/dev/null 2>&1; then
        wget -O "$ARCHIVE" "$URL"
    else
        echo "Error: curl or wget is required to download Maven ${MAVEN_VERSION}." >&2
        exit 1
    fi
    if ! command -v unzip >/dev/null 2>&1; then
        echo "Error: unzip is required to extract Maven ${MAVEN_VERSION}." >&2
        exit 1
    fi
    unzip -q -o "$ARCHIVE" -d "$MAVEN_ROOT"
    rm -f "$ARCHIVE"
fi
exec "$MAVEN_BIN" "$@"
