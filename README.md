
# FirebaseIndex

## SUMMARY

FirebaseIndex is a simple proxy that allows a larger data set to be filtered, sorted, and retrieved
by an index.

This tool uses the normal Firebase conventions and supports most of the common listeners and operations:
[on][on] (child_added, child_changed, child_removed, child_moved), [off][off], [startAt][startAt], [endAt][endAt], and [limit][limit]

   [on]: https://www.firebase.com/docs/javascript/firebase/on.html
   [off]: https://www.firebase.com/docs/javascript/firebase/off.html
   [startAt]: https://www.firebase.com/docs/javascript/firebase/startat.html
   [endAt]: https://www.firebase.com/docs/javascript/firebase/endat.html
   [limit]: https://www.firebase.com/docs/javascript/firebase/limit.html
   [child]: https://www.firebase.com/docs/javascript/firebase/child.html

### Live Demo: <a target="_blank" href="http://zenovations.github.com/FirebaseIndex">Real-time indexed data list</a>.

## EXAMPLE

Assume we want to retrieve a list of user objects, but only if they are in Bill's friend list.

If our /users path looks something like this:

```javascript
{
   "users": {
       "123": {
          "name": "Joe",
          "email": "xxx@yyy.com",
          "favorite_snes": "Chrono Trigger",
          "friend_list": {...}
       },
       "456": {
          "name": "Kathy",
          "email": "xxx@yyy.com",
          "favorite_snes": "Secret of Mana",
          "friend_list": {...}
       },
       "789": {
          "name": "Bill",
          "email": "xxx@yyy.com",
          "favorite_snes": "Legend of Zelda",
          "friend_list": {...}
       }
   }
}
```

We can do the following:

```javascript
   var fb = new Firebase('https://INSTANCE_NAME.firebaseio.com');
   
   // create an index using any two Firebase refs (they can even refer to different Firebase instances)
   // the first ref is the index, the second is the actual data it refers to
   var index = new FirebaseIndex(fb.child('users/789/friend_list'), fb.child('users'));
   
   // put some friends in it
   index.add('123');
   index.add('456');
   
   // list the user records for my friends
   index.on('child_added', function(ss) { /* invoked with Joe's and Kathy's user records */ });
```

If our index were considerably larger, we could use query parameters to further restrict the index results:

```javascript
   var fb = new Firebase('https://INSTANCE_NAME.firebaseio.com');

   // create an index
   var index = new FirebaseIndex(fb.child('users/789/friend_list'), fb.child('users'));

   // apply query constraints to our index (it is not possible to call add/drop on this object)
   var filteredIndex = index.startAt(PRIORITY).limit(LIMIT);
```

If the data path is dynamic and depends on the id in some sophisticated way, dataRef can be replaced with a
function. For example, if we only wanted to retrieve each user's name from the user list above, we could
utilize the following:

```javascript
   var fb = new Firebase('https://INSTANCE_NAME.firebaseio.com');

   // create an index with a dynamic data path
   var index = new FirebaseIndex(fb.child('users/789/friend_list'), function(key) { return fb.child('users/'+key+'/name'); } );
```

You can use FirebaseIndex in node.js as well:

```javascript
   var FirebaseIndex = require('./FirebaseIndex.js').FirebaseIndex;
   var index = new FirebaseIndex( idxRef, dataRef );
```

## Installation

```
   <!-- optional, makes async ops faster -->
   <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>

   <!-- required -->
   <script type="text/javascript" src="http://static.firebase.com/v0/firebase.js"></script>
   <script type="text/javascript" src="FirebaseIndex.js"></script>
```

## API

### FirebaseIndex <constructor> ( indexRef, dataRef )

If dataRef is a function, it will be passed the key from indexRef, and it must return a Firebase reference to the
data object. For example: `function( key ) { return new Firebase('.../path/'+key+'/subpath'); }`

   - {Firebase} indexRef  the list of keys to use as our filtered list
   - {Firebase|Function} dataRef the master data to actually return

### add (key [,priority] [,onComplete])

Add a key to a FirebaseIndex path and include that data record in our results. A priority may optionally be
included to create sorted indices. The value of the index will be `1`. To set custom values, use `addValue` instead.

Note that if an index key exists which is not in the data path, this won't hurt anything. The child_added
callback only gets invoked if data actually exists at that path. If, later, the data shows up, then child_added
will be called at that time.

   - {String} key  matches an id in the data path
   - {String|Number} [priority]
   - {Function} [onComplete]

### addValue (key, value, [,priority] [,onComplete])

Behaves exactly the same as `add` but assigns a custom value to the index, instead of just a 1.

   - {String} key  matches an id in the data path
   - {String|Number} value
   - {String|Number} [priority]
   - {Function} [onComplete]

### drop (key [,onComplete])

Removes a key from the index. This does not remove the actual data that it points to, just the key in our index,
which also fires a child_removed event.

   - {String} key
   - {Function} [onComplete]

### on (eventType [,callback] [,context])

Listen to child events on this index. The snapshots are the full data objects in the original data path, which are
added/deleted/sorted according to the index's keys.

   - {String}   eventType  one of child_added, child_changed, child_moved, or child_removed
   - {Function} [callback]
   - {Object}   [context]

When the callback is fired, it receives the following arguments: `callback( snapshot, prevId, indexValue )`:

   - {Firebase} snapshot - the full data object from the data path
   - {String} prevId - the prevId, as described in Firebase's `on` function
   - {*} indexValue - the value in the index record, useful for filtering or role based indices

### off (eventType [,callback] [,context])

Stop listening to child events on this index. Must be called with same function and context as original

   - {String}   eventType  one of child_added, child_changed, child_moved, or child_removed
   - {Function} [callback]
   - {Object}   [context]

### startAt (priority, name)

   - {number} [priority]
   - {string} [name]

returns {FirebaseIndexQuery} a read-only version of this index (can't call add/drop on this object)

### endAt (priority, name)

   - {number} [priority]
   - {string} [name]

returns {FirebaseIndexQuery} a read-only version of this index (can't call add/drop on this object)


### limit (limit)

   - {number} limit

returns {FirebaseIndexQuery} a read-only version of this index (can't call add/drop on this object)

### dispose

Remove all listeners and clear all memory resources consumed by this object. A new instance must
be created to perform any further ops.
