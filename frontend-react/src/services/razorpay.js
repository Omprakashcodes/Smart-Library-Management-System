export const loadRazorpay = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const scriptUrl =
      'https://checkout.razorpay.com/v1/checkout.js';

    const existingScript =
      document.querySelector(
        `script[src="${scriptUrl}"]`
      );

    if (existingScript) {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      existingScript.addEventListener(
        'load',
        () => resolve(Boolean(window.Razorpay)),
        { once: true }
      );

      existingScript.addEventListener(
        'error',
        () => resolve(false),
        { once: true }
      );

      return;
    }

    const script =
      document.createElement('script');

    script.src = scriptUrl;
    script.async = true;

    script.onload = () =>
      resolve(Boolean(window.Razorpay));

    script.onerror = () =>
      resolve(false);

    document.body.appendChild(script);
  });
};