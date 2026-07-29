migrate((app) => {
    const resourceViews = new Collection({
        name: "resource_views",
        type: "base",
        system: false,
        schema: [
            {
                name: "actor_id",
                type: "text",
                required: true
            },
            {
                name: "actor_type",
                type: "text",
                required: true
            },
            {
                name: "actor_email",
                type: "text",
                required: false
            },
            {
                name: "action",
                type: "text",
                required: true
            },
            {
                name: "target_type",
                type: "text",
                required: true
            },
            {
                name: "target_id",
                type: "text",
                required: true
            },
            {
                name: "occurred_at",
                type: "date",
                required: true
            }
        ]
    });
    resourceViews.listRule = "@request.auth.id != \"\"";
    resourceViews.viewRule = "@request.auth.id != \"\"";
    resourceViews.createRule = "";
    resourceViews.updateRule = null;
    resourceViews.deleteRule = null;
    app.save(resourceViews);

}, (app) => {
    const rv = app.findCollectionByNameOrId("resource_views");
    if (rv) app.delete(rv);
});
