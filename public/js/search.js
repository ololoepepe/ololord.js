window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    var searchResultsPlaceholder = lord.id("searchResultsPlaceholder");
    var search = URI(window.location.href).search(true);
    var query = search.query;
    if (!query)
        return;
    var boardName = search.board;
    var page = +search.page || 0;
    var formData = new FormData();
    formData.append("query", query);
    formData.append("boardName", boardName || "*");
    formData.append("page", page);
    lord.post("/" + lord.data("sitePathPrefix") + "action/search", formData).then(function(model) {
        model = merge.recursive(lord.model(["base", "tr"]), model);
        model.page = page;
        model.boardName = boardName || "*";
        model.query = query;
        var data = lord.template("searchResults", model);
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
        $(".searchResultLink, .searchResultText").mark(model.phrases, {
            markData: { "class": "searchResultHighlighted" },
            ignoreCase: true
        });
    }).catch(function(err) {
        lord.handleError(err);
        searchResultsPlaceholder.parentNode.removeChild(searchResultsPlaceholder);
    });
}, false);
