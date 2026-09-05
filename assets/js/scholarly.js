(() => {
  "use strict";

  const counters = new Map();
  const numbered = document.querySelectorAll(".scholar-numbered[data-scholar-counter]");

  for (const block of numbered) {
    const counter = block.dataset.scholarCounter;
    const explicit = (block.dataset.scholarNumber || "").trim();
    let resolved = explicit;

    if (!resolved) {
      resolved = String((counters.get(counter) || 0) + 1);
      counters.set(counter, Number(resolved));
    } else if (/^[1-9]\d*$/.test(resolved)) {
      counters.set(counter, Math.max(counters.get(counter) || 0, Number(resolved)));
    }

    block.dataset.scholarResolvedNumber = resolved;
    const slot = block.querySelector("[data-scholar-number-slot]");
    if (slot) {
      slot.textContent = resolved;
      slot.classList.add("is-resolved");
    }
  }

  for (const link of document.querySelectorAll("[data-scholar-xref]")) {
    if (link.dataset.scholarXrefAuto !== "true") continue;
    const target = document.getElementById(link.dataset.scholarXref);
    if (!target) {
      link.classList.add("is-broken");
      continue;
    }

    const label = target.dataset.scholarLabel || "Reference";
    const number = target.dataset.scholarResolvedNumber || "";
    link.textContent = number ? `${label} ${number}` : label;
  }
})();
