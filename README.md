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
// when your application starts up:

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
  fs: 'fs',
});
```

__uploads.js__
```js
// tie it all together
Container.shared.bind('uploads', Uploads, {
  eventStream: 'event-stream',
  storage: 'storage',
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

    + `CircularReferenceError`: a reference to the [`CircularReferenceError`](#class-circularreferenceerror) class.

### Class: `Container`

The heart of the `jerkface` project.  Each `Container` functions independently from one another.  All bindings and object instances are not shared across `Container` instances.

  * __Properties__

    + `Container.shared`: a static, convenience property for sharing an instance of `Container` across an application.  This property is by default `null`, and will throw a `TypeError` if you attempt to set it to anything other than `null` or an instance of `Container`.

  * __Method__

    + 
