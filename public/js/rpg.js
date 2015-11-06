/*Functions*/

lord.customResetForm = function(form) {
    var parent = lord.nameOne("voteVariants", form);
    if (!parent)
        return;
    lord.arr(parent.children).forEach(function(el) {
        parent.removeChild(el);
    });
    var text = lord.nameOne("voteText", form);
    text.parentNode.replaceChild(text.cloneNode(false), text);
};

lord.addVoteVariant = function(el) {
    var form = el.parentNode.parentNode;
    var parent = lord.nameOne("voteVariants", form);
    var variants = lord.query("div > input", parent);
    var lastN = 0;
    lord.query("div > input", parent).forEach(function(inp) {
        if (isNaN(inp.name.substr(12)))
            return;
        ++lastN;
    });
    var div = lord.node("div");
    lord.addClass(div, "nowrap");
    var inp = lord.node("input");
    inp.type = "text";
    inp.name = "voteVariant_" + (lastN + 1);
    inp.size = "43";
    div.appendChild(inp);
    var a = lord.node("a");
    a.onclick = lord.removeVoteVariant.bind(lord, a);
    var img = lord.node("img");
    img.src = "/" + lord.text("sitePathPrefix") + "img/delete.png";
    img.title = lord.text("removeVoteVariantText");
    lord.addClass(img, "buttonImage");
    a.appendChild(img);
    div.appendChild(a);
    parent.appendChild(div);
};

lord.removeVoteVariant = function(el) {
    var div = el.parentNode;
    var parent = div.parentNode;
    parent.removeChild(div);
    var i = 0;
    lord.query("div > input", parent).forEach(function(inp) {
        if (isNaN(inp.name.substr(12)))
            return;
        ++i;
        inp.name = "voteVariant_" + i;
    });
};

lord.vote = function(postNumber) {
    postNumber = +postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return;
    var post = lord.id("post" + postNumber);
    if (!post)
        return;
    var votes = [];
    var variants = lord.nameOne("voteVariants", post);
    var multiple = ("true" == lord.queryOne("input[type='hidden']", variants).value);
    if (multiple) {
        lord.query("input[type='checkbox']").forEach(function(inp) {
            if (!!inp.checked)
                votes.push(inp.name.replace("voteVariant", ""));
        });
    } else {
        lord.query("input[type='radio']").forEach(function(inp) {
            if (!!inp.checked)
                votes.push(inp.value);
        });
    }
    lord.ajaxRequest("vote", [postNumber, votes], lord.RpcVoteId, function() {
        lord.updatePost("rpg", postNumber, post);
    });
};

lord.unvote = function(postNumber) {
    postNumber = +postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return;
    var post = lord.id("post" + postNumber);
    if (!post)
        return;
    lord.ajaxRequest("unvote", [postNumber], lord.RpcUnvoteId, function() {
        lord.updatePost("rpg", postNumber, post);
    });
};

lord.setVoteOpened = function(postNumber, opened) {
    postNumber = +postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return;
    var post = lord.id("post" + postNumber);
    if (!post)
        return;
    var title = lord.text("enterPasswordTitle");
    var label = lord.text("enterPasswordText");
    lord.showPasswordDialog(title, label, function(pwd) {
        if (null === pwd)
            return;
        if (pwd.length < 1) {
            if (!lord.getCookie("hashpass"))
                return lord.showPopup(lord.text("notLoggedInText"), {type: "critical"});
        } else if (!lord.isHashpass(pwd)) {
            pwd = lord.toHashpass(pwd);
        }
        lord.ajaxRequest("set_vote_opened", [postNumber, !!opened, pwd], lord.RpcSetVoteOpenedId, function() {
            lord.updatePost("rpg", postNumber, post);
        });
    });
};

lord.customPostBodyPart[20] = function() {
    return lord.getTemplate("rpgPostBodyPart").then(function(template) {
        return function(it, thread, post) {
            if (!post.extraData)
                return "";
            var model = merge.recursive(it, post.extraData);
            model.thread = thread;
            model.post = post;
            return template(model);
        };
    });
};

lord.customEditPostDialogPart[50] = function() {
    return lord.getTemplate("rpgEditPostDialogPart").then(function(template) {
        return function(it, thread, post) {
            var model;
            if (post.extraData)
                model = merge.recursive(it, post.extraData);
            else
                model = merge.clone(it);
            model.thread = thread;
            model.post = post;
            return template(model);
        };
    });
};
