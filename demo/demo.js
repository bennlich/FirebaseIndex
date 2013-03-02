/*! FirebaseIndex Demo
 *
 *************************************/
jQuery(function ($) {
   "use strict";
   var undefined;

   /*******************************
    * BORING CONTROLLER LOGIC THAT
    * WILL PUT YOU TO SLEEP
    */

   // initialize our indexed data
   var FB      = new Firebase('https://i5ubv072aza.firebaseio-demo.com/');
   var IDX     = new FirebaseIndex(FB, 'indices/widgets', 'widgets');

   // refs for our DOM nodes
   var $master = $('#master');
   var $index  = $('#index');
   var $both   = $('#index, #master');

   // load up the Firebase event handlers
   initIndex();
   initMaster();
   showFilteredData();
   showAllData();

   // DOM event handlers
   $master.on('click', 'li', addToIndex);
   $index.on('click', 'i.icon-remove-sign', removeFromIndex);
   $index.on('change', 'input', resortIndex);


   /**************************************************
    * EXCITING INDEX RELATED STUFF YOU
    * WANT TO LOOK AT
    */

   function showFilteredData() {
      // records added/moved/removed from the index show up here with data from the referenced path
      var $filtered = $('#filtered');

      IDX.on('child_added', function(ss, prevId) {
         var id = ss.name();
         var $li = $('<li data-id="'+id+'">'+id+': '+escapeHtml(ss.val())+'</li>');
         var $prev = prevId && $filtered.find(['data-id="'+prevId+'"]']);
         if( prevId && $prev.length ) {
            $prev.after($li);
         }
         else if( prevId === null ) {
            $filtered.prepend($li);
         }
         else {
            $filtered.append($li);
         }
      });

      IDX.on('child_removed', function(ss) {
         $filtered.find('li[data-id="'+ss.name()+'"]').remove();
      });

      IDX.on('child_moved', function(ss, after) {
         var id = ss.name(), $li = $filtered.find('li[data-id="'+id+'"]');
         var $after = after && $filtered.find('li[data-id="'+after+'"]');
         if( $after && $after.length ) {
            $after.after($li);
         }
         else if( after === null ) {
            $filtered.prepend($li);
         }
         else {
            $filtered.append($li);
         }
      });
   }

   function addToIndex(e) {
      var $el = $(e.target);
      if( !$el.hasClass('picked') ) {
         IDX.add($el.attr('data-id'));
      }
   }

   function removeFromIndex(e) {
      IDX.drop($(e.target).closest('li').attr('data-id'));
   }

   function resortIndex(e) {
      var $arrow = $(e.target), $el = $arrow.closest('li'), id = $el.attr('data-id'), pri = $el.find('input').val();
      IDX.add(id, pri? parseInt(pri) : null);
   }

   /*****************************************
    * DEMO RELATED STUFF THAT WILL MAKE YOU
    * WANT TO STAB YOUR EYES OUT
    */

   function initMaster() {
      var ref = FB.child('widgets');

      ref.on('child_added', function(ss) {
         var id = ss.name();
         var $li = $('<li>'+escapeHtml(id)+'</li>')
            .attr('data-id', id)
            .append('<i class="icon-plus-sign pull-right"></i>')
            .toggleClass('picked', $('#index').find('li[data-id="'+id+'"]').length > 0);
         $master.append($li);
      });

      ref.on('child_removed', function(ss) {
         $both.find('[data-id="'+ss.name()+'"]').remove();
      });
   }

   function initIndex() {
      var ref = FB.child('indices/widgets');

      ref.on('child_added', function(ss, afterId) {
         var id = ss.name();
         var $li = $('<li />')
            .html(escapeHtml(id)+'<i class="icon-remove-sign pull-right"></i> ')
            .attr('data-id', id)
            .append($('<input type="text" size="2" class="pull-right input-mini" />').val(ss.getPriority()||''));
         if( afterId ) {
            $index.find('[data-id="'+afterId+'"]').after($li);
         }
         else {
            $index.prepend($li);
         }
         $master.find('li[data-id="'+ss.name()+'"]').addClass('picked');
      });

      ref.on('child_removed', function(ss) {
         $index.find('[data-id="'+ss.name()+'"]').remove();
         $master.find('[data-id="'+ss.name()+'"]').removeClass('picked');
      });

      ref.on('child_moved', function(ss, prev) {
         var $li = $index.find('[data-id="'+ss.name()+'"]');
         if( prev ) {
            $li.insertAfter($index.find('[data-id="'+prev+'"]'));
         }
         else if( prev === null ) {
            $index.prepend($li);
         }
         else {
            $index.append($li);
         }
      });
   }

   function showAllData() {
      FB.on('value', function(ss) {
         $('#raw').text(JSON.stringify(ss.val(), null, 2));
      });
   }

   function escapeHtml(txt) {
      return txt.replace('<', '&lt;').replace('>', '&gt;');
   }
});