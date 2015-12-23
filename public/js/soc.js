lord.customPostHeaderPart[100] = function(it, thread, post) {
    var model = merge.recursive(it, post.extraData || {
        likes: [],
        dislikes: [],
        likeCount: 0,
        dislikeCount: 0
    });
    model.thread = thread;
    model.post = post;
    var ownLikes = lord.getLocalObject("ownLikes", {});
    model.liked = +ownLikes[post.number] > 0;
    model.disliked = +ownLikes[post.number] < 0;
    return lord.template("socPostHeaderPart", model, true);
};

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
