lord.customEditPostDialogPart[30] = function(it, thread, post) {
    if (!post.isOp)
        return "";
    var model = {
        tr: merge.clone(it.tr),
        board: merge.clone(it.board),
        post: post
    };
    return lord.template("echoEditPostDialogPart")(model);
};

lord.customPostBodyPart[0] = function(it, thread, post) {
    if (!post.extraData || !+lord.data("threadNumber"))
        return "";
    var model = {
        link: post.extraData,
        deviceType: it.deviceType
    };
    return lord.template("echoPostBodyPart")(model);
};
