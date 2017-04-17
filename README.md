# jerkface

I swore to myself I'd never do this.  I don't know how it even happened.  It kind of snuck up on me, and before I even realized what was happening I had written a dependency injection library for ECMAScript.  Now here it is.  It's fairly opinionated.  It suits my purposes, and perhaps it will fit your use case.  If not, don't worry, there's a bazillion other DI libraries out there all doing it a different way.

## Usage

Add `jerkface` to your project.  Or don't.

```sh
$ npm install jerkface -S
```

The `jerkface` DI library is primarily intended to work with constructible objects.  The idea is that you design your app around application boundaries.  Each boundary is represented by an abstraction.  Each module in your application is defined as a class whose constructor accepts a parameter that contains all of the class' dependencies.

An example:

```js
const elv = require('elv');

class EventStream {
  constructor(dependencies) {
    this.driver = elv.coalesce(dependencies.driver, () => new Driver());
  }

  write(message) {
    // use this.driver to write a message to the event stream
  }
}

class Storage {
  constructor(dependencies) {
    this.fs = dependencies.fs;
  }

  save(file) {
    // execute some business logic, and use this.fs to persist the file
  }
}

class Uploads {
  constructor(dependencies) {
    this.eventStream = dependencies.eventStream;
    this.storage = dependencies.storage;
  }

  save(file) {
    const self = this;
    // assume everything uses promises
    this.storage.save(file)
      .tap((info) => {
        return self.eventStream.write({
          topic: '/uploads/file/saved',
          payload: info,
        });
      });
  }
}
```

This design has a number of advantages over relying on _CommonJS_.  Not the least of which is that it makes unit testing extremely easy; as, dependencies can be very easily mocked out, and injected.

This has the beginnings of a very basic service-oriented-architecture.  Each `class` in the example above is basically a service.  It's fairly common that instances of services are managed as singletons in applications.  However, ensuring there is a single instance of each service in an app, and that each module can efficiently access that lone instance is the tricky part.

That's where `jerkface` comes in.  Simply configure each service as though it were a separate package in your app, and define its dependencies.

```js
// When your application starts up:

const Container = require('jerkface').Container;

Container.shared = new jerkface.Container();
```

__event-stream.js__
```js
// This class manages its own dependencies outside of jerkface, but can still be
// declared as a binding that is injectable into other services.

Container.shared.bind('event-stream', EventStream);
```

__storage.js__
```js
// Bindings do not have to be a constructor.  If a binding is an object, that
// instance will be returned.

Container.shared.bind('fs', require('fs'));

Container.shared.bind('storage', EventStream, {
  dependencies: { fs: 'fs' },
});
```

__uploads.js__
```js
// Tie it all together:

Container.shared.bind('uploads', Uploads, {
  dependencies: {
    eventStream: 'event-stream',
    storage: 'storage',
  },
});
```

Now when you want instance of `Uploads`:

```js
const uploads = Container.shared.resolve('uploads');
```

