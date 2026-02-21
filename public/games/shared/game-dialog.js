(() => {
  function setText(node, value) {
    if (!node || typeof value !== "string") {
      return;
    }
    node.textContent = value;
  }

  function createDialog({
    overlayEl,
    titleEl,
    descriptionEl,
    actionButtonEl,
  }) {
    if (!overlayEl || !actionButtonEl) {
      throw new Error("Game dialog requires overlay and action button elements.");
    }

    let currentAction = null;

    function show({ title, description, actionLabel, onAction }) {
      setText(titleEl, title);
      setText(descriptionEl, description);
      setText(actionButtonEl, actionLabel);
      currentAction = typeof onAction === "function" ? onAction : null;
      overlayEl.classList.remove("hide");
    }

    function hide() {
      currentAction = null;
      overlayEl.classList.add("hide");
    }

    function isVisible() {
      return !overlayEl.classList.contains("hide");
    }

    actionButtonEl.addEventListener("click", (event) => {
      event.preventDefault();
      if (typeof currentAction === "function") {
        currentAction();
      }
    });

    return {
      show,
      hide,
      isVisible,
    };
  }

  window.CipherForgeGameDialog = {
    create: createDialog,
  };
})();
