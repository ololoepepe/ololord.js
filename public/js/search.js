window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    var match = window.location.search.match(/^\?query\=([^&]+)&board\=(.+)$/);
    if (!match)
        return;
    var query = decodeURIComponent(match[1]);
    var boardName = decodeURIComponent(match[2]);
    var formData = new FormData();
    formData.append("query", query);
    formData.append("boardName", boardName);
    lord.post("/" + lord.data("sitePathPrefix") + "action/search", formData).then(function(model) {
        model = merge.recursive(lord.model(["base", "tr"], true), model);
        var data = lord.template("searchResults", model);
        var searchResultsPlaceholder = lord.id("searchResultsPlaceholder");
        searchResultsPlaceholder.parentNode.replaceChild(data, searchResultsPlaceholder);
        var inp = lord.queryOne(".searchAction > form > [name='query']");
        if (inp) {
            inp = $(inp);
            if (model.searchQuery)
                inp.attr("value", model.searchQuery);
            inp.focus().select();
        }
        var sel = lord.queryOne(".searchAction > form > [name='board']");
        if (sel) {
            for (var i = 0; i < sel.options.length; ++i) {
                if (boardName == sel.options[i].value) {
                    sel.selectedIndex = i;
                    break;
                }
            }
        }
    }).catch(lord.handleError);
}, false);
