lord.showVideoThumb = function(e, a) {
    if (a.img) {
        document.body.appendChild(a.img);
        return;
    }
    var thumbUrl = lord.data("thumbUrl", a, true);
    var thumbWidth = +lord.data("thumbWidth", a, true);
    var thumbHeight = +lord.data("thumbHeight", a, true);
    if (!thumbUrl)
        return;
    a.img = lord.node("img");
    a.img.width = thumbWidth;
    a.img.height = thumbHeight;
    a.img.src = thumbUrl;
    lord.addClass(a.img, "movableImage");
    a.img.style.left = (e.clientX + 30) + "px";
    a.img.style.top = (e.clientY - 10) + "px";
    document.body.appendChild(a.img);
};

lord.moveVideoThumb = function(e, a) {
    if (!a.img)
        return;
    a.img.style.left = (e.clientX + 30) + "px";
    a.img.style.top = (e.clientY - 10) + "px";
};

lord.hideVideoThumb = function(e, a) {
    if (!a.img)
        return;
    document.body.removeChild(a.img);
};

lord.expandCollapseYoutubeVideo = function(a) {
    var videoId = lord.data("videoId", a, true);
    if (!videoId)
        return;
    if (a.lordExpanded) {
        a.parentNode.removeChild(a.nextSibling);
        a.parentNode.removeChild(a.nextSibling);
        a.replaceChild(lord.node("text", "[" + lord.text("expandVideoText") + "]"), a.childNodes[0]);
        lord.removeClass(a.parentNode, "expand");
    } else {
        lord.addClass(a.parentNode, "expand");
        var iframe = lord.node("iframe");
        iframe.src = "https://youtube.com/embed/" + videoId + "?autoplay=1";
        iframe.allowfullscreen = true;
        iframe.frameborder = "0px";
        iframe.height = "360";
        iframe.width = "640";
        iframe.display = "block";
        var parent = a.parentNode;
        var el = a.nextSibling;
        if (el) {
            parent.insertBefore(lord.node("br"), el);
            parent.insertBefore(iframe, el);
        } else {
            parent.appendChild(lord.node("br"));
            parent.appendChild(iframe);
        }
        a.replaceChild(lord.node("text", "[" + lord.text("collapseVideoText") + "]"), a.childNodes[0]);
    }
    a.lordExpanded = !a.lordExpanded;
};

lord.expandCollapseCoubVideo = function(a) {
    var videoId = lord.data("videoId", a, true);
    if (!videoId)
        return;
    if (a.lordExpanded) {
        a.parentNode.removeChild(a.nextSibling);
        a.parentNode.removeChild(a.nextSibling);
        a.replaceChild(lord.node("text", "[" + lord.text("expandVideoText") + "]"), a.childNodes[0]);
        lord.removeClass(a.parentNode, "expand");
    } else {
        lord.addClass(a.parentNode, "expand");
        var iframe = lord.node("iframe");
        iframe.src = "https://coub.com/embed/" + videoId
            + "?muted=false&autostart=false&originalSize=false&hideTopBar=false&startWithHD=false";
        iframe.allowfullscreen = true;
        iframe.frameborder = "0px";
        iframe.height = "360";
        iframe.width = "480";
        iframe.display = "block";
        var parent = a.parentNode;
        var el = a.nextSibling;
        if (el) {
            parent.insertBefore(lord.node("br"), el);
            parent.insertBefore(iframe, el);
        } else {
            parent.appendChild(lord.node("br"));
            parent.appendChild(iframe);
        }
        a.replaceChild(lord.node("text", "[" + lord.text("collapseVideoText") + "]"), a.childNodes[0]);
    }
    a.lordExpanded = !a.lordExpanded;
};
