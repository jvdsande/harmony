---
title: HarmonyJS Logger
sidebar_label: "@harmonyjs/logger"
---

`@harmonyjs/logger` is the logger used internally by HarmonyJS, exposed as a module for
convenience. It allows outputting consistent and formatted logs, as well as configuring
the logging level.

The logs are formatted using timestamps and a prefix specific to each logger.

## Default export

`@harmonyjs/logger`'s default export is the `Logger() : ILogger` factory.

This factory creates a new `ILogger` instance. 


:::note
`@harmonyjs/logger` is intended for server-side use only.
:::

```ts
Logger({ 
  name, configuration
 } : { 
  name: string, configuration: LoggerConfig
 }) : ILogger
```

It takes a name and a [`LoggerConfig`](#loggerconfig) object, and returns a configured
`ILogger`.


<b style={{display: "block", marginBottom: "-1.5rem" }}>Sample usage</b>

```js
import Logger from '@harmonyjs/logger'

const logger = Logger({
  name: 'TestLogger',
  configuration: {
    console: true,
  }
})

logger.info('I am a logger')
// Output: DD/MM/YY hh:mm:SS.sss TestLogger [INFO   ] I am a logger
```

## Exported types

### `LogLevel`

The `LogLevel` enum exports the various logging level handled by Harmony.

```ts
type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'silly'
```

<br />

---

### `LoggerConfig`

The `LoggerConfig` object describes the various parameters available when creating a new `Logger`.

```ts
{
  disabled?: boolean,
  level?: LogLevel,
  file?: false | string | {
    filename: string,
    timestamp?: boolean,
  },
  console?: boolean | {
    colors?: boolean,
    timestamp?: boolean,
  },
}
```

#### `LoggerConfig::disabled`

Allows to temporarily disable all logs for a given logger.

#### `LoggerConfig::level`

Sets the level of the logger.

#### `LoggerConfig::file`

Whether to log to a file or not. Enabled by default in production environment.

Set to `false` to disable file logging even in production.

Set to a `string` to specify the filename and keep other options as default.

Set to an object for fine-tuning each options. Available options are:
* `filename`: name of the file to save logs to. Defaults to `harmony.log`
* `timestamps`: whether to include a timestamp at the beginning of each log. Defaults to `true`.

Setting a `string` or an object is considered as activating file logging.

#### `LoggerConfig::console`

Whether to log to the console or not. Disabled by default in production environment.

Set to `false` to disable console logging in all environments.

Set to `true` to enable console logging in all environments while keeping other options as default.

Set to an object for fine-tuning each options. Available options are:
* `colors`: whether to color the output. Default to `true`.
* `timestamps`: whether to include a timestamp at the beginning of each log. Defaults to `true`.

Setting a `string` or an object is considered as activating console logging.

<br />

---

### `ILogger`

The `ILogger` type represents a `Logger` instance.

```ts
interface ILogger {
  configure(config: LoggerConfig): this

  level: LogLevel

  log(message: string|(() => string), ...meta: any[]): this
  error(message: string|(() => string), ...meta: any[]): this
  warn(message: string|(() => string), ...meta: any[]): this
  info(message: string|(() => string), ...meta: any[]): this
  verbose(message: string|(() => string), ...meta: any[]): this
  debug(message: string|(() => string), ...meta: any[]): this
  silly(message: string|(() => string), ...meta: any[]): this
}
```

#### `ILogger::configure`

Can be called at any given moment to change the configuration of the logger. The old
configuration is completely overwritten with the new one.

#### `ILogger::level`

Access to the logger's level. Can be used to read the current level in use, or to set
the new level for all following logs.

#### `ILogger::log`

Log the given string at the `debug` level. In console, will also log a warning advising
against the usr of `log` function.

Left in the spec to ease transition for people used to the `console.log` statement.

#### `ILogger::{level}`

All the following functions are used to log a message at a given level.

The message can be a function returning a `string` instead of directly a `string`.
In this case, the function will only be called if the current level allows the log to be
displayed.

This is useful to avoid computations needed to produce debug logs when the level is higher than `'debug'`,
as is usually the case in production environments.
