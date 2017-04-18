'use strict';

const elv = require('elv');

const errors = require('./errors');
const BindingError = errors.BindingError;
const CircularReferenceError = errors.CircularReferenceError;

const Lifetime = require('./lifetime');


let shared = null;


class Container {

  constructor() {
    this._bindings = new Map();
    this._extendedBindings = [];
  }


  static _assertBindArgs(length) {
    if (length < 2)
      throw new TypeError('The name and target params are required');
  }


  static _assertName(name) {
    if (typeof name !== 'string')
      throw new TypeError('The name param must be string');
  }


  static _assertTarget(target) {
    if (!elv(target))
      throw new TypeError('The target param cannot be null or undefined');
  }


  static _assertParamsOptions(isFunc, params) {
    if (!elv(params)) return;

    if (!Array.isArray(params))
      throw new TypeError('The options.params param must be an array');

    if (!isFunc)
      throw new BindingError('Params can only be used with constrcutors');
  }


  static _assertLifetimeOptions(isFunc, lifetime) {
    if (!elv(lifetime)) return;

    if (lifetime !== 'singleton' && lifetime !== 'transient')
      throw new TypeError('Lifetime must be "singleton" or "transient"');

    if (!isFunc)
      throw new BindingError('Lifetime can only be used with constructor');
  }


  static _assertDependencyOptions(name, isFunc, dependencies) {
    if (!elv(dependencies)) return;

    if (typeof dependencies !== 'object')
      throw new TypeError('The options.dependencies param must be object');

    if (!isFunc)
      throw new BindingError('Dependencies can only be used with constructors');
  }


  static _assertOptions(name, target, options) {
    if (!elv(options)) return;

    const isFunc = typeof target === 'function';

    Container._assertParamsOptions(isFunc, options.params);
    Container._assertLifetimeOptions(isFunc, options.lifetime);
    Container._assertDependencyOptions(name, isFunc, options.dependencies);
  }


  _isCircular(name, dependencies) {
    if (dependencies.has(name)) return true;

    for (let dep of dependencies) {
      const binding = this._bindings.get(dep);
      if (!elv(binding)) continue;
      if (this._isCircular(name, binding.dependencySet)) return true;
    }

    return false;
  }


  //
  // PUBLIC INTERFACE
  //


  static get shared() { return shared; }
  static set shared(value) {
    if (value !== null && !(value instanceof Container))
      throw new TypeError('Property shared must be null or Container instance');

    shared = value;
  }


  bind(name, target, options) {
    Container._assertBindArgs(arguments.length);
    Container._assertName(name);
    Container._assertTarget(target);
    Container._assertOptions(name, target, options);

    const ops = elv.coalesce(options, {});
    const deps = elv.coalesce(ops.dependencies, {});
    const depKeys = Object.keys(deps);

    const binding = {
      Target: target,
      instance: null,
      lifetime: elv.coalesce(ops.lifetime, Lifetime.singleton),
      dependencies: [],
      dependencySet: new Set(),
    };

    for (let i = 0; i < depKeys.length; i++) {
      const key = depKeys[i];
      binding.dependencySet.add(key);
      binding.dependencies.push({
        key,
        binding: deps[key],
      });
    }

    if (this._isCircular(name, binding.dependencySet))
      throw new CircularReferenceError(name);

    if (typeof target !== 'function') {
      binding.instance = target;
      binding.Target = null;
    }

    this._bindings.set(name, binding);

    return this;
  }


  bindAll(base, dependencies) {
    
  }


  /*resolve(name) {
    const binding = this._bindings.get(name);

    if (typeof binding === null || binding === null)

  }*/

}


module.exports = Container;
