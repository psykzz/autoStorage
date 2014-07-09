/*!
 * jQuery autoStore Plugin
 * Based on code from https://github.com/phunkei/autoStorage by Daniel Miguel Baltes Amado
 * Original copyright (c) 2011 - 2013 Daniel Miguel Baltes Amado
 * Revised by Matt Smith 
 * Version: 0.1
 */
(function( $ ){
    $.fn.autoStore = function(options) {
        var settings,
            data,
            exclude,
            submit,
            node_count = 0,
            as_ident = 0,
            _cache = new Array(),
            defaults = { 
                storage: 'local', 
                prefix: 'as-', 
                exclude_ids: new Array(), 
                exclude_types: new Array(), 
            }; 
        
        $(function() {
            settings = $.extend({}, defaults, options);
            data =  (settings['storage'] !== undefined) 
                        ? localStorage : (settings['storage'] !== 'session') 
                                            ? sessionStorage : localStorage;

            exclude_ids     = (settings['exclude_ids'] !== undefined) ? settings['exclude_ids'] : new Array();
            exclude_types   = (settings['exclude_types'] !== undefined) ? settings['exclude_types'] : new Array();

            //submit = (settings['submit'] !== undefined) ? settings['submit'] : true;
            prefix = (settings['prefix'] !== undefined) ? settings['prefix'] : 'as-';
            init();
        });
        
        $(':input').change( function() {
            return on_change($(this));
        });
        
        function init() {
            // Iterate through all the inputs and assign them a value
            $('input, select, textarea').each( function () { // Some sanity checks

                if($(this).is('select')) {
                    $(this).attr('type','select'); // select fix
                }
                if($(this).is('textarea')) {
                    $(this).attr('type','textarea'); // textarea fix
                }

                if(hasValue($(this).attr('type'), exclude_types)) {  return true; } // Was it explicity excluded?
                if(hasValue($(this).attr('id'), exclude_ids)) { return true; } // Was it explicity excluded?

                var _ignore = $(this).data('as-ignore'); // Was it excluded with a data attr?
                if (_ignore!==undefined) { if(_ignore.toLowerCase()=='true'){ return true; } }

                $(this).data('as-id', node_count++); // Assign our custom id
                as_ident += $(this).attr('type').length * node_count; // Give us a unique number depending on what the type order is
            });
            if(as_ident!=_load("ident")) { return false; } // Ident is different, we shouldnt continue loading anything

            // Get the keystore
            parse_keystore();

            jQuery.each(_cache, function(key, v) {
                if (v!=null) { console.log('uh oh'); }
                keys = $("input[data-as-id='" + key + "'], select[data-as-id='" + key + "'], textarea[data-as-id='" + key + "']");
                if(keys.length == 0) { console.log('Couldnt find the element'); return true; }
                value = _load(key);
                jQuery.each(eles, function(k, ele) {
                    ele.val(value);
                });
            });
        }

        function on_change(element) {
            var ele_id = $(element[0]).data('as-id');
            _save(ele_id, $(element[0]).val())
        }

        function parse_keystore() {
            keys = _load("keystore");
            keys = keys.split(',');
            jQuery.each(keys, function(k, key) {
                _cache[key] = null;
            });
        }

        function _save(key, object) {
            _cache[key] = object;
            // regenerate the keystore
            var keys = [];
            for(var key in _cache) {
                if(_cache.hasOwnProperty(key)) { //to be safe
                    keys.push(key);
                }
            }
            data.setItem(prefix+'keystore', JSON.stringify(keys.join(",")));
            data.setItem(prefix+'ident', JSON.stringify(as_ident));
            // finally return
            return data.setItem(prefix+key, JSON.stringify(object));
        }
        function _load(key) {
            return jQuery.parseJSON(data.getItem(prefix+key));
        }

        function getValues(form) {
            var fname = $(form).attr('name');
            var nodes = new Object();
            
            $(form).find('input[type=text]').each( function () {
                if(hasValue($(this).attr('name'), exclude)) { return true; }
                var e = $(this).attr('name');
                nodes[e] = {'--type': 'text', 'value': $(this).val()};
            });
            
            $(form).find('input[type=checkbox]').each( function () {
                if(hasValue($(this).attr('name'), exclude)) { return true; }
                nodes[$(this).attr('name')] = { '--type': 'checkbox', 'is_checked': $(this).is(':checked') };
            });
            
            $(form).find('input[type=radio]').each( function () {
                if(hasValue($(this).attr('name'), exclude)) { return true; }
                if($(this).is(':checked')) {
                    nodes[$(this).attr('name')] = { '--type': 'radio', 'value': $(this).val(),'is_checked': $(this).is(':checked') };
                }
            });
            
            $(form).find('select').each( function () {
                if(hasValue($(this).attr('name'), exclude)) { return true; }
                var sname = $(this).attr('name');
                $(this).children('option').each( function() {
                    if(nodes[sname] === undefined) {
                        nodes[sname] = new Object();
                    }
                    nodes[sname][$(this).val()] = $(this).is(':selected');
                });
                nodes[sname]['--type'] = 'select';
            });
            
            return nodes;
        }

        function loadValues() {
            var storage = jQuery.parseJSON(data.getItem("autoStorage"));
            jQuery.each(storage, function(formname, form) {
                jQuery.each(form, function(elementname, element) {
                    var type = element['--type'];
                    if(type == 'text') {
                        $('form[name='+formname+']').find('input[name='+escapeName(elementname)+']').val(element['value']);
                    }
                    else if(type == 'checkbox') {
                        if(element['is_checked']) {
                            $('form[name='+formname+']').find('input[name='+escapeName(elementname)+']').attr('checked', 'checked');
                        }
                    }
                    else if(type == 'radio') {
                        if(element['is_checked']) {
                            $('form[name='+formname+']').find('input[name='+escapeName(elementname)+'][value='+element['value']+']').attr('checked', 'checked');
                        }
                    }
                    else if(type == 'select') {
                        jQuery.each(element, function(value, is_selected) {
                            $('form[name='+formname+']').find('select[name='+escapeName(elementname)+']').children('option').each( function() {
                                if($(this).val() == value && is_selected) {
                                    $(this).attr('selected', 'selected');
                                } 
                            });
                        });
                    }
                });
            });
        }
        
        function hasValue(val, array) {
            for(var i = 0; i < array.length; i++) {
                if(array[i] == val) {
                    return true;
                }
            }
            return false;
        }
        
        function escapeName(str) {
            str = str.replace(/\[/, '\\[');
            str = str.replace(/\]/, '\\]');
            return str;
        }
        
        function clear() {
            data.removeItem('autoStorage');
        }   
    };
})( jQuery );
/*
$(document).ready( function() {
    $().autoStore();
});*/
