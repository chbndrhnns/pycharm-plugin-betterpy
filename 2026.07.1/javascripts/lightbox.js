(function () {
  "use strict";

  var installed = false;
  var lightbox = null;
  var mediaSlot = null;
  var captionSlot = null;
  var closeButton = null;
  var previousFocus = null;
  var videoPattern = /\.(mp4|webm|ogg|mov)(?:[?#].*)?$/i;

  function createLightbox() {
    if (lightbox) {
      return lightbox;
    }

    lightbox = document.createElement("div");
    lightbox.className = "bp-lightbox";
    lightbox.hidden = true;
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Feature recording preview");
    lightbox.innerHTML = [
      '<button class="bp-lightbox__backdrop" type="button" aria-label="Close preview"></button>',
      '<div class="bp-lightbox__dialog" role="document">',
      '  <button class="bp-lightbox__close" type="button" aria-label="Close preview">&times;</button>',
      '  <div class="bp-lightbox__media"></div>',
      '  <div class="bp-lightbox__caption"></div>',
      '</div>',
    ].join("");

    document.body.appendChild(lightbox);
    mediaSlot = lightbox.querySelector(".bp-lightbox__media");
    captionSlot = lightbox.querySelector(".bp-lightbox__caption");
    closeButton = lightbox.querySelector(".bp-lightbox__close");

    lightbox.querySelector(".bp-lightbox__backdrop").addEventListener("click", closeLightbox);
    closeButton.addEventListener("click", closeLightbox);
    return lightbox;
  }

  function clearMedia() {
    if (mediaSlot) {
      mediaSlot.textContent = "";
    }
    if (captionSlot) {
      captionSlot.textContent = "";
    }
  }

  function buildMedia(src, alt) {
    if (videoPattern.test(src)) {
      var video = document.createElement("video");
      video.src = src;
      video.controls = true;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      return video;
    }

    var image = document.createElement("img");
    image.src = src;
    image.alt = alt || "";
    image.decoding = "async";
    return image;
  }

  function openLightbox(trigger) {
    var src = trigger.getAttribute("data-bp-lightbox-src") || trigger.getAttribute("href");
    if (!src) {
      return;
    }

    var image = trigger.querySelector("img");
    var alt = trigger.getAttribute("data-bp-lightbox-alt") || (image && image.alt) || "";
    var figure = trigger.closest("figure");
    var caption = trigger.getAttribute("data-bp-lightbox-caption") || "";
    if (!caption && figure) {
      var figcaption = figure.querySelector("figcaption");
      caption = figcaption ? figcaption.textContent : "";
    }

    createLightbox();
    clearMedia();
    mediaSlot.appendChild(buildMedia(src, alt));
    captionSlot.textContent = caption;
    captionSlot.hidden = !caption;

    previousFocus = document.activeElement;
    lightbox.hidden = false;
    document.documentElement.classList.add("bp-lightbox-open");
    closeButton.focus();
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) {
      return;
    }

    lightbox.hidden = true;
    document.documentElement.classList.remove("bp-lightbox-open");
    clearMedia();

    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }
    previousFocus = null;
  }

  function onClick(event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") {
      return;
    }

    var trigger = target.closest("[data-bp-lightbox]");
    if (!trigger) {
      return;
    }

    event.preventDefault();
    openLightbox(trigger);
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      closeLightbox();
    }
  }

  function install() {
    if (installed) {
      return;
    }
    installed = true;
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeydown);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
