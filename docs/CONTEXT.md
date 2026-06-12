# CONTEXT

Roam Research plugin that provides keyboard-driven, fuzzy-search navigation across all pages in the user's graph. Loaded via Roam Depot; runs inside the Roam browser app.

## Problem

Roam Research's native navigation is click-heavy. Power users with large graphs need a fast, keyboard-driven way to jump between pages without leaving the keyboard.

## Target State

A Roam Depot plugin (`extension.js`) that overlays a search palette on top of Roam, letting the user type to fuzzy-filter all page titles and jump to any page instantly.

## Users

Individual Roam power users; initially the author (`koziar.artem@gmail.com`).

## Non-Goals

- Not a full Roam client
- Not a graph editor or data exporter
- No writes to Roam graph in v1 (navigation only)
- No MCP dependency — runs entirely inside the Roam browser app
