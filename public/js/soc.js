lord.likeDislike = function(event, form) {
    event.preventDefault();
    return lord.post(form.action, new FormData(form)).then(function(result) {
        var ownLikes = lord.getLocalObject("ownLikes", {});
        var postNumber = +lord.nameOne("postNumber", form).value;
        var val = +ownLikes[postNumber];
        if (form.action.split("/").pop() == "like") {
            if (!val || val < 0)
                ownLikes[postNumber] = 1;
            else
                delete ownLikes[postNumber];
        } else {
            if (!val || val > 0)
                ownLikes[postNumber] = -1;
            else
                delete ownLikes[postNumber];
        }
        lord.setLocalObject("ownLikes", ownLikes);
        return lord.updatePost(lord.data("number", form, true));
    }).catch(lord.handleError);
};

lord.customPostHeaderPart[100] = function(it, thread, post) {
    var model = merge.recursive(it, post.extraData || {
        likes: [],
        dislikes: [],
        likeCount: 0,
        dislikeCount: 0
    });
    model.thread = thread;
    model.post = post;
    return lord.template("socPostHeaderPart", model, true);
};

lord.postProcessors.push(function(post) {
    var postNumber = lord.data("number", post);
    var ownLikes = lord.getLocalObject("ownLikes", {});
    var likeArea = lord.nameOne("likeArea", post);
    if (!likeArea)
        return;
    if (+ownLikes[postNumber] > 0)
        lord.wrap(lord.nameOne("likeCount", likeArea), lord.node("b"));
    else if (+ownLikes[postNumber] < 0)
        lord.wrap(lord.nameOne("dislikeCount", likeArea), lord.node("b"));
});
