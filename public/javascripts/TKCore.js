/*  TKCore JavaScript framework, version 0.9b
 *  (c) 2009 Talkative AB
 *
 *  TKCore is freely distributable under the terms of an MIT-style license.
 *  For details, see the TKCore web site: http://tkcore.talkative.se/
 *
 *--------------------------------------------------------------------------*/

var TKCore = {
	Version: '0.9b'
};


var TKTrigger = Class.create({
	initialize: function(triggerFunction) {
		if (! Object.isFunction(triggerFunction)) {
			triggerFunction = function() {};
		}
		this.triggerFunction = triggerFunction;
	},

	trigger: function(v) {
		this.triggerFunction(v);
	}
});

var TKTriggerEnum = Class.create(Enumerable, {
	initialize: function(){
		this.triggers = [];
	},

	add: function() {
		var args = $A(arguments);
		if(!args.all(function(arg) { return arg instanceof TKTrigger })) {
			throw "Only TKTrigger in TKTriggerEnum."
		}

		var self = this;
		args.each(function(arg) {
			self.triggers.push(arg);
		});
	},

	_each: function(iterator) {
		return this.triggers._each(iterator);
	}
});
var TKProperty = Class.create({
	initialize: function(name, type, options) {
		if (! options) options = {};

		this.name = name;
		this.type = type;
		this.options = options;
		this.propName = name.substr(0, 1).toUpperCase()+name.substr(1);
		this.triggers = new TKTriggerEnum();
	}
});

var TKPropertyEnum = Class.create(Enumerable, {
	initialize: function(){
		this.properties = [];
	},

	add: function() {
		var args = $A(arguments);
		if(!args.all(function(arg) { return arg instanceof TKProperty })) {
			throw "Only TKProperty in TKPropertyEnum."
		}

		var self = this;
		args.each(function(arg) {
			self.properties.push(arg);
		});
	},

	_each: function(iterator) {
		return this.properties._each(iterator);
	}
});
var TKProtocol = Class.create({
	initialize: function(protObj) {
		this.functions = [];
		this.properties = [];
		if (typeof(protObj.functions) != "undefined") {
			this.functions = protObj.functions;
		}
		if (typeof(protObj.properties) != "undefined") {
			this.properties = protObj.properties;
		}
	}
});

