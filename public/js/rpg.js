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
    var model = lord.model("base", "tr", true);
    model.number = lastN + 1;
    var div = $.parseHTML(lord.template("voteVariant")(model))[0];
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

lord.vote = function(event, form) {
    event.preventDefault();
    return lord.post(form.action, new FormData(form)).then(function(result) {
        return lord.updatePost(lord.data("number", form, true));
    }).catch(lord.handleError);
};

lord.setVotingOpened = function(el, opened) {
    var c = {};
    var postNumber = +lord.data("number", el, true);
    c.model = lord.model(["base", "tr", "board/rpg"], true);
    c.model.showSubmitButton = false;
    c.model.opened = opened;
    c.model.postNumber = postNumber;
    c.div = $.parseHTML(lord.template("setVotingOpenedDialog")(c.model))[0];
    lord.showDialog(opened ? "openVotingText" : "closeVotingText", null, c.div).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", c.div);
        return lord.post(form.action, new FormData(form));
    }).then(function(result) {
        if (typeof result == "undefined")
            return Promise.resolve();
        return lord.updatePost(postNumber);
    }).catch(lord.handleError);
};

lord.customPostBodyPart[20] = function() {
    return function(it, thread, post) {
        if (!post.extraData)
            return "";
        var model = merge.recursive(it, post.extraData);
        model.thread = thread;
        model.post = post;
        return lord.template("rpgPostBodyPart")(model);
    };
};

lord.customEditPostDialogPart[50] = function() {
    return function(it, thread, post) {
        var model;
        if (post.extraData)
            model = merge.recursive(it, post.extraData);
        else
            model = merge.clone(it);
        model.thread = thread;
        model.post = post;
        return lord.template("rpgEditPostDialogPart")(model);
    };
};
