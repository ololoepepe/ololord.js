lord.customEditPostDialogPart[30] = function() {
    return function(it, thread, post) {
        if (!post.isOp)
            return "";
        var model = {
            tr: merge.clone(it.tr),
            board: merge.clone(it.board),
            post: post
        };
        return lord.template("echoEditPostDialogPart")(model);
    };
};