var TKObject = Class.create({
	initialize: function() {
		this.setClassName("TKObject");
		this.properties = new TKPropertyEnum();
		this.addPrivate();
	},

	getConfig: function() {
		if (Object.isString(arguments[0])) {
			if (Object.isUndefined(this._confArray)) {
				this._confArray = {};
				if (! Object.isUndefined(this.config)) {
					var conf = $A(this.config);
					var self = this;
					conf.each(function(arg) {
						self._confArray[arg] = true;
					});
				}
			}
			return this._confArray[arguments[0]] ? this._confArray[arguments[0]] : false;
		}

		return null;
	},

	makeSingleton: function() {
		window[this.__className+"_singleton"] = null;
		delete(window[this.__className+"_singleton"]);
	},

	makeEnumerable: function() {
		window[this.__className].addMethods(Enumerable);
	},

	setClassName: function() {
		if ((typeof(this.__classNameSet) != "undefined") && (this.__classNameSet)) {
			return;
		}

		if (typeof(arguments[0]) != "string") {
			throw new Error("className sent to TKObject requires string.");
		}

		this.__className = arguments[0];
		this.__classNameSet = true;
	},

	addPrivate: function() {
		var addObj;

		if (arguments.length < 1) {
			if (! Object.isUndefined(window[this.__className+"_private"])) {
				addObj = window[this.__className+"_private"];
			}
		} else {
			addObj = arguments[0];
		}

		var funcs = Object.keys(addObj);

		var self = this;

		funcs.each(function(arg) {
			addObj[arg] = addObj[arg].wrap(function(proceed) {
				/* Add private-method functionality here
				if (! isPrivate) {
					throw new Error("Tried to call private function in a public scope.");
				}
				*/

				var args = $A(arguments);
				args.shift();
				return proceed.apply(this, args.toArray());
			});
		});

		if (this.getConfig("singleton")) {
			window[this.__className+"_singleton"].addMethods(addObj);
		} else {
			try {
				window[this.__className].addMethods(addObj);
			} catch(e) {
				TKTrace.log(e);
				TKTrace.log(this.__className);
			}
		}
	},

	addProperty: function(name, type, options) {
		if ((typeof(name) != "string") || (typeof(type) != "string")) {
			throw new Error("Property name and type need to be strings.");
		}

		if (! options) options = {};
		if (! options.copy) options.copy = false;
		if (! options.readonly) options.readonly = false;
		if (! options.noserialize) options.noserialize = false;
		if (! options.force) options.force = false;
		if (! options.trigger) options.trigger = false;
		if (Object.isUndefined(options.defaultValue)) options.defaultValue = null;
		if (options.readonly) options.force = true;

		var basicType = true;
		switch (type.toLowerCase()) {
			case "float":
			case "integer":
			case "string":
			case "boolean":
			case "array":
				type = type.toLowerCase();
				break;

			case "function":
				type = type.toLowerCase();

				options.copy = false;
				options.noserialize = true;
				break;

			default:
				if ((window[type]) && (Object.isFunction(window[type].getClassName))) {
					if (type == window[type].getClassName()) {
						basicType = false;
					} else {
						throw new Error("Unknown property type: " + type);
					}
				} else {
					throw new Error("Unknown property type: " + type);
				}
				break;
		}

		var isNew = true;
		this.properties.each(function(arg) {
			if (arg.name == name) {
				isNew = false;
				throw $break;
			}
		});
		if (! isNew) {
			return;
		}

		var copyObject;
		copyObject = function(v) {
			if (TKObject.isKindOfClass(v, TKObject)) {
				return v.copy();
			}

			if (Object.isArray(v)) {
				var returnArr = [];
				v.each(function(obj) {
					returnArr.push(copyObject(obj));
				});
				return returnArr;
			}

			if (typeof(v) == "object") {
				var returnObj = {};
				for (var vprop in v) {
					returnObj[vprop] = copyObject(v[vprop]);
				}
				return returnObj;
			}

			return v;
		};

		if (options.force) {
			var randChar;
			randChar = function() {
				var randNo = Math.floor(Math.random() * 25);
				if (Math.round(Math.random()) == 1) {
					return String.fromCharCode(randNo + 65);
				} else {
					return String.fromCharCode(randNo + 97);
				}
			};

			var randString;
			randString = function(count) {
				var returnString = "";
				for (var i = 0; i < count; i++) {
					returnString += randChar();
				}
				return returnString;
			};

			options.prop = randString(40);
		} else {
			options.prop = name;
		}

		this[options.prop] = null;

		var prop = new TKProperty(name, type, options);

		if (Object.isFunction(options.trigger)) {
			prop.triggers.add(new TKTrigger(options.trigger));
		} else if (Object.isArray(options.trigger)) {
			for (var i = 0; i < options.trigger.length; i++) {
				if (Object.isFunction(options.trigger[i])) {
					prop.triggers.add(new TKTrigger(options.trigger));
				}
			}
		}

		if (basicType) {
			var setter;

			switch(type) {
				case "float":
					setter = function(v) {
						this[options.prop] = parseFloat(v);
					};
					break;

				case "integer":
					setter = function(v) {
						this[options.prop] = parseInt(v);
					};
					break;

				case "string":
					setter = function(v) {
						if (Object.isString(v)) {
							this[options.prop] = v;
						} else {
							this[options.prop] = new String(v);
						}
					};
					break;

				case "boolean":
					setter = function(v) {
						this[options.prop] = v ? true:false;
					};
					break;

				case "array":
					if (options.copy) {
						setter = function(v) {
							if (Object.isArray(v)) {
								this[options.prop] = copyObject(v);
							} else {
								this[options.prop] = copyObject($A(v).toArray());
							}
						}
					} else {
						setter = function(v) {
							if (Object.isArray(v)) {
								this[options.prop] = v;
							} else {
								this[options.prop] = $A(v).toArray();
							}
						};
					}
					break;

				case "function":
					setter = function(v) {
						if (Object.isFunction(v)) {
							this[options.prop] = v;
						} else if (Object.isFunction(window[v])) {
							this[options.prop] = window[v];
						} else {
							throw new Error("set" + prop.propName + " expects function or function-name.");
						}
					};
					break;
			}
			if (!Object.isFunction(this["set" + prop.propName])) {
				this["set" + prop.propName] = setter;
			}
			if (!Object.isFunction(this["get" + prop.propName])) {
				this["get" + prop.propName] = function() {
					return this[options.prop];
				};
			}
		} else {
			if (!Object.isFunction(this["set" + prop.propName])) {
				if (options.copy) {
					this["set" + prop.propName] = function() {
						if (arguments[0] == null) {
							this[options.prop] = null;
							return;
						}
						if (!(TKObject.isKindOfClass(arguments[0], window[type]))) {
							throw new Error("set" + prop.propName + " expects " + type);
						}

						this[options.prop] = copyObject(arguments[0]);
					};
				} else {
					this["set" + prop.propName] = function() {
						if (arguments[0] == null) {
							this[options.prop] = null;
							return;
						}
						if (!(TKObject.isKindOfClass(arguments[0], window[type]))) {
							throw new Error("set" + prop.propName + " expects " + type);
						}

						this[options.prop] = arguments[0];
					};
				}
			}
			if (!Object.isFunction(this["get" + prop.propName])) {
				this["get" + prop.propName] = function() {
					return this[options.prop];
				}
			}
		}

		if (options.defaultValue != null) {
			this["set" + prop.propName](options.defaultValue);
		}

		if (options.force) {
			if (!options.readonly) {
				this["set" + prop.propName] = this["set" + prop.propName].wrap(function(proceed) {
					var args = $A(arguments);
					args.shift();
					proceed.apply(this, args.toArray());
					prop.triggers.invoke("trigger", args.toArray());
					if (!Object.isUndefined(this[name])) {
						this[name] = null;
						delete (this[name]);
						throw new Error("Error! " + name + " exists, use of set" + prop.propName + "() is forced.");
					}
				});
			}

			this["get" + prop.propName] = this["get" + prop.propName].wrap(function(proceed) {
				var args = $A(arguments);
				args.shift();
				var returnVal = proceed.apply(this, args.toArray());
				if (! Object.isUndefined(this[name])) {
					this[name] = null;
					delete(this[name]);
					throw new Error("Error! "+name+" exists, use of set"+prop.propName+"() is forced.");
				}
				return returnVal;
			});
		} else {
			if (!options.readonly) {
				this["set" + prop.propName] = this["set" + prop.propName].wrap(function(proceed) {
					var args = $A(arguments);
					args.shift();
					proceed.apply(this, args.toArray());
					prop.triggers.invoke("trigger", args.toArray());
				});
			}
		}

		if (options.readonly) {
			this["set" + prop.propName] = function() {
				throw new Error(name+" is readonly, changing the value of this property is prohibited.");
			};
		}

		this.properties.add(prop);
	},

	toJSON: function() {
		var returnObj = {};
		this.properties.each(function(prop) {
			if (prop.options.noserialize) {
				return;
			}

			switch (prop.type) {
				case "float":
				case "integer":
				case "string":
				case "boolean":
				case "array":
					returnObj[prop.name] = this["get" + prop.propName]();
					break;

				case "function":
					returnObj[prop.name] = new String(this["get" + prop.propName]());
					break;

				default:
					if (Object.isFunction(window[prop.type].getClassName)) {
						if (this["get"+prop.propName]() == null) {
							returnObj[prop.name] = null;
						} else if (Object.isFunction(this["get"+prop.propName]().toJSON)) {
							returnObj[prop.name] = this["get"+prop.propName]().toJSON().evalJSON();
						}
					}
					break;
			}
		}.bind(this));

		return Object.toJSON(returnObj);
	},

	conformsToProtocol: function(protocol) {
		if (! (protocol instanceof TKProtocol)) {
			throw new Error("Protocol not instance of TKProtocol.");
		}

		var conforms = true;

		var self = this;
		protocol.functions.each(function(func) {
			if (typeof(self[func]) != "function") {
				conforms = false;
				throw $break;
			}
		});
		if (conforms) {
			protocol.properties.each(function(prop) {
				var propExists = false
				self.properties.each(function(obj) {
					if (prop == obj.name) {
						propExists = true;
						throw $break;
					}
				});

				if (! propExists) {
					conforms = false;
					throw $break;
				}
			});
		}

		return conforms;
	},

	isKindOfClass: function(objClass) {
		return TKObject.isKindOfClass(this, objClass);
	},

	isMemberOfClass: function(objClass) {
		return TKObject.isMemberOfClass(this, objClass);
	},

	copy: function() {
		return window[this.__className].fromJSON(this.toJSON());
	},

	addTrigger: function(property, triggerFunction) {
		this.properties.each(function(prop) {
			if (prop.name == property) {
				prop.triggers.add(new TKTrigger(triggerFunction));
				throw $break;
			}
		});
	}
});


