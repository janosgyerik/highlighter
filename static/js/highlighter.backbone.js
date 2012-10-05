/*!
 * highlighter backbone JavaScript Library v0.1
 * http://.../
 *
 * Copyright 2012, Janos Gyerik
 * http://.../license
 *
 * Date: Fri Oct  5 18:56:59 CEST 2012
 */


// the basic namespace
// TODO: put in app.js
window.App = {};

_.templateSettings = { interpolate: /\{\{(.+?)\}\}/g };

// classes
// TODO: put in app/*.js


App.Model = Backbone.Model.extend({
    defaults: {
        original: '',
        keywords: [],
        words: {}
    },
    initialize: function() {
        this.on('change:original', this.onOriginalUpdated, this);
    },
    onOriginalUpdated: function() {
        console.log('debug: onOriginalUpdated');
        var words = {};
        _.each(this.get('original').split(/\W+/), function(word) {
            words[word] = (words[word] || 0) + 1;
        });
        this.set({words: words});
    },
    getHighlighted: function() {
        var highlighted = this.get('original');
        _.each(this.get('keywords'), function(keyword) {
            highlighted = highlighted.replace(new RegExp(keyword, 'gi'), '<b>' + keyword + '</b>');
        });
        return highlighted;
    }
});

App.Tab = Backbone.View.extend({
    activate: function() {
        var id = this.$el.attr('id');
        var anchor = $('a[href=#' + id + ']');
        anchor.tab('show');
    }
});

App.OriginalTab = App.Tab.extend({
    initialize: function() {
        this.lat = this.$('.lat');
    },
    fieldToFocus: this.$('.lat'),
    events: {
        'click .btn-goto': 'gotoLatLon',
        'click .btn-pin':  'dropPin',
        'click .btn-here': 'getCurrentLatLon',
        'click .btn-home': 'gotoHome',
        'keypress .lat': 'onEnter',
        'keypress .lon': 'onEnter'
    },
    gotoLatLon: function() {
        var lat = this.lat.val();
        var lon = this.lon.val();
        if (lat && lon) {
            this.map.trigger('gotoLatLon', lat, lon);
        }
    },
    dropPin: function() {
        var lat = this.lat.val();
        var lon = this.lon.val();
        if (lat && lon) {
            this.map.trigger('gotoLatLon', lat, lon);
            this.map.trigger('dropPin', lat, lon);
        }
    },
    getCurrentLatLon: function() {
        var lat = this.lat;
        var lon = this.lon;
        var callback = function(lat_, lon_) {
            lat.val(lat_);
            lon.val(lon_);
        };
        this.map.trigger('getCurrentLatLon', callback);
    },
    gotoHome: function() {
        this.map.trigger('gotoHome');
    },
    onEnter: function(e) {
        if (e.keyCode == '13') {
            e.preventDefault();
            this.gotoLatLon();
        }
    }
});

App.HighlightedTab = App.Tab.extend({
    initialize: function() {
        this.address = this.$('.address');
    },
    fieldToFocus: this.$('.address'),
    events: {
        'click .btn-geocode': 'geocode',
        'keypress .address': 'onEnter'
    },
    geocode: function() {
        var address = this.address.val();
        if (address) {
            this.map.trigger('geocode', address);
        }
    },
    onEnter: function(e) {
        if (e.keyCode == '13') {
            e.preventDefault();
            this.geocode();
        }
    }
});

function onDomReady() {
    // instances
    // TODO: put in setup.js
    App.model = new App.Model();

    App.originalTab = new App.OriginalTab({
        el: $('#original-tab'),
        model: App.model
    });

    App.highlightedTab = new App.HighlightedTab({
        el: $('#highlighted-tab'),
        model: App.model
    });

    // debugging
    App.highlightedTab.activate();
    //App.localSearchTool.keyword.val('pizza');
    //App.localSearchTool.localSearch();

    //App.geocodeTool.activate();
    //App.geocodeTool.address.val('6 Rue Mizon, 75015 Paris, France');
    //App.geocodeTool.geocode();

    // this is to force all views to render
    //App.mapController.trigger('change');

    $('.keyword').val('lorem');
    $('.orig').text('Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum');
    App.model.set({original: $('.orig').text()});
    App.model.set({keywords: ['lorem', 'ipsum']});
    var hh = App.model.getHighlighted();
    $('.highlighted').html(hh);
}

$(function() {
    onDomReady();
});

// eof
