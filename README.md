
# FirebaseIndex

## SUMMARY

FirebaseIndex is a simple proxy that allows a larger data set to be filtered, sorted, and retrieved
by an index.

## EXAMPLE

For example, if I have a /users path with many records, stored something like this:

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

And I want to retrieve users, but only if they are in my friend list, I can do the following:

```javascript
   var fb = new Firebase('https://???.firebaseio.com');
   
   // create an index
   var index = new FirebaseIndex(fb, 'users/789/friend_list', 'users');
   
   // put some friends in it
   index.add('123');
   index.add('456');
   
   // list the user records for my friends
   index.on('child_added', function(ss) { /* invoked with Joe's and Kathy's user records */ });
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

Removes a key from the index. This does not remove the actual data record, but simply prevents it from being
included in our filtered results.

   - {String} key
   - {Function} [onComplete]

### child (key)

Get a reference to the child data for a record in this index. If the child does not exist in this index
then undefined is returned (unlike Firebase.child where a ref is guaranteed).

   - {String} key

returns {Firebase|undefined}

### on (eventType [,callback] [,context])
Creates an event listener on the data path. However, only records in this index are included in
the results.

When the callback is fired, the snapshot will contain the full data object from the data path.

   - {String}   eventType  one of child_added, child_changed, child_moved, or child_removed
   - {Function} [callback]
   - {Object}   [context]
   
### off (eventType [,callback] [,context])

Stop listening to a data record which was initialized from this index

   - {String}   eventType  one of child_added, child_changed, child_moved, or child_removed
   - {Function} [callback]
   - {Object}   [context]

### dispose
Remove all listeners and clear all memory resources consumed by this object. A new instance must
be created to perform any further ops.