TKObject.getClassName = function() {
	return "TKObject";
};

TKObject.getSuperClass = function() {
	return null;
};

TKObject.fromJSON = function(jsonObj) {
	return new TKObject();
};

TKObject.isKindOfClass = function(objInst, objClass) {
	if ((typeof(objInst) != "object") || (! (objInst instanceof TKObject))) {
		return false;
	}
	if ((Object.isString(objClass)) && (! Object.isUndefined(window[objClass]))) {
		objClass = window[objClass];
	}
	if ((! Object.isFunction(objClass)) || (! Object.isFunction(objClass.getClassName))) {
		throw new Error("isKindOfClass expects TKObject-class or name of TKObject-class that exists.");
	}
	return (objInst instanceof objClass);
};

TKObject.isMemberOfClass = function(objInst, objClass) {
	if ((typeof(objInst) != "object") || (! (objInst instanceof TKObject))) {
		return false;
	}
	if ((Object.isString(objClass)) && (! Object.isUndefined(window[objClass]))) {
		objClass = window[objClass];
	}
	if ((! Object.isFunction(objClass)) || (! Object.isFunction(objClass.getClassName))) {
		throw new Error("isMemberOfClass expects TKObject-class or name of TKObject-class that exists.");
	}
	return (objInst.__className == objClass.getClassName());
};

