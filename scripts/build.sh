#!/usr/bin/env bash
set -eu

git submodule update --init --recursive

if [ "${CF_PAGES_BRANCH:-main}" = "main" ]; then
  hugo --gc --minify --cleanDestinationDir \
    --environment production \
    --baseURL "https://hengchaoxu.online/"
else
  if [ -z "${CF_PAGES_URL:-}" ]; then
    echo "CF_PAGES_URL is required for a preview build." >&2
    exit 1
  fi

  hugo --gc --minify --cleanDestinationDir \
    --environment preview \
    --baseURL "${CF_PAGES_URL}"
fi
