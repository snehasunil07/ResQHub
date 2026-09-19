import webpush from "web-push";

/**
 * Configure Web Push VAPID Details
 */
const configureWebPush = () => {
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@resqhub.org";
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    console.log("[WebPush] VAPID details configured successfully.");
  } else {
    console.warn(
      "[WebPush] WARNING: VAPID keys not configured in environment variables. Web push notifications will be disabled."
    );
  }
};

configureWebPush();

export default webpush;