TKObject.subClass = function() {
	var properties = $A(arguments), parentClass = null, subClassName = null;
	if (Object.isFunction(properties[0])) {
		parentClass = properties.shift();
		subClassName = properties.shift();
	} else if (Object.isString(properties[0])) {
		parentClass = TKObject;
		subClassName = properties.shift();
	} else {
		throw new Error("TKObject subclassing without classname.");
	}
	if ((properties.length != 1) || (typeof(properties[0]) != "object")) {
		throw new Error("Invalid arguments sent to TKObject subclassing.");
	}

	var singleton = false, enumerable = false;
	if (typeof(properties[0].config) != "undefined") {
		var config = $A(properties[0].config);
		if (config.indexOf("singleton") >= 0) {
			singleton = true;
		}
		if (config.indexOf("enumerable") >= 0) {
			enumerable = true;
		}
	}

	properties[0].initialize = function($super) {
		this.setClassName(subClassName);
		var args = $A(arguments);
		args.shift();
		$super.apply(this, args.toArray());
		if (singleton) this.makeSingleton();
		if (enumerable) this.makeEnumerable();
		if ((typeof(this.__initRun) == "undefined") && (Object.isFunction(this.init))) {
			this.__initRun = true;
			this.init.apply(this, args.toArray());
		}
	};

	if (singleton) {
		window[subClassName+"_singleton"] = Class.create(parentClass, properties[0]);
		window[subClassName] = new window[subClassName+"_singleton"]();
		window[subClassName].subClass = function() {
			throw new Error(subClassName+" cannot be subclassed (singleton).");
		};
		window[subClassName].getClassName = function() {
			return subClassName;
		};
		window[subClassName].getSuperClass = function() {
			return parentClass;
		};
		window[subClassName].fromJSON = function() {
			throw new Error(subClassName+" cannot be created with fromJSON-function (singleton).");
		};
	} else {
		window[subClassName] = Class.create(parentClass, properties[0]);
		window[subClassName].subClass = function() {
			if (typeof(arguments[0]) != "string") {
				throw new Error("TKObject subclassing error.");
			}
			var params = {};
			if (arguments.length >= 2) {
				params = arguments[1];
			}
			TKObject.subClass(window[subClassName], arguments[0], params);
		};
		window[subClassName].getClassName = function() {
			return subClassName;
		};
		window[subClassName].getSuperClass = function() {
			return parentClass;
		};
		window[subClassName].fromJSON = function(jsonObj) {
			if (! Object.isString(jsonObj)) {
				throw new Error("fromJSON expectes JSON-object as string.");
			}

			var dataObj = jsonObj.evalJSON(true);
			if (dataObj == null) {
				return null;
			}
			var returnObj = new window[subClassName]();
			returnObj.properties.each(function (prop) {
				if (prop.options.noserialize) {
					return;
				}

				if (prop.options.readonly) {
					if (Object.isUndefined(dataObj[prop.name])) {
						returnObj[prop.options.prop] = null;
						return;
					}

					switch (prop.type) {
						case "float":
							returnObj[prop.options.prop] = parseFloat(dataObj[prop.name]);
							break;

						case "integer":
							returnObj[prop.options.prop] = parseInt(dataObj[prop.name]);
							break;

						case "string":
							if (Object.isString(dataObj[prop.name])) {
								returnObj[prop.options.prop] = dataObj[prop.name];
							} else {
								returnObj[prop.options.prop] = new String(dataObj[prop.name]);
							}
							break;

						case "boolean":
							returnObj[prop.options.prop] = dataObj[prop.name] ? true:false;
							break;

						case "array":
							if (Object.isArray(dataObj[prop.name])) {
								returnObj[prop.options.prop] = dataObj[prop.name];
							} else {
								returnObj[prop.options.prop] = $A(dataObj[prop.name]).toArray();
							}
							break;

						case "function":
							break;

						default:
							if (TKObject.isKindOfClass(dataObj[prop.name], window[prop.type])) {
								if (prop.options.copy) {
									returnObj[prop.options.prop] = dataObj[prop.name];
								} else {
									returnObj[prop.options.prop] = dataObj[prop.name].copy();
								}
							}
							break;
					}

					return;
				}

				if (Object.isUndefined(dataObj[prop.name])) {
					returnObj["set"+prop.propName](null);
					return;
				}

				switch (prop.type) {
					case "float":
					case "integer":
					case "string":
					case "boolean":
					case "array":
						returnObj["set"+prop.propName](dataObj[prop.name]);
						break;

					case "function":
						break;

					default:
						if (Object.isFunction(window[prop.type].getClassName)) {
							if (Object.isFunction(window[prop.type].fromJSON)) {
								returnObj["set"+prop.propName](window[prop.type].fromJSON(Object.toJSON(dataObj[prop.name])));
							}
						}
						break;
				}
			});

			return returnObj;
		};
	}
}
TKObject.subClass("TKArray", {
	config: ["enumerable"],

	init: function() {
		this.items = [];

		if (Object.isString(arguments[0])) {
			if (Object.isFunction(window[arguments[0]])) {
				this.allow = window[arguments[0]];
			}
		} else if (Object.isFunction(arguments[0])) {
			this.allow = arguments[0];
		} else {
			this.allow = TKObject;
		}

		this.conformProtocol = null;
		if (arguments.length > 1) {
			if (Object.isString(arguments[1])) {
				if (window[arguments[1]] instanceof TKProtocol) {
					this.conformProtocol = window[arguments[1]];
				}
			} else if (arguments[1] instanceof TKProtocol) {
				this.conformProtocol = arguments[1];
			}
		}
	},

	add: function() {
		var self = this;
		var args = $A(arguments);
		if (this.conformProtocol !== null) {
			if (!args.all(function(arg) { if (arg instanceof self.allow) return arg.conformsToProtocol(self.conformProtocol) })) {
				throw new Error("Only "+this.allow.getClassName()+" that conforms to specific protocol in TKArray.");
			}
		} else {
			if (!args.all(function(arg) { return arg instanceof self.allow })) {
				throw new Error("Unknown object sent to TKArray, expecting instances of "+this.allow.getClassName()+".");
			}
		}

		args.each(function(arg) {
			self.items.push(arg);
		});
	},

	search: function(searchterm, property) {
		var returnArr = new TKArray();

		if (this.items.size() < 1) {
			return returnArr;
		}

		var prop = false;
		var nullCount = 0;

		var itemsArr = this.items.toArray();
		for (var i = 0; i < itemsArr.length; i++) {
			if (! itemsArr[i]) {
				nullCount++;
				continue;
			}

			var propArr = itemsArr[i].properties.toArray();
			for (var j = 0; j < propArr.length; j++) {
				if (propArr[j].name == property) {
					prop = propArr[j];
					break;
				}
			}

			if (prop !== false) {
				break;
			}
		}

		if ((! (prop instanceof TKProperty)) && (nullCount < itemsArr.length)) {
			throw new Error(property+"-property not found in TKArray.");
		} else if ((nullCount > 0) && (nullCount == itemsArr.length)) {
			return returnArr;
		}

		this.items.each(function(obj, indexNo) {
			if (! obj) {
				return;
			}
			if ((typeof(obj["get"+prop.propName]) == "function")
				&& (obj["get"+prop.propName]() == searchterm)) {
				returnArr.add(obj);
			} else if (typeof(obj["get"+prop.propName]) != "function") {
				TKTrace.log("not function: get"+prop.propName);
			}
		});
		return returnArr;
	},

	removeAt: function(){
		var tmpArray = this.items.toArray();
		tmpArray.splice(arguments[0], 1);
		this.items = $A(tmpArray);
	},

	getObjectAtIndex: function(index) {
		return this.items.toArray()[index];
	},

	_each: function(iterator) {
		return this.items._each(iterator);
	},

	toJSON: function() {
		var returnObj = {};
		var arrayTypes = [];
		var arrayData = [];
		this.items.each(function(obj) {
			if (obj instanceof TKObject) {
				arrayTypes.push(obj.__className);
				arrayData.push(obj.toJSON().evalJSON());
			} else if (obj == null) {
				arrayTypes.push("nullObject");
				arrayData.push(null);
			} else {
				arrayTypes.push(typeof(obj));
				arrayData.push(obj);
			}
		}.bind(this));
		returnObj.allow = this.allow.getClassName();
		returnObj.conformProtocol = this.conformProtocol;
		returnObj.types = arrayTypes;
		returnObj.data = arrayData;
		return Object.toJSON(returnObj);
	}
});

