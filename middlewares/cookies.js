module.exports = function(req, res, next) {
    res.cookie("tmp_levels", JSON.stringify(req.levels || {}), { expires: null });
    next();
};
