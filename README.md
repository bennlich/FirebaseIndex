
# FirebaseIndex

## SUMMARY

FirebaseIndex is a simple proxy that allows a larger data set to be filtered, sorted, and retrieved
by an index.

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

If our index were considerably larger, we could use query parameters to farther restrict the index results:

```javascript
   var fb = new Firebase('https://INSTANCE_NAME.firebaseio.com');

   // apply query constraints to our index
   var idxRef = fb.child('users/789/friend_list').limit(10).startAt(PRIORITY);

   // create an index which references only a portion of the index
   var index = new FirebaseIndex(idxRef, fb.child('users'));
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

### add (key [,priority] [,onComplete])

Add a key to a FirebaseIndex path and include that data record in our results. A priority may optionally be
included to create sorted indices.

Note that if an index key exists which is not in the data path, this won't hurt anything. The child_added
callback only gets invoked if data actually exists at that path. If, later, the data shows up, then child_added
will be called at that time.

   - {String} key  matches an id in the data path
   - {String|Number} [priority]
   - {Function} [onComplete]


### drop (key [,onComplete])

Removes a key from the index. This does not remove the actual data that it points to, just the key in our index,
which also fires a child_removed event.

   - {String} key
   - {Function} [onComplete]

### child (key)

Get a Firebase reference to the child data object. If the child does not exist in this index (even if it's in
the original data path) then undefined is returned. Unlike Firebase.child where a ref is guaranteed, even if the
data doesn't exist yet.

   - {String} key

returns {Firebase|undefined}

### on (eventType [,callback] [,context])

Listen to child events on this index. The snapshots are the full data objects in the original data path, which are
added/deleted/sorted according to the index's keys.

When the callback is fired, the snapshot will contain the full data object from the data path.

   - {String}   eventType  one of child_added, child_changed, child_moved, or child_removed
   - {Function} [callback]
   - {Object}   [context]
   
### off (eventType [,callback] [,context])

Stop listening to child events on this index. Must be called with same function and context as original

   - {String}   eventType  one of child_added, child_changed, child_moved, or child_removed
   - {Function} [callback]
   - {Object}   [context]

### dispose

Remove all listeners and clear all memory resources consumed by this object. A new instance must
be created to perform any further ops.
