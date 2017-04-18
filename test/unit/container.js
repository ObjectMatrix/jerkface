'use strict';

const assert = require('chai').assert;


const jerkface = require('../../lib');
const Container = jerkface.Container;
const errors =  jerkface.errors;


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
      const Test = function() {};
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
      const Test = function() {};
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
          lifetime: 'singleton',
        });
      }, errors.BindingError);
    });

    it('should throw if lifetime not singleton or transient', () => {
      const Test = function() {};
      const container = new Container();
      assert.throws(() => {
        container.bind('test', Test, {
          lifetime: 42,
        });
      }, TypeError);
    });

    it('should throw if circular dependency', () => {
      const Foo = function() {};
      const Bar = function() {};

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
      const Foo = function() {};
      const Bar = function() {};
      const Baz = function() {};

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

    it('should internally persist constructor binding', () => {
      const Foo = function() {};
      const container = new Container();

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
      const Foo = function() {};
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

    });

    it('should throw if dependencies null', () => {

    });

    it('should throw if dependencies not an object', () => {

    });

    it('should throw if dependencies an array', () => {

    });

    it('should ', () => {

    });

    it('should ', () => {

    });

    it('should ', () => {

    });

    it('should ', () => {

    });

    it('should ', () => {

    });

    it('should ', () => {

    });

    it('should ', () => {

    });

    it('should ', () => {

    });

    it('should ', () => {

    });
  });

});
