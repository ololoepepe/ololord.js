lord.customPostFormField[30] = function(it) {
    if (it.isThreadPage)
        return "";
    return lord.template("echoPostFormField", it, true);
};

lord.customEditPostDialogPart[30] = function(it, thread, post) {
    if (!post.isOp)
        return "";
    var model = {
        tr: merge.clone(it.tr),
        board: merge.clone(it.board),
        post: post
    };
    return lord.template("echoEditPostDialogPart", model, true);
};

lord.customPostBodyPart[0] = function(it, thread, post) {
    if (!post.extraData || !+lord.data("threadNumber"))
        return "";
    var model = {
        link: post.extraData,
        deviceType: it.deviceType
    };
    return lord.template("echoPostBodyPart", model, true);
};