TKArray.fromJSON = function(jsonObj) {
	if (! Object.isString(jsonObj)) {
		throw new Error("fromJSON expectes JSON-object as string.");
	}

	var dataObj = jsonObj.evalJSON(true);
	var returnObj = new TKArray(dataObj.allow, dataObj.conformProtocol);
	dataObj.data.each(function(obj, index) {
		var type = dataObj.types[index];

		if (type == "nullObject") {
			returnObj.items.push(null);
			return;
		}

		if (! Object.isFunction(window[type])) {
			throw new Error("fromJSON failed, "+type+" object not available.");
		}
		if (! Object.isFunction(window[type].fromJSON)) {
			throw new Error(type+" doesn't have any fromJSON functionality.");
		}

		returnObj.items.push(window[type].fromJSON(Object.toJSON(obj)));
	});
	return returnObj;
};
var TKTrace_private = {
	objectToString: function(obj) {
		if (obj instanceof TKObject) {
			return obj.toJSON();
		}
		if (Object.isArray(obj)) {
			return Object.toJSON(obj);
		}
		if (typeof(obj) == "object") {
			return Object.toJSON(obj);
		}
		return new String(obj);
	}
};

TKObject.subClass("TKTrace", {
	config: ["singleton"],




	init: function() {
		this.addProperty("debug", "boolean", false);
		this.addProperty("notice", "boolean", true);
		this.addProperty("error", "boolean", true);
		this.addProperty("server", "string");
	},

	log: function(logMessage, options) {
		if (! options) options = {};
		if (! options.type) options.type = "debug";

		switch (options.type) {
			case "notice":
				if (! this.getNotice()) {
					return;
				}
				break;

			case "error":
				if (! this.getError()) {
					return;
				}
				break;

			default:
				if (! this.getDebug()) {
					return;
				}
				break;
		}

		if ($('trace')) {
			if (Object.isElement(logMessage)) {
				$('trace').insert({
					bottom: logMessage
				});
			} else if ((typeof(logMessage) == "object") || (typeof(logMessage) == "function")) {
				$('trace').insert({
					bottom: "<br />- " + this.objectToString(logMessage)
				});
			} else {
				$('trace').insert({
					bottom: "<br />- " + logMessage
				});
			}
		} else if ((typeof(console) == "object") && (typeof(console.log) == "function")) {
			console.log(logMessage);
		}

		if ((this.getServer() != null) && (this.getServer().length > 0)) {
			if ((typeof(logMessage) == "object") || (typeof(logMessage) == "function")) {
				logMessage = this.objectToString(logMessage);
			} else if (Object.isElement(logMessage)) {
				return;
			}
			new Ajax.Request(this.getServer(), {
				method: "get",
				parameters: {_method:"POST", data:logMessage}
			});
		}
	}
});
