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
    var c = {};
    lord.getModel(["misc/base", "misc/tr"], true).then(function(model) {
        c.model = model;
        c.model.number = lastN + 1;
        return lord.getTemplate("voteVariant");
    }).then(function(template) {
        var div = $.parseHTML(template(c.model))[0];
        parent.appendChild(div);
    });
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
    var formData = new FormData(form);
    return $.ajax(form.action, {
        type: "POST",
        data: formData,
        processData: false,
        contentType: false
    }).then(function(result) {
        if (result.errorMessage)
            return Promise.reject(result.errorMessage);
        return lord.updatePost(lord.data("number", form, true));
    }).fail(function(err) {
        console.log(err);
    });
};

lord.setVotingOpened = function(el, opened) {
    var c = {};
    var postNumber = +lord.data("number", el, true);
    lord.getModel("misc/board", "boardName=rpg").then(function(model) {
        c.model = model;
        return lord.getModel(["misc/base", "misc/tr"], true);
    }).then(function(model) {
        c.model = merge.recursive(c.model, model);
        return lord.getTemplate("setVotingOpenedDialog");
    }).then(function(template) {
        c.model.showSubmitButton = false;
        c.model.opened = opened;
        c.model.postNumber = postNumber;
        c.div = $.parseHTML(template(c.model))[0];
        return lord.showDialog(open ? "openVotingText" : "closeVotingText", null, c.div);
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", c.div);
        var formData = new FormData(form);
        return $.ajax(form.action, {
            type: "POST",
            data: formData,
            processData: false,
            contentType: false
        });
    }).then(function(result) {
        if (typeof result == "undefined")
            return Promise.resolve();
        return lord.updatePost(postNumber);
    }).catch(function(err) {
        console.log(err);
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
