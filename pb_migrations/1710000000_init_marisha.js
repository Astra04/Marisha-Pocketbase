migrate((app) => {
    // 1. Create the 'operators' auth collection
    const operators = new Collection({
        name: "operators",
        type: "auth",
        system: false,
        schema: [
            {
                name: "name",
                type: "text",
                required: false
            },
            {
                name: "role",
                type: "text",
                required: true,
                options: {
                    min: 1
                }
            }
        ],
        options: {
            allowEmailAuth: true,
            allowUsernameAuth: true,
            requireEmail: true,
            onlyVerified: false
        }
    });
    app.save(operators);

    // Seed default operator record
    const adminRecord = new Record(operators);
    adminRecord.set("email", "admin@marisha.africa");
    adminRecord.setPassword("password123");
    adminRecord.set("name", "Marisha Operator");
    adminRecord.set("role", "admin");
    app.save(adminRecord);

    // 2. Create the 'error_events' base collection
    const errorEvents = new Collection({
        name: "error_events",
        type: "base",
        system: false,
        schema: [
            {
                name: "route",
                type: "text",
                required: true
            },
            {
                name: "trace",
                type: "text",
                required: true
            },
            {
                name: "merchant_id",
                type: "text",
                required: false
            },
            {
                name: "shopper_context",
                type: "json",
                required: false
            },
            {
                name: "severity",
                type: "text",
                required: true
            }
        ]
    });
    app.save(errorEvents);

    // 3. Create the 'alert_queue' base collection
    const alertQueue = new Collection({
        name: "alert_queue",
        type: "base",
        system: false,
        schema: [
            {
                name: "channel",
                type: "text",
                required: true
            },
            {
                name: "target",
                type: "text",
                required: true
            },
            {
                name: "content",
                type: "text",
                required: true
            },
            {
                name: "status",
                type: "text",
                required: true,
                options: {
                    min: 1
                }
            },
            {
                name: "attempts",
                type: "number",
                required: true
            },
            {
                name: "last_attempt",
                type: "date",
                required: false
            }
        ]
    });
    app.save(alertQueue);

}, (app) => {
    // Drop collections on rollback
    const q = app.findCollectionByNameOrId("alert_queue");
    if (q) app.delete(q);

    const ee = app.findCollectionByNameOrId("error_events");
    if (ee) app.delete(ee);

    const op = app.findCollectionByNameOrId("operators");
    if (op) app.delete(op);
});
