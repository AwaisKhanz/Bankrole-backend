require('dotenv').config();
const stripe = require("../config/stripe");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const User = require("../models/User");

// Create Subscription
exports.createSubscription = catchAsync(async (req, res, next) => {
  const { paymentMethodId } = req.body;
  const user = req.user;

  if (!user.subscription?.customerId) {
    return next(
      new AppError("Customer ID not found. Please contact support.", 400)
    );
  }

  // Attach the payment method to the customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: user.subscription.customerId,
  });

  // Update the default payment method for the customer
  await stripe.customers.update(user.subscription.customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  // Create a Stripe subscription
  const subscription = await stripe.subscriptions.create({
    customer: user.subscription.customerId,
    items: [{ price: process.env.STRIPE_PLAN_PRICE_ID }],
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
  });

  // Update user subscription details
  user.subscription = {
    ...user.subscription,
    // status: subscription.status,
    status: "active",
    planId: process.env.STRIPE_PLAN_PRICE_ID,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    subscriptionId: subscription.id,
  };

  await user.save();

  res.status(201).json({
    subscriptionId: subscription.id,
    clientSecret: subscription.latest_invoice.payment_intent.client_secret,
  });
});

// Cancel Subscription
exports.cancelSubscription = catchAsync(async (req, res, next) => {
  const user = req.user;

  if (!user.subscription?.subscriptionId) {
    return next(
      new AppError("No active subscription found for this user", 404)
    );
  }

  try {
    // Set cancel_at_period_end to true
    const subscription = await stripe.subscriptions.update(
      user.subscription.subscriptionId,
      { cancel_at_period_end: true }
    );

    user.subscription.status = subscription.status;
    user.subscription.currentPeriodEnd = new Date(
      subscription.current_period_end * 1000
    );
    await user.save();

    res.status(200).json({
      message:
        "Subscription will be canceled at the end of the billing period.",
      subscription,
    });
  } catch (error) {
    console.error("Error canceling subscription:", error.message);
    return next(new AppError("Failed to cancel subscription", 500));
  }
});

// Get Subscription Details
exports.getSubscription = catchAsync(async (req, res, next) => {
  const user = req.user; // Use user from authenticate middleware

  if (!user.subscription?.subscriptionId) {
    return next(new AppError("No subscription found for this user", 404));
  }

  res.status(200).json({ subscription: user.subscription });
});

exports.handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle specific events
  switch (event.type) {
    case "invoice.payment_succeeded": {
      const invoice = event.data.object;

      console.log("Invoice received:", invoice);

      const subscriptionId = invoice.subscription;

      if (!subscriptionId) {
        console.error("No subscription ID found in the invoice.");
        break;
      }

      try {
        // Fetch the subscription details
        const subscriptionDetails = await stripe.subscriptions.retrieve(
          subscriptionId
        );
        console.log("Fetched Subscription Details:", subscriptionDetails);

        const user = await User.findOne({
          "subscription.customerId": subscriptionDetails.customer,
        });

        if (user) {
          const currentPeriodEnd = subscriptionDetails.current_period_end
            ? new Date(subscriptionDetails.current_period_end * 1000)
            : null;

          console.log("Current Period End:", currentPeriodEnd);

          user.subscription.status = subscriptionDetails.status;
          user.subscription.currentPeriodEnd = currentPeriodEnd;
          await user.save();
        } else {
          console.error("No user found for the given customer ID.");
        }
      } catch (err) {
        console.error("Error fetching subscription details:", err.message);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;

      const user = await User.findOne({
        "subscription.customerId": subscription.customer,
      });

      if (user) {
        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null;

        user.subscription.status = subscription.status;
        user.subscription.currentPeriodEnd = currentPeriodEnd;

        if (subscription.cancel_at_period_end) {
          console.log(
            `Subscription for user ${user.email} will cancel at the end of the billing period.`
          );
        }

        await user.save();
      } else {
        console.error("No user found for the given customer ID.");
      }

      break;
    }

    case "customer.subscription.deleted": {
      const canceledSubscription = event.data.object;
      const userToCancel = await User.findOne({
        "subscription.customerId": canceledSubscription.customer,
      });

      if (userToCancel) {
        userToCancel.subscription.status = "canceled";
        userToCancel.subscription.currentPeriodEnd = null; // Clear currentPeriodEnd
        await userToCancel.save();
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
};
