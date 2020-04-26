---
title: API Reference
sidebar_label: Introduction
---

Here you can find a fully exhaustive presentation of all Harmony's core APIs

_**Note:** this section only covers API exposed by `@harmonyjs/server`, `@harmonyjs/persistence` and `@harmonyjs/query`._
_In order to learn about the various Plugins API (Controllers and Adapters), refer to the [Plugins](/plugins) section._

## Typescript

HarmonyJS is completely written using Typescript. As such, all type names referenced in this documentation are the actual
Typescript types used in the framework.

## `@harmonyjs/server`

The `@harmonyjs/server` package exposes the API needed to bootstrap an Harmony application. It's the cornerstone of the
server part. Find its full API [here](/api/server).


## `@harmonyjs/persistence`

`@harmonyjs/persistence` provides a way to describe our data, configure database access and optionally compile a
GraphQL schema. Its API can be found [here](/api/persistence).


## `@harmonyjs/query`

Finally, the `@harmonyjs/query` packages is used on the client side to create our server calls. Read the API [here](/api/query).
