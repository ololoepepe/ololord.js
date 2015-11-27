lord.customPostHeaderPart[120] = function() {
    return lord.getTemplate("socPostHeaderPart").then(function(template) {
        return function(it, thread, post) {
            var model = merge.recursive(it, post.extraData || {
                likes: [],
                dislikes: [],
                likeCount: 0,
                dislikeCount: 0
            });
            model.thread = thread;
            model.post = post;
            return template(model);
        };
    });
};

lord.likeDislike = function(event, form) {
    event.preventDefault();
    var formData = new FormData(form);
    return $.ajax(form.action, {
        type: "POST",
        data: formData,
        processData: false,
        contentType: false
    }).then(function(result) {
        if (result.errorMessage)
            return Promise.reject(result.errorMessage);
        return lord.updatePost(lord.data("number", form, true));
    }).catch(lord.handleError);
};
