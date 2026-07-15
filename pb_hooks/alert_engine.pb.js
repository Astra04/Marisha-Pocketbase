onRecordAfterCreateSuccess((e) => {
    try {
        const route = e.record.get("route");
        const severity = e.record.get("severity");
        const trace = e.record.get("trace");

        // Single recovered panic is logged but doesn't immediately escalate
        if (severity !== "critical" && severity !== "fatal") {
            e.next();
            return;
        }

        // Get window for crash loop detection (5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const timeString = fiveMinutesAgo.toISOString().replace("T", " ").substring(0, 19);

        // Find recent errors on the same route
        const recentErrors = $app.findRecordsByFilter(
            "error_events",
            "route = {:route} && created >= {:time}",
            "-created",
            0, 0,
            { route: route, time: timeString }
        );

        // Escalation threshold: 5 panics in 5 minutes
        if (recentErrors.length >= 5) {
            // Debounce: check if we've queued a recent alert for this route in the last 10 minutes
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const alertTimeString = tenMinutesAgo.toISOString().replace("T", " ").substring(0, 19);

            const recentAlerts = $app.findRecordsByFilter(
                "alert_queue",
                "content ~ {:route} && created >= {:time}",
                "-created",
                0, 0,
                { route: "%" + route + "%", time: alertTimeString }
            );

            // If we already alerted recently, debounce (log only, skip escalation queue)
            if (recentAlerts.length > 0) {
                console.log("[Alert Engine] Debouncing alert for route: " + route + " (recent alert exists)");
                e.next();
                return;
            }

            // Escalate! Enqueue alert queue records for Telegram and Email
            console.log("[Alert Engine] Escalating critical crash loop for route: " + route);
            const alertCollection = $app.findCollectionByNameOrId("alert_queue");

            // 1. Queue Telegram alert
            const telegramTarget = $os.getenv("TELEGRAM_CHAT_ID") || "";
            if (telegramTarget) {
                const tgRecord = new Record(alertCollection);
                tgRecord.set("channel", "telegram");
                tgRecord.set("target", telegramTarget);
                tgRecord.set("content", "🚨 *CRITICAL PANIC LOOP* 🚨\nRoute: `" + route + "`\nFrequency: " + recentErrors.length + " crashes in 5 minutes.\nSnippet:\n```\n" + trace.substring(0, 200) + "\n```");
                tgRecord.set("status", "pending");
                tgRecord.set("attempts", 0);
                $app.save(tgRecord);
            }

            // 2. Queue Email alert
            const adminEmail = $os.getenv("ADMIN_EMAIL") || "ops@marisha.africa";
            const emailRecord = new Record(alertCollection);
            emailRecord.set("channel", "email");
            emailRecord.set("target", adminEmail);
            emailRecord.set("content", "CRITICAL PANIC LOOP DETECTED\n\nRoute: " + route + "\nCrashes: " + recentErrors.length + " in 5 minutes.\n\nStack Trace:\n" + trace);
            emailRecord.set("status", "pending");
            emailRecord.set("attempts", 0);
            $app.save(emailRecord);
        }

    } catch (err) {
        console.log("[Alert Engine] Error running hook: " + err);
    }

    e.next();
}, "error_events");
