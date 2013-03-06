/*! FirebaseIndex
 *
 *************************************/
var FirebaseIndex;
(function ($) { // jQuery isn't required, but it helps with async ops
   "use strict";
   var undefined;

   FirebaseIndex = function(indexRef, dataRef) {
      this.indexRef = indexRef;
      this.dataRef = dataRef;
      this._initMemberVars();
   };

   /**
    * Add a key to a FirebaseIndex path and include that data record in our results. A priority may optionally be
    * included to create sorted indices.
    *
    * Note that if an index exists which does not exist in the data path, this won't hurt anything. The child_added
    * callback only gets invoked if data actually exists at that path. If, later, the data reappears, then child_added
    * will be called at that time.
    *
    * @param {String} key
    * @param {String|Number} [priority]
    * @param {Function} [onComplete]
    * @returns {*}
    */
   FirebaseIndex.prototype.add = function(key, priority, onComplete) {
      var ref = this.indexRef.child(key);
      if( priority && typeof(priority) === 'function' ) {
         onComplete = priority;
         priority = undefined;
      }
      if( priority !== undefined ) {
         ref.setWithPriority(1, priority, onComplete);
      }
      else {
         ref.set(1, onComplete);
      }
      return this;
   };

   /**
    * Removes a key from the index. This does not remove the actual data record, but simply prevents it from being
    * included in our results.
    *
    * @param {String} key
    * @param {Function} [onComplete]
    * @returns {*}
    */
   FirebaseIndex.prototype.drop = function(key, onComplete) {
      this.indexRef.child(key).remove(onComplete);
      return this;
   };

   /**
    * Creates an event listener on the data path. However, only records in this index are included in
    * the results.
    *
    * When the callback is fired, the snapshot will contain the full data object from the data path.
    *
    * @param {String}   eventType  one of child_added, child_changed, or child_removed
    * @param {Function} [callback]
    * @param {Object}   [context]
    * @returns {*}
    */
   FirebaseIndex.prototype.on = function(eventType, callback, context) {
      var fn;
      this._initChildListeners();
      // handle optional arguments
      if( arguments.length === 2 && typeof(callback) === 'object' ) {
         context = callback;
         callback = null;
      }
      // determine the event type
      switch(eventType) {
         case 'child_added':
            fn = addEventListener(this.eventListeners[eventType], callback, context);
            // mimic Firebase behavior by sending any pre-existing records when on('child_added') is invoked
            notifyExistingRecs(this.childRefs, fn);
            break;
         case 'child_changed':
         case 'child_removed':
         case 'child_moved':
            fn = addEventListener(this.eventListeners[eventType], callback, context);
            break;
         default:
            throw new Error('I cannot process this event type: '+eventType);
      }
      return fn;
   };

   /**
    * Stop listening to a data record which was initialized from this index
    *
    * @param {String}   eventType  one of child_added, child_changed, or child_removed
    * @param {Function} [callback]
    * @param {Object}   [context]
    * @returns {*}
    */
   FirebaseIndex.prototype.off = function(eventType, callback, context) {
      // handle optional arguments
      if( arguments.length === 2 && typeof(callback) === 'object' ) {
         context = callback;
         callback = null;
      }
      // determine the event type
      switch(eventType) {
         case 'child_added':
         case 'child_changed':
         case 'child_moved':
         case 'child_removed':
            var events = this.eventListeners[eventType];
            // This tricky little construct just removes all matches.
            // Since we're going to remove elements from `events` each
            // time there is a match, we start over each time and avoid
            // all the index craziness that would occur. We're assuming the
            // list of listeners is less than a few hundred and that
            // this cost of additional iterations is insignificant
            while(
               events.length && events.some(function(o, i) {
                  if(o.cb === callback && o.ctx === context) {
                     events.splice(i, 1);
                     return true;
                  }
                  return false;
               })
               );
            break;
         default:
            throw new Error('I cannot process this event type: '+eventType);
      }
      return this;
   };

   /**
    * @param {number} [priority]
    * @param {string} [name]
    * @return {FirebaseIndexQuery} a read-only version of this index
    */
   FirebaseIndex.prototype.startAt = function(priority, name) {
      return new FirebaseIndexQuery(this.indexRef.startAt(priority, name), this.dataRef);
   };

   /**
    * @param {number} [priority]
    * @param {string} [name]
    * @return {FirebaseIndexQuery} a read-only version of this index
    */
   FirebaseIndex.prototype.endAt = function(priority, name) {
      return new FirebaseIndexQuery(this.indexRef.endAt(priority, name), this.dataRef);
   };

   /**
    * @param {number} limit
    * @return {FirebaseIndexQuery} a read-only version of this index
    */
   FirebaseIndex.prototype.limit = function(limit) {
      return new FirebaseIndexQuery(this.indexRef.limit(limit), this.dataRef);
   };

   /**
    * Remove all listeners and clear all memory resources consumed by this object. A new instance must
    * be created to perform any further ops.
    */
   FirebaseIndex.prototype.dispose = function() {
      this.childRefs.forEach(function(o) {
         o.dispose();
      });
      this.indexRef.off('child_added', this._indexAdded);
      this.indexRef.off('child_removed', this._indexRemoved);
      this.indexRef.off('child_moved', this._indexMoved);
      this.childRefs = this.eventListeners = this.indexRef = this.dataRef = null;
   };

   /** @private */
   FirebaseIndex.prototype._initMemberVars = function() {
      bindAll(this, '_indexAdded', '_indexRemoved', '_indexMoved', '_childChanged');
      this.initialized = false;
      this.eventListeners = { 'child_added': [], 'child_moved': [], 'child_removed': [], 'child_changed': [] };
      this.childRefs = {};
   };

   /** @private */
   FirebaseIndex.prototype._initChildListeners = function() {
      if( !this.initialized ) { // lazy initialize so that limit/startAt/endAt don't generate superfluous listeners
         this.initialized = true;
         this.indexRef.on('child_added', this._indexAdded);
         this.indexRef.on('child_removed', this._indexRemoved);
         this.indexRef.on('child_moved', this._indexMoved);
      }
   };

   /** @private */
   FirebaseIndex.prototype._indexAdded = function(ss, prevId) {
      storeChildRef(this.childRefs, this._childChanged, ss, prevId);
      // monitor the record for changes and defer the handling to this._childChanged
      this.dataRef.child(ss.name()).on('value', this._childChanged);
   };

   /** @private */
   FirebaseIndex.prototype._indexRemoved = function(ss) {
      var key = ss.name();
      if( this.childRefs[key] ) {
         this.childRefs[key].dispose();
         notifyListeners(this.eventListeners['child_removed'], ss);
      }
   };

   /** @private */
   FirebaseIndex.prototype._indexMoved = function(ss, prevId) {
      var key = ss.name();
      if( this.childRefs[key] ) {
         this.childRefs[key].prevId = prevId;
         notifyListeners(this.eventListeners['child_moved'], ss, prevId);
      }
   };

   /** @private */
   FirebaseIndex.prototype._childChanged = function(ss) {
      // The index and the actual data set may vary slightly; this could be intentional since
      // we could monitor things that come and go frequently. So what we do here is look at the
      // actual data, compare it to the index, and send notifications that jive with our findings
      var v = ss.val(), key = ss.name(), eventType = null, prevId = undefined, ref = this.childRefs[key];
      if( v === null ) {
         // null means data doesn't exist; if it's in our list, it was deleted
         // if it's not in our list, it never existed in the first place
         // we just ignore it until some data shows up or it's removed from the index
         if( this.childRefs[key] ) {
            eventType = 'child_removed';
         }
      }
      else if( !ref.loaded ) {
         // this is the first time we've seen this data, we'll mark it as added
         // we make sure the prevId has already been marked "loaded" before triggering
         // this event, that way they arrive at the client in the same order they came
         // out of the index list, which prevents prevId from not existing
         //eventType = 'child_added';
         prevId = this.childRefs[key].prevId;
         waitFor(this.childRefs, prevId, function() {
            notifyListeners(this.eventListeners['child_added'], ss, prevId);
            ref.loaded = true;
            ref.def && ref.def.resolve();
         }.bind(this));
      }
      else {
         // the value has been changed
         eventType = 'child_changed';
      }
      eventType && notifyListeners(this.eventListeners[eventType], ss);
      return this;
   };


   function FirebaseIndexQuery(indexRef, dataRef) {
      this.indexRef = indexRef;
      this.dataRef = dataRef;
      this._initMemberVars();
   }

   inheritsPrototype(FirebaseIndexQuery, FirebaseIndex, {
      add: function() { throw new Error('cannot add to index on read-only FirebaseIndexQueue instance (after calling limit, endAt, or startAt)'); },
      drop: function() { throw new Error('cannot drop from index on read-only FirebaseIndexQueue instance (after calling limit, endAt, or startAt)'); },
      child: function() { throw new Error('cannot access child on read-only FirebaseIndexQueue instance (after calling limit, endAt, or startAt)'); }
   });

   function notifyListeners(list, ss, prevId) {
      list.forEach(function(o) {
         o.fn(ss, prevId);
      });
   }

   function addEventListener(list, callback, context) {
      var fn = context? callback.bind(context) : callback;
      list.push({
         fn: fn,
         cb: callback,
         ctx: context
      });
      return fn;
   }

   function notifyExistingRecs(refs, callback) {
      var key;
      for (key in refs) {
         if (refs.hasOwnProperty(key)) {
            refs[key].ref.once('value', function(ss) {
               if( ss.val() !== null ) { callback(ss); }
            });
         }
      }
   }

   function storeChildRef(list, cb, ss, prevId) {
      var key = ss.name();
      var childRef = ss.ref();
      list[key] = {
         prevId: prevId,
         loaded: false,
         def: $? $.Deferred() : null,
         ref: ss.ref(),
         dispose: function() {
            childRef.off('value', cb);
            delete list[key];
         }
      };
      return childRef;
   }

   function waitFor(refs, id, callback) {
      var ref = refs[id];
      if( !id || !ref || ref.loaded ) {
         callback();
      }
      else if( ref.def ) {
         // use jQuery deferred if it exists (fast and efficient)
         ref.def.done(callback);
      }
      else {
         // do it the old fashioned way :(
         setTimeout(function() {
            waitFor(refs, id, callback);
         }, 10);
      }
   }

   function bindAll(o) {
      var args = Array.prototype.slice.call(arguments, 1);
      args.forEach(function(m) {
         o[m] = o[m].bind(o);
      });
   }

   function inheritsPrototype(to, from, fns) {
      var key;
      for (key in from.prototype) {
         if (from.prototype.hasOwnProperty(key)) {
            to.prototype[key] = from.prototype[key];
         }
      }
      for (key in fns) {
         if (fns.hasOwnProperty(key)) {
            to.prototype[key] = fns[key];
         }
      }
   }

   if (!Function.prototype.bind) {
      // credits: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Function/bind
      Function.prototype.bind = function (oThis) {
         if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5 internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
         }

         var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () {},
            fBound = function () {
               return fToBind.apply(this instanceof fNOP && oThis
                  ? this
                  : oThis,
                  aArgs.concat(Array.prototype.slice.call(arguments)));
            };

         fNOP.prototype = this.prototype;
         fBound.prototype = new fNOP();

         return fBound;
      };
   }

   if (!Array.prototype.some) {
      // credits: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/some
      Array.prototype.some = function(fun /*, thisp */)
      {
         "use strict";

         if (this == null)
            throw new TypeError();

         var t = Object(this);
         var len = t.length >>> 0;
         if (typeof fun != "function")
            throw new TypeError();

         var thisp = arguments[1];
         for (var i = 0; i < len; i++)
         {
            if (i in t && fun.call(thisp, t[i], i, t))
               return true;
         }

         return false;
      };
   }

   if ( !Array.prototype.forEach ) {
      // credits: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/forEach
      Array.prototype.forEach = function(fn, scope) {
         for(var i = 0, len = this.length; i < len; ++i) {
            fn.call(scope, this[i], i, this);
         }
      }
   }

})(jQuery);