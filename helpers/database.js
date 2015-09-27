var Sequelize = require("sequelize");

var promisify = require("./promisify");

var sequelize = new Sequelize(null, null, null, {
    dialect: "sqlite",
    pool: {
        max: 5,
        min: 0,
        idle: 10000
    },
    storage: (__dirname + "/../db.sqlite"),
    logging: false
});

var ModelType = {
    CaptchaQuota: 1
};

var models = {};
var modelDefinitions = {};

modelDefinitions[ModelType.CaptchaQuota] = function() {
    var model = sequelize.define("captchaQuota", {
        boardName: {
            type: Sequelize.TEXT,
            allowNull: false,
            //unique: "boardNameUserIpIndex",
            validate: { notEmpty: true }
        },
        userIp: {
            type: Sequelize.TEXT,
            allowNull: false,
            //unique: "boardNameUserIpIndex",
            validate: { isIPv4: true }
        },
        quota: {
            type: Sequelize.INTEGER,
            allowNull: false,
            validate: { min: 0 }
        }
    }, {
        timestamps: false,
        tableName: "captchaQuotas",
        indexes: [
            {
                unique: true,
                fields: ["boardName", "userIp"]
            }
        ]
    });
    model.removeAttribute("id");
    model.db = sequelize;
    return model;
};

module.exports.ModelType = ModelType;

module.exports.getModel = function(modelType) {
    if (!modelDefinitions.hasOwnProperty(modelType))
        return promisify.error("Invalid model type");
    if (models[modelType])
        return promisify.proxy(models[modelType]);
    var model = modelDefinitions[modelType]();
    return model.sync().then(function() {
        models[modelType] = model;
        return promisify.proxy(model);
    });
};

module.exports.getOrCreate = function(model, searchData, defaultData) {
    if (!model || !searchData)
        return promisify.error("Invalid model, or searchData, or defaultData");
    return model.findOne(searchData).then(function(item) {
        if (item)
            return promisify.proxy(item);
        return model.create(defaultData || searchData);
    });
};

module.exports.transaction = function(db) {
    if (!db || typeof db.transaction != "function")
        return promisify.error("Invalid database instance");
    return sequelize.transaction();
};