This method can be called over and over again, from multiple different modules, and you will always get the exactly same instance (there are caveats to this related to how various _CommonJS_ implementations, or whatever module system you're using, handles different versions of packages).

## API

The base module is an object with the following keys:

  * `Container`: a reference to the [`Container`](#class-container) class.

  * `errors`: an object with the following keys:

    + `BindingConfigurationError`: a reference to the [`BindingConfigurationError`](#class-bindingconfigureationerror) class.

    + `CircularReferenceError`: a reference to the [`CircularReferenceError`](#class-circularreferenceerror) class.

    + `MissingDependencyError`: a reference to the [`MissingDependencyError`](#class-missingdependencyerror) class.

### Class: `Container`

The heart of the `jerkface` project.  Each `Container` functions independently from one another.  All bindings and object instances are not shared across `Container` instances.

  * __Properties__

    + `Container.shared`: a static, convenience property for sharing an instance of `Container` across an application.  This property is by default `null`, and will throw a `TypeError` if you attempt to set it to anything other than `null` or an instance of `Container`.

  * __Method__

    + `Container.prototype.bind(name, target [, options])`: binds `name` to `target`.

      Dependencies do not have to be bound in a specific order.  The `jerkface` module only requires that the entire dependency graph be configured before `Container.prototype.resolve()` is called.

      Additionally, the `Container.prototype.bind()` method will traverse the dependency graph, and ensure that no circular references are created.  If a circular dependency is detected, a `CircularReferenceError` is thrown.

      Subsequent calls to `Container.prototype.bind()` with an existing `name`, will overwrite the previously configured binding.

      _Parameters_

      - `name`: _(required)_ the name by which this binding is know.  All other bindings, will reference this name when declaring dependencies to other bindings.

      - `target`: _(required)_ the object to which `name` is bound.  This can be either a constructor function, or any type.  In the event a constructor function is provided, it is new'ed up when `name` is resolved.

      - `options`: _(optional)_ an object that can be provided to further customize how `jerkface` treats a binding.  Keys include:

        - `dependencies`: _(optional)_ an object where each key maps to the name of a key on the `dependencies` object argument on a bound constructor.  See [Bound Constructors](#bound-constructors) for more information.  If `target` is not a constructor function then setting the `dependencies` key will result in a `BindingConfigurationError` being thrown.  This key defaults to `null`.

        - `lifetime`: _(optional)_ how the lifetime of constructed object is to be managed.  This value is always a string, and can be either `"singleton"` or `"transient"`.  If `lifetime` is set to `"transient"`, then an instance of `target` is new'ed up every time `resolve()` is called.  If `lifetime` is set to `"singleton"`, which is the default, then a single instance is created.  If the `target` argument is not a constructor function, and this option is set, then `BindingConfigurationError` is thrown.

        - `params`: _(optional)_ an array of additional parameters expected by the constructor function specified by `target`.  See [Bound Constructors](#bound-constructors) for more information.

    + `Container.prototype.bindAll(base, dependencies)`: supplements all bindings where a `target` constructor function is derived from `base` with additional dependencies.

      For example, lets assume `ClassA` extends `ClassB`, and `ClassA` is bound to the name `a`.  `ClassA` also has a dependency to a binding named `foo`.  `ClassB` is configured using `bindAll()`, and specifies the binding `bar` as a dependency.  When the binding `a` is resolved, `ClassA` will be new'ed with both `foo` and `bar` in its `dependencies` map.

      _Parameters_

      - `base`: _(required)_ the target super class.

      - `dependencies`: _(required)_ an object where each key maps to the name of a key on the `dependencies` object argument on a bound constructor.  See [Bound Constructors](#bound-constructors) for more information.

    + `Container.prototype.resolve(name)`: returns an instance of the object bound to `name`.  If the bound object is a constructor function, it is invoked with all configured parameters and dependencies, and returned.

      If the binding is managed as a singleton, it is lazily constructed when `resolve()` is called, and all subsequent calls to `resolve()` for the same `name` return the same instance.

      If the binding specified by `name` has a dependency that has not been configured, then `MissingDependencyError` is thrown.

      _Parameters_

      - `name`: _(required)_ a string that specifies the name of the binding to resolve.

#### Bound Constructors

When a `target` constructor is added as a binding using `jerkface`, it is important to keep in mind how the `Container` class injects arguments into the function.  This is largely dictated by the `options` provided to `Container.prototype.bind()`.

When `options.dependencies` is provided, an object with identical keys is provided to the constructor.  However, each key value is replaced by the resolved binding name.

When `options.params` is provided, the constructor is called with each item in the array provided as a separate argument.  In this scenario, if the binding was configured with `options.dependencies`, then the `dependencies` object will be the last argument provided to the constructor.

__Example__

```js
const Container = require('jerkface').Container;
const container = new Container();

class Test {
  constructor(a, b, dependencies) {
    console.log(a);
    console.log(b);
    console.log(dependencies.c)l
  }
}

container.bind('test', Test, {
  dependencies: {
    c: 'c',
  },
  params: [1, 2],
});

container.bind('c', 3);

const test = container.resolve('test');
// Written to the console:
//   1
//   2
//   3
```

### Class: `BindingConfigurationError`

Thrown when `options` provided to the `Container.prototype.bind()` method are invalid.

This class is extends the builtin `Error` class.

### Class: `CircularReferenceError`

Thrown when attempting to create a binding with a dependency that has a dependency to the original binding.  Calling `Container.prototype.bind()` will cause `jerkface` to walk the entire dependency chain, and `CircularReferenceError` will be thrown even if the dependency is several times removed from the original binding.

For example, `a` depends on `b`, and `b` depends on `c`.  If either `b` or `c` depends on `a`, then a circular reference is created, and an error is thrown.

This class is extends the builtin `Error` class.

### Class: `MissingDependencyError`

Thrown when `Container.prototype.resolve()` is called on a binding who's dependencies have not been fully configured.

This class is extends the builtin `Error` class.
