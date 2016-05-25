var lord = lord || {};

lord.node = function(type, text) {
    if (typeof type != "string")
        return null;
    type = type.toUpperCase();
    return ("TEXT" == type) ? document.createTextNode(text ? text : "") : document.createElement(type);
};

lord.preventOnclick = function(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    return false;
};

lord.countSymbols = function(textarea) {
    if (!textarea)
        return;
    var span = textarea.parentNode.querySelector(".symbolCounter");
    span = span.querySelector("[name='used']");
    if (span.childNodes.length > 0)
        span.removeChild(span.childNodes[0]);
    span.appendChild(lord.node("text", textarea.value.length.toString()));
};

lord.expandCollapseSpoiler = function(titleSpan) {
    if (!titleSpan)
        return;
    var span = titleSpan.parentNode;
    if (!span)
        return;
    var bodySpan = span.querySelector(".cspoilerBody");
    if (!bodySpan)
        return;
    var expanded = (bodySpan.style.display != "none");
    bodySpan.style.display = expanded ? "none" : "block";
    var blockquote = $(span).closest("blockquote");
    if (blockquote[0]) {
        if (expanded) {
            --blockquote[0]._expand;
            if (blockquote[0]._expand <= 0)
                blockquote.removeClass("expand");
        } else {
            if (!blockquote[0]._expand)
                blockquote[0]._expand = 1;
            else
                ++blockquote[0]._expand;
            blockquote.addClass("expand");
        }
    }
};

lord.updatePlayerTracksHeight = function() {
    var tracks = $("#playerTracks");
    tracks.css("max-height", ($("#player").height() - tracks.position().top - 44) + "px");
};

lord.setPlayerVisible = function(e, visible) {
    e.stopPropagation();
    $("#player")[visible ? "removeClass" : "addClass"]("minimized");
    if (visible)
        lord.updatePlayerTracksHeight();
};
        
window.addEventListener("load", function load() {
    window.removeEventListener("load", load);
    $("#options").buttonset();
    $("[name='markupHtml'], [name='optionDraft']").button();
}, false);
