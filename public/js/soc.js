lord.customPostHeaderPart[120] = function(it, thread, post) {
    var model = merge.recursive(it, post.extraData || {
        likes: [],
        dislikes: [],
        likeCount: 0,
        dislikeCount: 0
    });
    model.thread = thread;
    model.post = post;
    return lord.template("socPostHeaderPart")(model);
};

lord.likeDislike = function(event, form) {
    event.preventDefault();
    return lord.post(form.action, new FormData(form)).then(function(result) {
        return lord.updatePost(lord.data("number", form, true));
    }).catch(lord.handleError);
};
