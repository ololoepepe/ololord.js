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
    var model = lord.model(["base", "tr"], true);
    model.number = lastN + 1;
    parent.appendChild(lord.template("voteVariant", model));
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
        var ownVotes = lord.getLocalObject("ownVotes", {});
        var postNumber = +lord.nameOne("postNumber", form).value;
        if (form.action.split("/").pop() == "vote") {
            var ids = {};
            lord.query("[type='checkbox']", form).forEach(function(cbox) {
                if (cbox.checked)
                    ids[cbox.value] = 1;
            });
            lord.query("[type='radio']", form).forEach(function(radio) {
                if (radio.checked)
                    ids[radio.value] = 1;
            });
            ownVotes[postNumber] = ids;
        } else {
            delete ownVotes[postNumber];
        }
        lord.setLocalObject("ownVotes", ownVotes);
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
    c.div = lord.template("setVotingOpenedDialog", c.model);
    lord.showDialog(c.div, { title: (opened ? "openVotingText" : "closeVotingText") }).then(function(result) {
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

lord.customPostFormField[50] = function(it) {
    if (it.isThreadPage) {
        var ownPosts = lord.getLocalObject("ownPosts", {});
        if (!ownPosts["rpg/" + it.thread.number])
            return "";
    }
    var model = {
        site: it.site,
        tr: merge.clone(it.tr),
        board: merge.clone(it.board),
        minimalisticPostform: it.minimalisticPostform
    };
    return lord.template("rpgPostFormField", model, true);
};

lord.customEditPostDialogPart[50] = function(it, thread, post) {
    var model;
    if (post.extraData)
        model = merge.recursive(it, post.extraData);
    else
        model = merge.clone(it);
    model.thread = thread;
    model.post = post;
    return lord.template("rpgEditPostDialogPart", model, true);
};

lord.customPostBodyPart[20] = function(it, thread, post) {
    if (!post.extraData)
        return "";
    var model = merge.recursive(it, post.extraData);
    model.thread = thread;
    model.post = post;
    return lord.template("rpgPostBodyPart", model, true);
};

lord.postProcessors.push(function(post) {
    var postNumber = lord.data("number", post);
    var ownPosts = lord.getLocalObject("ownPosts", {});
    var ownVotes = lord.getLocalObject("ownVotes", {});
    var ids = ownVotes[postNumber];
    var form = lord.queryOne(".vote > form", post);
    var voteVariants = lord.nameOne("voteVariants", post);
    if (!voteVariants)
        return;
    if (ownPosts["rpg/" + postNumber]) {
        if (form)
            form.parentNode.replaceChild(voteVariants, form);
        lord.query("input", voteVariants).forEach(function(input) {
            input.setAttribute("disabled", true);
        });
    }
    if (ids) {
        lord.query("input", voteVariants).forEach(function(input) {
            input.setAttribute("disabled", true);
            if (ids[input.value])
                input.setAttribute("checked", true);
        });
        if (form) {
            form.action = form.action.replace(/\/vote$/, "/unvote");
            var btn = lord.nameOne("buttonVote", form);
            btn.setAttribute("name", "buttonUnvote");
            btn.src = btn.src.replace(/\/vote\.png$/, "/unvote.png");
            btn.title = lord.text("unvoteActionText");
        }
    }
});
