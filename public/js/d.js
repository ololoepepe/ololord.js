lord.customPostBodyPart[20] = function() {
    return lord.getTemplate("dPostBodyPart").then(function(template) {
        return function(it, thread, post) {
            if (!post.extraData)
                return "";
            var model = {
                userAgent: post.extraData,
                post: post
            };
            return template(model);
        };
    });
};
