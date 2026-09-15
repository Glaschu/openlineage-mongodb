#!/bin/sh
#
# Copyright 2018-2023 contributors to the Marquez project
# SPDX-License-Identifier: Apache-2.0
#
# Serves the production build and proxies /api to the Marquez/OpenLineage API.
# MARQUEZ_HOST / MARQUEZ_PORT / WEB_PORT are read by vite.config.ts.

set -e

exec npx vite preview --host 0.0.0.0 --port "${WEB_PORT:-3000}"
