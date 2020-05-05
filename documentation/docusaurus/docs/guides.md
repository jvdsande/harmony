---
title: Guides
sidebar_label: Getting started
---
## Introduction

HarmonyJS is a full-featured NodeJS framework, aimed at creating fast, efficient, scalable and reactive
websites and applications.

Built around GraphQL, HarmonyJS is a data-centric framework: the entry point of all code
is the data-model, and all development is made around it, not against it.


## Philosophy

HarmonyJS relies on established as well as state-of-the-art technologies such as changestreams, 
websockets and GraphQL to provide amazing performances and an awesome developer experience.

All parts of HarmonyJS are built with stateless-ness in mind, inspired by GraphQL resolvers 
which are a big part of the core framework. Because of this stateless philosophy, Harmony 
applications are scalable horizontally out-of-the-box.


## Getting started

HarmonyJS is composed of three core packages: `@harmonyjs/server`, `@harmonyjs/persistence` and `@harmonyjs/query`.

- On the server-side, `@harmonyjs/server` provides the core functionality of a webserver. `@harmonyjs/persistence` helps
us define and access our data.
- On the client-side, `@harmonyjs/query` allows us to write our API calls and subscribe to our data changes.

HarmonyJS packages are standard NPM packages and require no specific CLI whatsoever. Just add them to your project.

**Server-side installation:**

```bash
npm i @harmonyjs/server @harmonyjs/persistence
```

**Client-side installation:**

```bash
npm i @harmonyjs/query
```


## Going further
You can jump into exploring the [API](/docs/api), or continue with one of our [guides](/docs/guides/server).
