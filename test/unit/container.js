'use strict';

const assert = require('chai').assert;

const jerkface = require('../../lib');

const Container = jerkface.Container;
const errors = jerkface.errors;
const Lifetime = jerkface.Lifetime;


describe('Container', () => {

  beforeEach(() => {
    Container.shared = null;
  });

  describe('#shared', () => {
    it('should return null by default', () => {
      assert.isNull(Container.shared);
    });

    it('should throw if set to not null or Container', () => {
      assert.throws(() => {
        Container.shared = 42;
      }, TypeError);
    });

    it('should set to provided instance of Container', () => {
      const container = new Container();
      Container.shared = container;
      assert.strictEqual(Container.shared, container);
    });

    it('should set to null after being set to instance of Container', () => {
      const container = new Container();
      Container.shared = container;
      Container.shared = null;
      assert.isNull(Container.shared);
    });
  });


  describe('#bind', () => {
    it('should throw if arguments.length < 2', () => {
      const container = new Container();
      assert.throws(() => {
        container.bind('test');
      }, TypeError);
    });

    it('should throw if name not a string', () => {
      const container = new Container();
      assert.throws(() => {
        container.bind(42, {});
      }, TypeError);
    });

    it('should throw if target is null or undefined', () => {
      const container = new Container();
      assert.throws(() => {
        container.bind('test', null);
      }, TypeError);
    });

    it('should throw if dependencies provided, and no constructor', () => {
      const container = new Container();
      assert.throws(() => {
        container.bind('test', {}, {
          dependencies: {
            foo: 'bar',
          },
        });
      }, errors.BindingError);
    });

    it('should throw if dependencies not an object', () => {
      const Test = function () {};
      const container = new Container();
      assert.throws(() => {
        container.bind('test', Test, {
          dependencies: 42,
        });
      }, TypeError);
    });

    it('should throw if params provided, and no constructor', () => {
      const container = new Container();
      assert.throws(() => {
        container.bind('test', {}, {
          params: ['a'],
        });
      }, errors.BindingError);
    });

    it('should throw if params not an array', () => {
      const Test = function () {};
      const container = new Container();
      assert.throws(() => {
        container.bind('test', Test, {
          params: 42,
        });
      }, TypeError);
    });

    it('should throw if lifetime provided, and no constructor', () => {
      const container = new Container();
      assert.throws(() => {
        container.bind('test', {}, {
          lifetime: Lifetime.singleton,
        });
      }, errors.BindingError);
    });

    it('should throw if lifetime not singleton or transient', () => {
      const Test = function () {};
      const container = new Container();
      assert.throws(() => {
        container.bind('test', Test, {
          lifetime: 42,
        });
      }, TypeError);
    });

    it('should throw if circular dependency', () => {
      const Foo = function () {};
      const Bar = function () {};

      const container = new Container();

      container.bind('foo', Foo, {
        dependencies: { bar: 'bar' },
      });

      assert.throws(() => {
        container.bind('bar', Bar, {
          dependencies: { foo: 'foo' },
        });
      }, errors.CircularReferenceError);
    });

    it('should throw if upstream circular dependency', () => {
      const Foo = function () {};
      const Bar = function () {};
      const Baz = function () {};

      const container = new Container();

      container.bind('foo', Foo, {
        dependencies: { bar: 'bar' },
      });

      container.bind('bar', Bar, {
        dependencies: { baz: 'baz' },
      });

      assert.throws(() => {
        container.bind('baz', Baz, {
          dependencies: { foo: 'foo' },
        });
      }, errors.CircularReferenceError);
    });

    it('should throw circular dependency on ext binding', () => {
      const Foo = function () {};
      const Bar = function () {};
      Bar.prototype = Object.create(Foo.prototype);

      const container = new Container();

      container._extendedBindings.set(Foo, [
        {
          key: 'test',
          binding: 'bar',
        },
      ]);

      assert.throws(() => {
        container.bind('bar', Bar, {
          dependencies: { blah: 'blah' },
        });
      }, errors.CircularReferenceError);
    });

    it('should throw if circular dependency on upstream ext binding', () => {
      const Foo = function () {};
      const Bar = function () {};
      const Baz = function () {};
      Baz.prototype = Object.create(Foo.prototype);

      const container = new Container();

      container.bind('bar', Bar, {
        dependencies: { test: 'test' },
      });

      container._extendedBindings.set(Foo, [
        {
          key: 'test',
          binding: 'baz',
        },
      ]);

      assert.throws(() => {
        container.bind('baz', Baz, {
          dependencies: { test: 'test' },
        });
      }, errors.CircularReferenceError);
    });

    it('should materialize proper inheritence chain', () => {
      const Foo = function () {};
      const Bar = function () {};
      const Baz = function () {};
      const Qux = function () {};
      const Quux = function () {};

      Bar.prototype = Object.create(Foo.prototype);
      Baz.prototype = Object.create(Bar.prototype);
      Qux.prototype = Object.create(Baz.prototype);
      Quux.prototype = Object.create(Qux.prototype);

      const container = new Container();

      container._extendedBindings.set(Bar, [
        {
          key: 'a',
          binding: '1',
        },
      ]);

      container._extendedBindings.set(Foo, [
        {
          key: 'b',
          binding: '2',
        },
      ]);

      container._extendedBindings.set(Baz, [
        {
          key: 'c',
          binding: '3',
        },
      ]);

      container._extendedBindings.set(Qux, [
        {
          key: 'd',
          binding: '4',
        },
      ]);

      container.bind('quux', Quux, {
        dependencies: { e: '5' },
      });

      const expected = [Qux, Baz, Bar, Foo];

      assert.deepEqual(container._bindings.get('quux').chain, expected);
    });

    it('should internally persist constructor binding', () => {
      const Foo = function () {};
      const Bar = function () {};

      const container = new Container();

      container.bind('bar', Bar, {
        dependencies: { baz: 'baz' },
      });

      container.bind('foo', Foo, {
        dependencies: { bar: 'bar' },
      });

      assert.isTrue(container._bindings.has('foo'));
    });

    it('should internally persist non-constructor binding', () => {
      const container = new Container();
      container.bind('foo', 42);
      assert.isTrue(container._bindings.has('foo'));
    });

    it('should internally overwrite previously configured bindings', () => {
      const Foo = function () {};
      const container = new Container();
      container.bind('foo', Foo);
      container.bind('foo', 'abc');
      assert.strictEqual(container._bindings.get('foo').instance, 'abc');
    });

    it('should return self', () => {
      const container = new Container();
      const result = container.bind('foo', 42);
      assert.strictEqual(result, container);
    });
  });


  describe('#bindAll', () => {
    it('should throw if base not a function', () => {
      const container = new Container();

      assert.throws(() => {
        container.bindAll(42, { foo: 'foo' });
      }, TypeError);
    });

    it('should throw if dependencies not an object', () => {
      const Foo = function () {};
      const container = new Container();

      assert.throws(() => {
        container.bindAll(Foo, 42);
      }, TypeError);
    });

    it('should throw if dependencies null', () => {
      const Foo = function () {};
      const container = new Container();

      assert.throws(() => {
        container.bindAll(Foo, null);
      }, TypeError);
    });

    it('should throw if dependencies an array', () => {
      const Foo = function () {};
      const container = new Container();

      assert.throws(() => {
        container.bindAll(Foo, [42]);
      }, TypeError);
    });

    it('should throw if dependencies has no keys', () => {
      const Foo = function () {};
      const container = new Container();

      assert.throws(() => {
        container.bindAll(Foo, {});
      }, TypeError);
    });

    it('should throw if circular reference on inherited binding', () => {
      const Foo = function () {};
      const Bar = function () {};
      Bar.prototype = Object.create(Foo.prototype);

      const container = new Container();

      container.bind('bar', Bar);

      assert.throws(() => {
        container.bindAll(Foo, { bar: 'bar' });
      }, errors.CircularReferenceError);
    });

    it('should throw if circular reference on upstream binding', () => {
      const Foo = function () {};
      const Bar = function () {};
      const Baz = function () {};

      Bar.prototype = Object.create(Foo.prototype);

      const container = new Container();

      container.bind('bar', Bar);
      container.bind('baz', Baz, {
        dependencies: { bar: 'bar' },
      });

      assert.throws(() => {
        container.bindAll(Foo, { baz: 'baz' });
      }, errors.CircularReferenceError);
    });

    it('should throw if circular reference with multi inherited', () => {
      const Foo = function () {};
      const Bar = function () {};
      const Baz = function () {};

      Bar.prototype = Object.create(Foo.prototype);
      Baz.prototype = Object.create(Bar.prototype);

      const container = new Container();

      container.bind('baz', Baz, {
        dependencies: { bar: 'bar' },
      });

      container.bindAll(Bar, { blah: 'blah' });

      assert.throws(() => {
        container.bindAll(Foo, { baz: 'baz' });
      }, errors.CircularReferenceError);
    });

    it('should add extended binding', () => {
      const Foo = function () {};
      const Bar = function () {};

      Bar.prototype = Object.create(Foo.prototype);

      const container = new Container();

      container.bind('bar', Bar);
      container.bindAll(Foo, { test: 'test' });

      assert.isTrue(container._extendedBindings.has(Foo));
    });

    it('should materialize inheritence chain on derived binding', () => {
      const Foo = function () {};
      const Bar = function () {};
      const Baz = function () {};
      const Qux = function () {};

      Bar.prototype = Object.create(Foo.prototype);
      Baz.prototype = Object.create(Bar.prototype);
      Qux.prototype = Object.create(Baz.prototype);

      const container = new Container();

      container.bind('qux', Qux);
      container.bindAll(Bar, { a: '1' });
      container.bindAll(Foo, { b: '2' });
      container.bindAll(Baz, { c: '3' });

      const expected = [Baz, Bar, Foo];
      assert.deepEqual(container._bindings.get('qux').chain, expected);
    });

    it('should materialize inheritence chain on multi derived bindings', () => {
      const Foo = function () {};
      const Bar = function () {};
      const Baz = function () {};
      const Qux = function () {};
      const Quux = function () {};

      Bar.prototype = Object.create(Foo.prototype);
      Baz.prototype = Object.create(Bar.prototype);
      Qux.prototype = Object.create(Baz.prototype);
      Quux.prototype = Object.create(Bar.prototype);

      const container = new Container();

      container.bind('quux', Quux, {
        dependencies: { a: '1' },
      });

      container.bind('qux', Qux, {
        dependencies: { b: '2' },
      });

      container.bind('baz', Baz, {
        dependencies: { b: '2' },
      });

      container.bindAll(Baz, { e: '5' });
      container.bindAll(Bar, { c: '3' });
      container.bindAll(Foo, { d: '4' });

      const expectedQuux = [Bar, Foo];
      const expectedQux = [Baz, Bar, Foo];
      const expectedBaz = [Baz, Bar, Foo];

      assert.deepEqual(container._bindings.get('quux').chain, expectedQuux);
      assert.deepEqual(container._bindings.get('qux').chain, expectedQux);
      assert.deepEqual(container._bindings.get('baz').chain, expectedBaz);
    });

    it('should add self to front of chain', () => {
      const Foo = function () {};
      const Bar = function () {};

      Bar.prototype = Object.create(Foo.prototype);

      const container = new Container();

      container.bind('bar', Bar);
      container.bindAll(Foo, { a: '1' });
      container.bindAll(Bar, { b: '2' });

      const expected = [Bar, Foo];
      assert.deepEqual(container._bindings.get('bar').chain, expected);
    });

    it('should return self', () => {
      const Foo = function () {};
      const Bar = function () {};

      Bar.prototype = Object.create(Foo.prototype);

      const container = new Container();
      container.bind('bar', Bar);

      const result = container.bindAll(Foo, { test: 'test' });

      assert.strictEqual(result, container);
    });
  });


  describe('#resolve', () => {
    it('should throw if name not string', () => {
      const Foo = function () {};
      const container = new Container();
      container.bind('foo', Foo);

      assert.throws(() => {
        container.resolve(42);
      }, TypeError);
    });

    it('should throw if binding does not exist', () => {
      const Foo = function () {};
      const container = new Container();
      container.bind('foo', Foo);

      assert.throws(() => {
        container.resolve('bar');
      }, errors.ResolveError);
    });

    it('should throw if dependency does not exist', () => {
      const Foo = function () {};
      const container = new Container();
      container.bind('foo', Foo, {
        dependencies: { bar: 'bar' },
      });

      assert.throws(() => {
        container.resolve('foo');
      }, errors.ResolveError);
    });

    it('should resolve with constructed instance', () => {
      const Foo = function () {};
      const container = new Container();
      container.bind('foo', Foo);

      const result = container.resolve('foo');
      assert.instanceOf(result, Foo);
    });

    it('should resolve with reference to dependencies', () => {
      const Foo = function (deps) {
        this.bar = deps.bar;
      };

      const container = new Container();
      container.bind('bar', 'test');
      container.bind('foo', Foo, {
        dependencies: { bar: 'bar' },
      });

      const result = container.resolve('foo');
      assert.strictEqual(result.bar, 'test');
    });

    it('should resolve with extended dependencies', () => {
      const Foo = function () {};
      const Bar = function (deps) {
        this.baz = deps.baz;
        this.qux = deps.qux;
      };

      Bar.prototype = Object.create(Foo.prototype);

      const container = new Container();
      container.bindAll(Foo, { qux: 'qux' });
      container.bind('baz', '1');
      container.bind('qux', '2');
      container.bind('bar', Bar, {
        dependencies: { baz: 'baz' },
      });

      const result = container.resolve('bar');

      assert.strictEqual(result.qux, '2');
    });

    it('should override dependency keys from binding over base', () => {
      const Foo = function () {};
      const Bar = function (deps) {
        this.baz = deps.baz;
      };

      Bar.prototype = Object.create(Foo.prototype);

      const container = new Container();
      container.bindAll(Foo, { baz: 'qux' });
      container.bind('baz', '1');
      container.bind('qux', '2');
      container.bind('bar', Bar, {
        dependencies: { baz: 'baz' },
      });

      const result = container.resolve('bar');

      assert.strictEqual(result.baz, '1');
    });

    it('should override dependency keys from base of base', () => {
      const Foo = function () {};
      const Bar = function () {};
      const Baz = function (deps) {
        this.qux = deps.qux;
      };

      Bar.prototype = Object.create(Foo.prototype);
      Baz.prototype = Object.create(Bar.prototype);

      const container = new Container();
      container.bindAll(Foo, { qux: '1' });
      container.bindAll(Bar, { qux: '2' });
      container.bind('1', '1');
      container.bind('2', '2');
      container.bind('baz', Baz);

      const result = container.resolve('baz');

      assert.strictEqual(result.qux, '2');
    });

    it('should resolve with same instance with singletons', () => {
      const Foo = function () {};
      const container = new Container();
      container.bind('foo', Foo);

      const first = container.resolve('foo');
      const second = container.resolve('foo');
      assert.strictEqual(second, first);
    });

    it('should resolve with new instance with transient', () => {
      const Foo = function () {};
      const container = new Container();
      container.bind('foo', Foo, {
        lifetime: Lifetime.transient,
      });

      const first = container.resolve('foo');
      const second = container.resolve('foo');
      assert.notStrictEqual(second, first);
    });

    it('should resolve with given instance', () => {
      const binding = { a: '1' };
      const container = new Container();
      container.bind('foo', binding);

      const result = container.resolve('foo');
      assert.strictEqual(result, binding);
    });

    it('should inject provided params', () => {
      const Foo = function (first, second) {
        this.first = first;
        this.second = second;
      };

      const container = new Container();
      container.bind('foo', Foo, {
        params: [1, 2],
      });

      const result = container.resolve('foo');

      assert.strictEqual(result.first, 1);
      assert.strictEqual(result.second, 2);
    });

    it('should inject provided params with dependencies', () => {
      const Foo = function (first, second, deps) {
        this.first = first;
        this.second = second;
        this.third = deps.third;
      };

      const container = new Container();
      container.bind('third', 3);
      container.bind('foo', Foo, {
        dependencies: { third: 'third' },
        params: [1, 2],
      });

      const result = container.resolve('foo');

      assert.strictEqual(result.first, 1);
      assert.strictEqual(result.second, 2);
      assert.strictEqual(result.third, 3);
    });
  });

});
