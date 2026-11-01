import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { alertEmail, monthlyBudgetUsd } from "./config";
import { BUDGETS } from "./names";

/**
 * A monthly cost budget that emails alertEmail when the month's spend passes the limit:
 * the actual spend, and with "FORECASTED" the forecast too. `topics` are notified along
 * with the email.
 */
export function costBudget(
  logicalName: string,
  args: {
    name: string;
    limitUsd: pulumi.Input<string>;
    alertOn: ("ACTUAL" | "FORECASTED")[];
    costFilters?: aws.types.input.budgets.BudgetCostFilter[];
    topics?: pulumi.Input<string>[];
  }
) {
  return new aws.budgets.Budget(logicalName, {
    name: args.name,
    budgetType: "COST",
    limitAmount: args.limitUsd,
    limitUnit: "USD",
    timeUnit: "MONTHLY",
    costFilters: args.costFilters,
    notifications: args.alertOn.map((notificationType) => ({
      notificationType,
      comparisonOperator: "GREATER_THAN",
      threshold: 100,
      thresholdType: "PERCENTAGE",
      subscriberEmailAddresses: [alertEmail],
      subscriberSnsTopicArns: args.topics,
    })),
  });
}

// Account-wide: emails when this month's actual or forecast spend passes the limit
costBudget("monthly-cost", {
  name: BUDGETS.monthly,
  limitUsd: monthlyBudgetUsd,
  alertOn: ["ACTUAL", "FORECASTED"],
});
