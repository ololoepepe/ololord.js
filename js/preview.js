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

lord.fileDragOver = function(e, div) {
    e.preventDefault();
    $(div).addClass("drag");
    return false;
};

lord.fileDragLeave = function(e, div) {
    e.preventDefault();
    $(div).removeClass("drag");
    return false;
};

lord.makeFormFloat = function(e) {
    e.preventDefault();
    var pos = $("#postForm").offset();
    pos.left -= window.scrollX;
    pos.top -= window.scrollY;
    var setPos = function(p) {
        $("#postForm").css({
            left: p.left + "px",
            top: p.top + "px"
        });
    };
    setPos(pos);
    $("#postForm").addClass("floatingPostForm");
    var previous = {
        x: e.clientX,
        y: e.clientY
    };
    $("#postForm .postFormHeaderLabel").css("display", "none");
    $("#postForm .postFormHeader").removeAttr("draggable").on("mousedown", function(e) {
        previous = {
            x: e.clientX,
            y: e.clientY
        };
    }).on("mouseup", function(e) {
        previous = null;
    });
    $(document.body).on("mousemove", function(e) {
        if (!previous)
            return;
        pos.left += e.clientX - previous.x;
        pos.top += e.clientY - previous.y;
        setPos(pos);
        previous = {
            x: e.clientX,
            y: e.clientY
        };
    });
};

lord.closePostForm = function() {
    $("#postForm").removeClass("floatingPostForm");
    $("#postForm .postFormHeaderLabel").css("display", "");
    $("#postForm .postFormHeader").attr("draggable", true).off("mousedown").off("mouseup");
    $(document.body).off("mousemove");
};
        
window.addEventListener("load", function load() {
    window.removeEventListener("load", load);
    $("#options").buttonset();
    $("[name='markupHtml'], [name='optionDraft']").button();
    $(".menu li.ui-menu-item").mouseover(function() {
        $(this).addClass("ui-state-hover");
    }).mouseout(function() {
        $(this).removeClass("ui-state-hover");
    });
    var height = $(".toolbar.sticky").height();
    $("body").css("padding-top", (height + 6) + "px");
    //var target = $(":target");
    //var offset = target.offset();
    //var scrollto = offset.top - $(".toolbar.sticky").height() - 26;
    var scrollto = 0;
    $("html, body").animate({ scrollTop: scrollto }, 0);
}, false);
