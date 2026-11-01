import * as aws from "@pulumi/aws";
import { alertEmail, config } from "./config";

// Account-wide: emails when this month's actual or forecast spend passes the limit
new aws.budgets.Budget("monthly-cost", {
  name: "monthly-cost",
  budgetType: "COST",
  limitAmount: config.require("monthlyBudgetUsd"),
  limitUnit: "USD",
  timeUnit: "MONTHLY",
  notifications: (["ACTUAL", "FORECASTED"] as const).map((notificationType) => ({
    notificationType,
    comparisonOperator: "GREATER_THAN",
    threshold: 100,
    thresholdType: "PERCENTAGE",
    subscriberEmailAddresses: [alertEmail],
  })),
});
