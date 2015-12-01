lord.customPostBodyPart[20] = function() {
    return function(it, thread, post) {
        if (!post.extraData)
            return "";
        var model = {
            userAgent: post.extraData,
            post: post
        };
        return lord.template("dPostBodyPart")(model);
    };
};
