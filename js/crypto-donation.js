"use strict";

(function () {
  var PAYMENT_DURATION_MS = 15 * 60 * 1000;
  var PAYMENT_STORAGE_KEY = "dubaiCaresCryptoPayment";
  var walletRequest = null;

  var PAYMENT_METHODS = {
    USDT_TON: {
      title: "USDT (TON)",
      symbol: "USDT",
      walletKey: "USDT_TON_ADDRESS",
      icon: "img/crypto-usdt.svg",
      badge: "img/crypto-ton.svg",
    },
    USDT_TRC20: {
      title: "USDT (TRC20)",
      symbol: "USDT",
      walletKey: "USDT_TRC20_ADDRESS",
      icon: "img/crypto-usdt.svg",
      badge: "img/crypto-tron.svg",
    },
    USDT_BEP20: {
      title: "USDT (BEP20)",
      symbol: "USDT",
      walletKey: "USDT_BEP20_ADDRESS",
      icon: "img/crypto-usdt.svg",
      badge: "img/crypto-bnb.svg",
    },
    TON: {
      title: "TON",
      symbol: "TON",
      walletKey: "TON_ADDRESS",
      icon: "img/crypto-ton.svg",
      badge: "",
    },
    BTC: {
      title: "BTC",
      symbol: "BTC",
      walletKey: "BTC_ADDRESS",
      icon: "img/crypto-btc.svg",
      badge: "",
    },
  };

  function scriptBaseUrl() {
    var scripts = document.getElementsByTagName("script");
    var index;
    var src;
    var url;

    for (index = scripts.length - 1; index >= 0; index -= 1) {
      src = scripts[index].getAttribute("src") || "";

      if (/js\/crypto-donation\.js(?:[?#].*)?$/i.test(src)) {
        try {
          url = new URL(src, window.location.href);
          return url.href.replace(/js\/crypto-donation\.js(?:[?#].*)?$/i, "");
        } catch (error) {
          return "/";
        }
      }
    }

    return "/";
  }

  var scriptRoot = scriptBaseUrl();

  function assetUrl(path) {
    return new URL(path.replace(/^\/+/, ""), scriptRoot).href;
  }

  function apiUrl() {
    if (window.location.protocol === "file:") {
      return "";
    }

    return new URL("api/wallets", scriptRoot).href;
  }

  function paymentUrl(payment) {
    var target =
      window.location.protocol === "file:"
        ? new URL("payment.html", scriptRoot)
        : new URL("payment/", scriptRoot);

    target.searchParams.set("currency", payment.currency);
    target.searchParams.set("amount", payment.amount);

    return target.href;
  }

  function loadWallets() {
    var url = apiUrl();

    if (!url || !window.fetch) {
      return Promise.resolve({});
    }

    if (!walletRequest) {
      walletRequest = window
        .fetch(url, { cache: "no-store" })
        .then(function (response) {
          if (!response.ok) {
            return {};
          }

          return response.json();
        })
        .catch(function () {
          return {};
        });
    }

    return walletRequest;
  }

  function walletAddressFor(wallets, key) {
    return String((wallets && wallets[key]) || "").trim();
  }

  function savePayment(payment) {
    try {
      window.sessionStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(payment));
    } catch (error) {
      // The query string still carries the payment method and amount.
    }
  }

  function readPayment() {
    try {
      return JSON.parse(window.sessionStorage.getItem(PAYMENT_STORAGE_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function queryPayment() {
    var params = new URLSearchParams(window.location.search);
    var currency = params.get("currency") || "USDT_TON";
    var amount = params.get("amount") || "";
    var method = PAYMENT_METHODS[currency] || PAYMENT_METHODS.USDT_TON;
    var now = Date.now();

    return {
      id: "dc-" + now,
      currency: PAYMENT_METHODS[currency] ? currency : "USDT_TON",
      amount: amount,
      createdAt: now,
      expiresAt: now + PAYMENT_DURATION_MS,
      walletKey: method.walletKey,
    };
  }

  function selectedMethod(form) {
    var input = form.querySelector('input[name="cryptoCurrency"]:checked');
    var method;

    if (!input) {
      return null;
    }

    method = PAYMENT_METHODS[input.value];

    if (!method) {
      return null;
    }

    return {
      input: input,
      code: input.value,
      data: method,
    };
  }

  function normalizeAmount(value) {
    return String(value || "").trim().replace(",", ".");
  }

  function setOptionsState(form) {
    var options = form.querySelectorAll(".crypto-option");

    Array.prototype.forEach.call(options, function (option) {
      var input = option.querySelector('input[type="radio"]');
      option.classList.toggle("checked", !!input && input.checked);
    });
  }

  function initDonateForm() {
    var form = document.getElementById("cryptoDonationForm");

    if (!form) {
      return;
    }

    form.addEventListener("change", function (event) {
      if (event.target && event.target.name === "cryptoCurrency") {
        setOptionsState(form);
      }
    });

    form.addEventListener("submit", function (event) {
      var method = selectedMethod(form);
      var amountInput = form.querySelector('[name="donationAmount"]');
      var amount = amountInput ? normalizeAmount(amountInput.value) : "";
      var now = Date.now();
      var payment;

      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (!method || !amount || Number(amount) <= 0) {
        if (amountInput) {
          amountInput.focus();
          amountInput.reportValidity();
        }
        return;
      }

      payment = {
        id: "dc-" + now,
        donorName: form.querySelector('[name="donorName"]').value.trim(),
        donorContact: form.querySelector('[name="donorContact"]').value.trim(),
        donationDetails: form.querySelector('[name="donationDetails"]').value.trim(),
        amount: amount,
        currency: method.code,
        title: method.data.title,
        symbol: method.data.symbol,
        walletKey: method.data.walletKey,
        createdAt: now,
        expiresAt: now + PAYMENT_DURATION_MS,
      };

      savePayment(payment);
      window.location.href = paymentUrl(payment);
    });

    setOptionsState(form);
  }

  function setImage(image, src, alt) {
    if (!image) {
      return;
    }

    if (!src) {
      image.setAttribute("src", "");
      image.setAttribute("alt", "");
      return;
    }

    image.setAttribute("src", assetUrl(src));
    image.setAttribute("alt", alt || "");
  }

  function formatTime(milliseconds) {
    var totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;

    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }

  function initPaymentPage() {
    var root = document.getElementById("cryptoPayment");
    var payment = readPayment() || queryPayment();
    var method = PAYMENT_METHODS[payment.currency] || PAYMENT_METHODS.USDT_TON;
    var title = root && root.querySelector("[data-payment-title]");
    var address = root && root.querySelector("[data-payment-address]");
    var amount = root && root.querySelector("[data-payment-amount]");
    var timer = root && root.querySelector("[data-payment-timer]");
    var progress = root && root.querySelector("[data-payment-progress]");
    var status = root && root.querySelector("[data-payment-status]");
    var checkButton = root && root.querySelector("[data-check-payment]");
    var duration = PAYMENT_DURATION_MS;
    var intervalId;

    if (!root) {
      return;
    }

    if (!payment.expiresAt) {
      payment.expiresAt = Date.now() + duration;
    }

    setImage(root.querySelector("[data-payment-icon]"), method.icon, method.title);
    setImage(root.querySelector("[data-payment-badge]"), method.badge, method.title);

    title.textContent = method.title;
    amount.textContent = payment.amount ? payment.amount + " " + method.symbol : "";

    loadWallets().then(function (wallets) {
      address.textContent = walletAddressFor(wallets, payment.walletKey || method.walletKey);
    });

    function renderTimer() {
      var remaining = Math.max(0, payment.expiresAt - Date.now());
      var percent = Math.max(0, Math.min(100, (remaining / duration) * 100));

      timer.textContent = formatTime(remaining);
      progress.style.width = percent + "%";

      if (remaining <= 0) {
        root.classList.add("is-expired");
        status.textContent = "Payment expired";
        checkButton.disabled = true;
        window.clearInterval(intervalId);
      } else {
        root.classList.remove("is-expired");
        status.textContent = "Awaiting payment";
        checkButton.disabled = false;
      }
    }

    checkButton.addEventListener("click", function (event) {
      event.preventDefault();
    });

    renderTimer();
    intervalId = window.setInterval(renderTimer, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initDonateForm();
      initPaymentPage();
    });
  } else {
    initDonateForm();
    initPaymentPage();
  }
})();
