lord.customEditPostDialogPart[30] = function() {
    return lord.getTemplate("echoEditPostDialogPart").then(function(template) {
        return function(it, thread, post) {
            if (!post.isOp)
                return "";
            var model = {
                tr: merge.clone(it.tr),
                board: merge.clone(it.board),
                post: post
            };
            return template(model);
        };
    });
};
