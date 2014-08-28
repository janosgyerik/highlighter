var App = window.App = {};

_.templateSettings = { interpolate: /\{\{(.+?)\}\}/g };

App.Model = Backbone.Model.extend({
    defaults: function () {
        return {
            original: '',
            keywords: [],
            words: {},
            highlighted: ''
        };
    },
    initialize: function () {
        this.on('change:original', this.onOriginalUpdated, this);
        this.on('change:keywords', this.onKeywordsUpdated, this);
    },
    updateWords: function () {
        var words = {};
        _.each(this.get('original').split(/\W+/), function (word) {
            word = word.toLowerCase();
            words[word] = (words[word] || 0) + 1;
        });
        this.set({words: words});
    },
    updateHighlighted: function () {
        var highlighted = this.escape('original');
        var cnt = 1;
        _.each(this.get('keywords'), function (keyword) {
            var pattern = '\\b' + keyword;
            var cname = 'hlt' + cnt++;
            highlighted = highlighted.replace(new RegExp(pattern, 'gi'), '<span class="' + cname + '">' + keyword + '</span>');
        });
        this.set({highlighted: highlighted});
    },
    onOriginalUpdated: function () {
        this.updateWords();
        this.updateHighlighted();
    },
    onKeywordsUpdated: function () {
        this.updateHighlighted();
    },
    getCount: function (word) {
        var pattern = '\\b' + word;
        var matches = this.get('original').match(new RegExp(pattern, 'gi'));
        return matches ? matches.length : 0;
    }
});

App.Tab = Backbone.View.extend({
    activate: function () {
        var id = this.$el.attr('id');
        var anchor = $('a[href=#' + id + ']');
        anchor.tab('show');
    }
});

App.OriginalTab = App.Tab.extend({
    initialize: function () {
        this.text = this.$('.text');
    },
    fieldToFocus: this.$('.text'),
    events: {
        'blur .text': 'onTextChanged'
    },
    onTextChanged: function () {
        this.model.set({original: this.text.val()});
    }
});

jQuery.fn.selectText = function () {
    var element = this[0];
    var range;
    if (document.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(element);
        range.select();
    } else if (window.getSelection) {
        var selection = window.getSelection();
        range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    }
};

App.HighlightedTab = App.Tab.extend({
    template: _.template($('#highlighted-template').html()),
    initialize: function () {
        this.model.bind('change:highlighted', this.render, this);
    },
    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        var element = this.$('.highlighted');
        this.$('.select').click(function () {
            element.selectText();
        });
        return this;
    }
});

App.KeywordView = Backbone.View.extend({
    tagName: 'tr',
    template: _.template($('#keyword-template').html()),
    events: {
        'dblclick .view': 'edit',
        'click a.destroy': 'clear',
        'keypress .edit': 'updateOnEnter',
        'blur .edit': 'close'
    },
    initialize: function () {
        this.model.bind('change', this.render, this);
        this.model.bind('destroy', this.remove, this);
    },
    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        this.input = this.$('.edit');
        return this;
    },
    edit: function () {
        this.$el.addClass('editing');
        this.input.focus();
    },
    close: function () {
        var value = this.input.val();
        if (!value) {
            this.clear();
        }
        this.model.set({keyword: value});
        this.$el.removeClass('editing');
    },
    updateOnEnter: function (e) {
        if (e.keyCode == 13) {
            this.close();
        }
    },
    clear: function () {
        this.model.clear();
    }
});

App.Keyword = Backbone.Model.extend({
    defaults: function () {
        return {
            keyword: 'empty keyword...',
            count: 0,
            index: 1
        };
    },
    initialize: function () {
        App.model.on('change:words', this.refreshCount, this);
        this.refreshCount();
    },
    refreshCount: function () {
        var keyword = this.get('keyword');
        this.set({count: App.model.getCount(keyword)});
    },
    clear: function () {
        this.destroy();
    }
});

App.KeywordList = Backbone.Collection.extend({
    model: App.Keyword,
    localStorage: new Store('highlighter-backbone'),
    initialize: function () {
        this.on('add', this.onChange, this);
        this.on('remove', this.onChange, this);
        this.on('reset', this.onChange, this);
    },
    onChange: function () {
        var keywords = this.pluck('keyword');
        App.model.set({keywords: keywords});
        App.highlightedTab.activate();
    }
});

App.KeywordsView = Backbone.View.extend({
    el: '#keywords',
    events: {
        'keypress .keyword': 'createOnEnter',
        'click th a.destroy': 'clear'
    },
    initialize: function (options) {
        this.keywords = options.list;
        this.input = this.$('.keyword');
        this.keywords.bind('add', this.add, this);
        this.keywords.bind('reset', this.reset, this);
        this.keywords.fetch();
        if (this.keywords.length) {
            this.keywords.each(this.add);
        }
        else {
            this.create('lorem');
            this.create('ipsum');
            this.create('dolor');
        }
    },
    add: function (keyword) {
        var view = new App.KeywordView({model: keyword});
        this.$('#keyword-list').append(view.render().el);
    },
    reset: function () {
        this.$('#keyword-list').empty();
    },
    createOnEnter: function (e) {
        if (e.keyCode != 13) {
            return;
        }
        if (!this.input.val()) {
            return;
        }
        var keyword = this.input.val();
        this.create(keyword);
        this.input.val('');
    },
    create: function (keyword) {
        var index = this.keywords.length + 1;
        this.keywords.create({keyword: keyword, index: index});
    },
    clear: function () {
        // todo: isn't there a better way?
        var i = 0;
        var maxiter = 10;
        while (true) {
            this.keywords.invoke('destroy');
            if (!this.keywords.length || ++i > maxiter) {
                break;
            }
        }
    }
});

function onDomReady() {
    App.model = new App.Model();

    App.originalTab = new App.OriginalTab({
        el: $('#original-tab'),
        model: App.model
    });

    App.highlightedTab = new App.HighlightedTab({
        el: $('#highlighted-tab'),
        model: App.model
    });

    App.keywordList = new App.KeywordList();
    App.keywordsView = new App.KeywordsView({
        model: App.model,
        list: App.keywordList
    });

    $('#reset').click(function () {
        App.keywordsView.clear();
        App.originalTab.text.val('');
        App.originalTab.activate();
        App.originalTab.text.focus();
    });

    // other initialization
    App.keywordsView.input.focus();
    App.model.set({original: App.originalTab.text.text()});

    // debugging
    //App.highlightedTab.activate();
    //App.keywordsView.create('lorem');
    //App.keywordsView.create('ipsum');
    //App.keywordsView.create('dolor');
    //App.keywordsView.clear();
    //App.keywordsView.create('sit');
    //App.keywordsView.create('amet');
    //App.keywordsView.create('consec');
    //App.keywordsView.create('adip');
    //App.keywordsView.create('elit');
    //App.keywordsView.create('eget');
    //App.keywordsView.create('donec');
    //App.keywordsView.create('erat');
    //App.keywordsView.create('lobortis');
    //App.keywordsView.create('pellentesq');
    //App.keywordsView.create('nunc');
    //App.keywordsView.create('metus');
    //App.keywordsView.create('mollis');
    //App.keywordsView.create('arcu');
    //App.keywordsView.create('accumsa');
    //App.keywordsView.create('nibh');
    //App.keywordsView.create('pharet');
    //App.keywordsView.create('sollicit');
}

$(function () {
    onDomReady();
});
