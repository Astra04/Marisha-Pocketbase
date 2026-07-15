function sendPendingAlerts() {
    try {
        // Query alert_queue for any pending or failed alerts with < 5 attempts
        const alerts = $app.findRecordsByFilter(
            "alert_queue",
            "(status = 'pending' || status = 'failed') && attempts < 5",
            "created",
            100,
            0
        );

        if (alerts.length === 0) {
            return;
        }

        console.log("[Alert Sender] Processing " + alerts.length + " queued alerts...");

        for (const alert of alerts) {
            let success = false;
            const channel = alert.get("channel");
            const target = alert.get("target");
            const content = alert.get("content");
            const attempts = alert.get("attempts") + 1;

            alert.set("attempts", attempts);
            alert.set("last_attempt", new Date().toISOString());

            if (channel === "telegram") {
                const token = $os.getenv("TELEGRAM_BOT_TOKEN");
                if (!token || !target) {
                    console.log("[Alert Sender] Missing Telegram config. Bot token or target not set.");
                } else {
                    try {
                        const res = $http.send({
                            url: "https://api.telegram.org/bot" + token + "/sendMessage",
                            method: "POST",
                            body: JSON.stringify({
                                chat_id: target,
                                text: content,
                                parse_mode: "Markdown"
                            }),
                            headers: {
                                "content-type": "application/json"
                            },
                            timeout: 10
                        });

                        if (res.statusCode === 200) {
                            success = true;
                        } else {
                            console.log("[Alert Sender] Telegram API returned code " + res.statusCode + ": " + JSON.stringify(res.json));
                        }
                    } catch (httpErr) {
                        console.log("[Alert Sender] Telegram request error: " + httpErr);
                    }
                }
            } else if (channel === "email") {
                try {
                    const sender = $app.settings().meta.senderAddress || "ops@marisha.africa";
                    const message = new MailerMessage({
                        from: { address: sender },
                        to: [{ address: target }],
                        subject: "🚨 Marisha Operational Alert",
                        html: "<p>" + content.replace(/\n/g, "<br>") + "</p>"
                    });

                    $app.newMailClient().send(message);
                    success = true;
                } catch (emailErr) {
                    console.log("[Alert Sender] Email delivery error: " + emailErr);
                }
            }

            if (success) {
                alert.set("status", "sent");
                console.log("[Alert Sender] Alert " + alert.id + " sent successfully via " + channel);
            } else {
                alert.set("status", "failed");
                console.log("[Alert Sender] Alert " + alert.id + " failed via " + channel + " (Attempt " + attempts + ")");
            }

            $app.save(alert);
        }
    } catch (err) {
        console.log("[Alert Sender] Error running queue processor: " + err);
    }
}

// 1. Hook on record creation to trigger instantly
onRecordAfterCreateSuccess((e) => {
    // Run asynchronously to avoid blocking the client request that wrote to the queue
    setTimeout(() => {
        sendPendingAlerts();
    }, 100);
    e.next();
}, "alert_queue");

// 2. Cron job running every minute for retry queue processing
cronAdd("process_alert_queue", "*/1 * * * *", () => {
    console.log("[Alert Sender Cron] Checking for pending/failed retries...");
    sendPendingAlerts();
});
