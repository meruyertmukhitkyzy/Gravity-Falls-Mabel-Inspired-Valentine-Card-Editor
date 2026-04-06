(() => {
  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;

  const ART_BOUNDS = {
    width: 1920,
    height: 1080,
  };

  const TAG_BOUNDS = {
    x: 900,
    y: 885,
    width: 200,
    height: 130,
    rotation: 58,
  };

  const MAIN_FONT = "CardMain";
  const TAG_FONT = "CardTag";

  const DEFAULTS = [
  {
    id: "line-1",
    type: "main",
    text: "For MY",
    x: 960,
    y: 320,
    width: 600,
    fontSize: 180,
    rotation: 0,
    bend: 120,
    letterSpacing: 0,
    z: 1,
  },
  {
    id: "line-2",
    type: "main",
    text: "Favourite",
    x: 960,
    y: 460,
    width: 800,
    fontSize: 180,
    rotation: 0,
    bend: 120,
    letterSpacing: 0,
    z: 2,
  },
  {
    id: "line-3",
    type: "main",
    text: "Brother",
    x: 1000,
    y: 600,
    width: 600,
    fontSize: 180,
    rotation: 0,
    bend: 120,
    letterSpacing: 0,
    z: 3,
  },
  {
    id: "tag",
    type: "tag",
    text: "Mabel",
    x: TAG_BOUNDS.x,
    y: TAG_BOUNDS.y,
    width: TAG_BOUNDS.width,
    height: TAG_BOUNDS.height,
    fontSize: 30,
    lineHeight: 1.05,
    letterSpacing: 0,
    rotation: TAG_BOUNDS.rotation,
    bend: 0,
    z: 10,
    anchorOffsetX: 0,
    anchorOffsetY: 0,
  },
];

  const state = {
    items: [],
    selectedId: null,
    nextId: 4,
    dragging: null,
    editingId: null,
    lastClick: {
      id: null,
      time: 0,
    },
  };

  const dom = {
    stage: document.getElementById("editorStage"),
    viewport: document.getElementById("editorViewport"),
    artboard: document.getElementById("artboard"),
    objectsLayer: document.getElementById("objectsLayer"),
    scene: document.getElementById("cardScene"),
    sceneDefs: document.getElementById("sceneDefs"),
    artworkLayer: document.getElementById("artworkLayer"),
    contentLayer: document.getElementById("contentLayer"),

    sidebarAddTextBtn: document.getElementById("sidebarAddTextBtn"),
    sidebarResetBtn: document.getElementById("sidebarResetBtn"),

    exportPngBtn: document.getElementById("exportPngBtn"),
    exportPdfBtn: document.getElementById("exportPdfBtn"),

    helpBtn: document.getElementById("helpBtn"),
    helpPanel: document.getElementById("helpPanel"),
    closeHelpBtn: document.getElementById("closeHelpBtn"),

    toolbar: document.getElementById("selectionToolbar"),
    toolbarTitle: document.getElementById("toolbarTitle"),
    closeToolbarBtn: document.getElementById("closeToolbarBtn"),
    toolbarFontSize: document.getElementById("toolbarFontSize"),
    toolbarFontSizeValue: document.getElementById("toolbarFontSizeValue"),
    toolbarBend: document.getElementById("toolbarBend"),
    toolbarBendValue: document.getElementById("toolbarBendValue"),
    toolbarMainActions: document.getElementById("toolbarMainActions"),
    toolbarBendField: document.getElementById("toolbarBendField"),
    toolbarLayerField: document.getElementById("toolbarLayerField"),
    duplicateBtn: document.getElementById("duplicateBtn"),
    deleteBtn: document.getElementById("deleteBtn"),
    toolbarLetterSpacing: document.getElementById("toolbarLetterSpacing"),
    toolbarLetterSpacingValue: document.getElementById("toolbarLetterSpacingValue"),
    toolbarLetterSpacingField: document.getElementById("toolbarLetterSpacingField"),

    bringForwardBtn: document.getElementById("bringForwardBtn"),
    sendBackwardBtn: document.getElementById("sendBackwardBtn"),
    bringToFrontBtn: document.getElementById("bringToFrontBtn"),
    sendToBackBtn: document.getElementById("sendToBackBtn"),

    miniToolbar: document.getElementById("miniObjectToolbar"),
    miniLockBtn: document.getElementById("miniLockBtn"),
    miniCopyBtn: document.getElementById("miniCopyBtn"),
    miniDeleteBtn: document.getElementById("miniDeleteBtn"),

    toolbarTagLetterSpacing: document.getElementById("toolbarTagLetterSpacing"),
    toolbarTagLetterSpacingValue: document.getElementById("toolbarTagLetterSpacingValue"),
    toolbarTagLetterSpacingField: document.getElementById("toolbarTagLetterSpacingField"),

    toolbarTagLineHeight: document.getElementById("toolbarTagLineHeight"),
    toolbarTagLineHeightValue: document.getElementById("toolbarTagLineHeightValue"),
    toolbarTagLineHeightField: document.getElementById("toolbarTagLineHeightField"),
  };

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function resetToClassic(shouldRender = true) {
    state.items = deepClone(DEFAULTS);
    state.selectedId = null;
    state.editingId = null;
    state.nextId = 4;
    state.lastClick.id = null;
    state.lastClick.time = 0;

    if (shouldRender) {
      render();
    }
  }

  function getScale() {
    const rect = dom.artboard.getBoundingClientRect();
    return rect.width / ART_BOUNDS.width;
  }

  function syncOverlayScale() {
  if (!dom.objectsLayer || !dom.artboard) return;

  const rect = dom.artboard.getBoundingClientRect();
  const scaleX = rect.width / DESIGN_WIDTH;
  const scaleY = rect.height / DESIGN_HEIGHT;

  dom.objectsLayer.style.transform = `scale(${scaleX}, ${scaleY})`;
}

  function getLocalPoint(evt) {
    const rect = dom.artboard.getBoundingClientRect();
    const scale = rect.width / ART_BOUNDS.width;
    return {
      x: (evt.clientX - rect.left) / scale,
      y: (evt.clientY - rect.top) / scale,
    };
  }

  function bringToFront(item) {
    const maxZ = Math.max(...state.items.map((it) => it.z || 0), 0);
    item.z = maxZ + 1;
  }

  function sendToBack(item) {
  const minZ = Math.min(...state.items.map((it) => it.z || 0), 0);
  item.z = minZ - 1;
  }

  function bringForward(item) {
    item.z = (item.z || 0) + 1;
  }

  function sendBackward(item) {
    item.z = (item.z || 0) - 1;
  }

  function getSelectedItem() {
    return state.items.find((item) => item.id === state.selectedId) || null;
  }

  function getEditingItem() {
    return state.items.find((item) => item.id === state.editingId) || null;
  }

  function getInlineEditorById(id) {
    return dom.objectsLayer.querySelector(`.inline-editor[data-id="${id}"]`);
  }

  function placeCaretAtEnd(el) {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function lockTagToArtwork(item) {
    if (item.type !== "tag") return;
    item.x = TAG_BOUNDS.x;
    item.y = TAG_BOUNDS.y;
    item.width = TAG_BOUNDS.width;
    item.height = TAG_BOUNDS.height;
    item.rotation = TAG_BOUNDS.rotation;
  }


  function readEditableText(el) {
    if (!el) return "";
    return String(el.innerText || el.textContent || "")
      .replace(/\r/g, "")
      .replace(/\u00A0/g, " ");
  }

  function normalizeEditableText(value) {
  const cleaned = String(value)
    .replace(/\r/g, "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "Type here";
  }

  function syncEditingTextFromDom() {
    const item = getEditingItem();
    if (!item) return;

    const editor = getInlineEditorById(item.id);
    if (!editor) return;

    if (item.type === "tag") {
      item.text = readEditableText(editor).replace(/\r/g, "");
    } else {
      item.text = normalizeEditableText(readEditableText(editor));
    }
  }

  function selectItem(id) {
    if (state.editingId && state.editingId !== id) {
      stopInlineEditing(true);
    }

    state.selectedId = id;
    render();
  }

  function deselect() {
    if (state.editingId) {
      stopInlineEditing(true);
      return;
    }

    state.selectedId = null;
    render();
  }

  function startInlineEditing(id) {
    const item = state.items.find((it) => it.id === id);
    if (!item) return;

    state.selectedId = id;
    state.editingId = id;
    render();

    requestAnimationFrame(() => {
      const editor = getInlineEditorById(id);
      if (!editor) return;
      editor.focus();
      placeCaretAtEnd(editor);
    });
  }

  function stopInlineEditing(save = true) {
    const item = getEditingItem();

    if (item && save) {
      const editor = getInlineEditorById(item.id);
      if (editor) {
        if (item.type === "tag") {
          item.text = readEditableText(editor).replace(/\r/g, "").trimEnd();
        } else {
          item.text = normalizeEditableText(readEditableText(editor));
        }
      }
    }

    state.editingId = null;
    render();
  }

  function createMainTextItem() {
    const id = `line-${state.nextId++}`;
    return {
      id,
      type: "main",
      text: "Type here",
      x: 300,
      y: 300,
      width: 220,
      fontSize: 40,
      rotation: 0,
      bend: 0,
      letterSpacing: 0,
      z: Math.max(...state.items.map((it) => it.z || 0), 0) + 1,
      locked: false,
    };
  }

function toggleLockSelected() {
  const item = getSelectedItem();
  if (!item || item.type !== "main") return;

  if (state.editingId === item.id) {
    stopInlineEditing(true);
  }

  item.locked = !item.locked;
  render();
}

  function addText() {
    if (state.editingId) {
      stopInlineEditing(true);
    }

    const item = createMainTextItem();
    state.items.push(item);
    state.selectedId = item.id;
    render();

    requestAnimationFrame(() => {
      startInlineEditing(item.id);
    });
  }

  function duplicateSelected() {
    if (state.editingId) {
      syncEditingTextFromDom();
      stopInlineEditing(true);
    }

    const item = getSelectedItem();
    if (!item || item.type !== "main") return;

    const copy = {
      ...deepClone(item),
      id: `line-${state.nextId++}`,
      x: item.x + 48,
      y: item.y + 48,
      z: Math.max(...state.items.map((it) => it.z || 0), 0) + 1,
    };

    state.items.push(copy);
    state.selectedId = copy.id;
    render();
  }

  function deleteSelected() {
    if (state.editingId) {
      stopInlineEditing(true);
    }

    const item = getSelectedItem();
    if (!item || item.type !== "main") return;

    state.items = state.items.filter((it) => it.id !== item.id);
    state.selectedId = null;
    state.editingId = null;
    render();
  }

  function bringSelectedForward() {
  const item = getSelectedItem();
  if (!item || item.type !== "main") return;
  bringForward(item);
  render();
}

function sendSelectedBackward() {
  const item = getSelectedItem();
  if (!item || item.type !== "main") return;
  sendBackward(item);
  render();
}

function bringSelectedToFront() {
  const item = getSelectedItem();
  if (!item || item.type !== "main") return;
  bringToFront(item);
  render();
}

function sendSelectedToBack() {
  const item = getSelectedItem();
  if (!item || item.type !== "main") return;
  sendToBack(item);
  render();
}

 function setToolbarVisibility(item) {
  if (!item) {
    dom.toolbar.classList.add("hidden");
    return;
  }

  const isMain = item.type === "main";
  const isTag = item.type === "tag";
  const isLocked = !!item.locked;

  dom.toolbar.classList.remove("hidden");
  dom.toolbarTitle.textContent = isTag ? "Edit tag" : (isLocked ? "Text locked" : "Edit text");

  dom.toolbarFontSize.disabled = isLocked && !isTag;

  if (isTag) {
    dom.toolbarFontSize.min = 8;
    dom.toolbarFontSize.max = 80;
  } else {
    dom.toolbarFontSize.min = 30;
    dom.toolbarFontSize.max = 260;
  }

  dom.toolbarFontSize.value = item.fontSize;
  dom.toolbarFontSizeValue.textContent = Math.round(item.fontSize);

  dom.toolbarBend.disabled = isLocked || !isMain;
  dom.toolbarBend.value = item.bend || 0;
  dom.toolbarBendValue.textContent = Math.round(item.bend || 0);

  dom.toolbarMainActions.classList.toggle("hidden", !isMain);
  dom.toolbarBendField.classList.toggle("hidden", !isMain);
  dom.toolbarLetterSpacingField.classList.toggle("hidden", !isMain);
  dom.toolbarLayerField.classList.toggle("hidden", !isMain);
  dom.toolbarTagLetterSpacingField.classList.toggle("hidden", !isTag);
  dom.toolbarTagLineHeightField.classList.toggle("hidden", !isTag);

  if (isMain) {
    dom.toolbarLetterSpacing.value = item.letterSpacing || 0;
    dom.toolbarLetterSpacingValue.textContent = Math.round(item.letterSpacing || 0);
  }

  if (isTag) {
    dom.toolbarTagLetterSpacing.value = item.letterSpacing || 0;
    dom.toolbarTagLetterSpacingValue.textContent = Math.round(item.letterSpacing || 0);

    dom.toolbarTagLineHeight.value = item.lineHeight || 1.05;
    dom.toolbarTagLineHeightValue.textContent = Number(item.lineHeight || 1.05).toFixed(2);
  }
}

  function wrapText(text, maxWidth, fontSize, family) {
    const paragraphs = (text || "").split("\n");
    const lines = [];
    const safeWidth = Math.max(80, maxWidth - 24);

    measureCtx.font = `${fontSize}px ${family}, Arial`;

    for (const paragraph of paragraphs) {
      const raw = paragraph.trim();
      if (!raw) {
        lines.push("");
        continue;
      }

      const words = raw.split(/\s+/);
      let current = "";

      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        const width = measureCtx.measureText(test).width;

        if (width <= safeWidth || !current) {
          current = test;
        } else {
          lines.push(current);
          current = word;
        }
      }

      if (current) lines.push(current);
    }

    return lines.length ? lines : [""];
  }

  function getItemLayout(item) {
  if (item.type === "tag") {
    const rawText = item.text || "";
    const lines = rawText ? rawText.split("\n") : ["?"];

    return {
      width: item.width || 93,
      height: item.height || 65,
      lines,
    };
  }

  const singleLine = normalizeEditableText(item.text);
  const topPad = item.fontSize * 0.78 + Math.max(0, item.bend * 0.55);
  const bottomPad = item.fontSize * 0.72 + Math.max(0, -item.bend * 0.55);
  const height = topPad + bottomPad;

  const lineBoxes = [
    {
      line: singleLine,
      height,
      index: 0,
    },
  ];

  return {
    width: item.width,
    height,
    lines: [singleLine],
    lineBoxes,
  };
}

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

function renderTagContent(item) {
  const text = (item.text || "").trim();

  return `
    <div
      class="tag-content"
      style="
        font-size:${item.fontSize}px;
        line-height:${item.lineHeight || 1.05};
        letter-spacing:${item.letterSpacing || 0}px;
      "
    >
      ${text ? escapeHtml(text) : ""}
    </div>
  `;
}

  function renderMainContent(item, layout) {
    let html = `<div class="text-render">`;
    layout.lineBoxes.forEach((box, index) => {
      html += buildCurvedSvgLine(
        box.line,
        item.width,
        item.fontSize,
        item.bend,
        item.letterSpacing || 0,
        item.id,
        index
      );
    });
    html += `</div>`;
    return html;
  }

function renderScene() {
  if (!dom.contentLayer) return;

  const ordered = [...state.items].sort((a, b) => (a.z || 0) - (b.z || 0));

  dom.contentLayer.innerHTML = ordered
    .map((item) => {
      const isEditing = item.id === state.editingId;

      // Hide the item in the SVG scene while it is being edited,
      // because the inline editor already draws it on top.
      if (isEditing) return "";

      if (item.type === "main") return buildMainSceneMarkup(item);
      if (item.type === "tag") return buildTagSceneMarkup(item);
      return "";
    })
    .join("");
}

  function renderInlineEditor(item, layout) {
    return `
      <div
        class="inline-editor"
        data-id="${item.id}"
        contenteditable="true"
        spellcheck="false"
        data-action="edit"
        style="
          width: 100%;
          min-height: ${Math.max(layout.height, item.fontSize * 1.4)}px;
          padding: 4px 6px;
          border-radius: 12px;
          background: transparent;
          outline: none;
          white-space: nowrap;
          overflow: hidden;
          word-break: normal;
          text-align: center;
          line-height: 1.08;
          font-family: '${MAIN_FONT}', Arial, sans-serif;
          font-size: ${item.fontSize}px;
          letter-spacing: ${item.letterSpacing || 0}px;
          color: #35e0b3;
          -webkit-text-stroke: 3px #000;
          text-shadow: none;
          caret-color: #000;
          cursor: text;
        "
      >${escapeHtml(item.text)}</div>
    `;
  }

function renderInlineTagEditor(item, layout) {
  return `
    <div
      class="inline-editor inline-tag-editor"
      data-id="${item.id}"
      contenteditable="true"
      spellcheck="false"
      data-action="edit"
      style="
        width: 100%;
        min-height: ${layout.height}px;
        height: 100%;
        padding: 8px 10px;
        border-radius: 10px;
        background: transparent;
        outline: none;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: anywhere;
        text-align: center;
        line-height: ${item.lineHeight || 1.05};
        letter-spacing: ${item.letterSpacing || 0}px;
        font-family: '${TAG_FONT}', Arial, sans-serif;
        font-size: ${item.fontSize}px;
        color: #7c4765;
        caret-color: #7c4765;
        cursor: text;
      "
    >${escapeHtml(item.text || "")}</div>
  `;
}

  function bindInlineEditorEvents(object, item) {
    const inlineEditor = object.querySelector(".inline-editor");
    if (!inlineEditor) return;

    inlineEditor.addEventListener("pointerdown", (evt) => {
      evt.stopPropagation();
    });

    inlineEditor.addEventListener("click", (evt) => {
      evt.stopPropagation();
    });

    inlineEditor.addEventListener("input", () => {
      const current = state.items.find((it) => it.id === item.id);
      if (!current) return;

      const raw = readEditableText(inlineEditor);

      if (current.type === "tag") {
        current.text = raw.replace(/\r/g, "");
      } else {
        current.text = normalizeEditableText(raw);
      }
    });

    inlineEditor.addEventListener("keydown", (evt) => {
      if (evt.key === "Escape") {
        evt.preventDefault();
        stopInlineEditing(true);
        return;
      }

      if (item.type === "main" && evt.key === "Enter") {
        evt.preventDefault();
      }
    });

    inlineEditor.addEventListener("blur", () => {
      if (state.editingId === item.id) {
        stopInlineEditing(true);
      }
    });
  }

  function renderObjects() {
    dom.objectsLayer.innerHTML = "";

    const ordered = [...state.items].sort((a, b) => (a.z || 0) - (b.z || 0));

    for (const item of ordered) {
      const selected = item.id === state.selectedId;
      const editing = item.id === state.editingId;
      const layout = getItemLayout(item);

      const object = document.createElement("div");
      object.className = `canvas-object ${item.type}-object ${selected ? "selected" : ""} ${editing ? "editing" : ""} ${item.locked ? "locked" : ""}`;
      object.dataset.id = item.id;
      object.style.zIndex = item.z || 1;
      object.style.width = `${layout.width}px`;

      const offsetX = item.anchorOffsetX || 0;
      const offsetY = item.anchorOffsetY || 0;

      object.style.transform = `translate(${item.x + offsetX}px, ${item.y + offsetY}px) translate(-50%, -50%) rotate(${item.rotation}deg)`;

      if (item.type === "main") {
        const rotateHandleReach = 34 + 18; // handle offset + handle size
        const objectHalfWidth = layout.width / 2;
        const nearRightEdge = item.x + offsetX + objectHalfWidth + rotateHandleReach > DESIGN_WIDTH - 12;

        object.classList.toggle("rotate-handle-left", nearRightEdge);
      }

      const frame = document.createElement("div");
      frame.className = "object-frame";
      frame.style.width = `${layout.width}px`;
      frame.style.height = `${layout.height}px`;

      const box = document.createElement("div");
      box.className = "object-box";
      box.dataset.action = editing ? "edit" : "move";
      box.style.width = `${layout.width}px`;
      box.style.height = `${layout.height}px`;

      if (editing) {
        if (item.type === "main") {
          box.innerHTML = renderInlineEditor(item, layout);
        } else {
          box.innerHTML = renderInlineTagEditor(item, layout);
        }
      } else {
        box.innerHTML = "";
      }

      const leftHandle = document.createElement("div");
      leftHandle.className = "handle resize-left";
      leftHandle.dataset.action = "resize-left";

      const rightHandle = document.createElement("div");
      rightHandle.className = "handle resize-right";
      rightHandle.dataset.action = "resize-right";

      const scaleHandle = document.createElement("div");
      scaleHandle.className = "handle scale";
      scaleHandle.dataset.action = "scale";

      const rotateHandle = document.createElement("div");
      rotateHandle.className = "handle rotate";
      rotateHandle.dataset.action = "rotate";

      frame.appendChild(box);

      if (item.type === "main") {
        frame.appendChild(leftHandle);
        frame.appendChild(rightHandle);
        frame.appendChild(scaleHandle);
        frame.appendChild(rotateHandle);
      }

      object.appendChild(frame);
      dom.objectsLayer.appendChild(object);

      object.addEventListener("pointerdown", onObjectPointerDown);

      if (editing) {
        bindInlineEditorEvents(object, item);
      }
    }
  }

  function onObjectPointerDown(evt) {
  evt.stopPropagation();

  const objectEl = evt.currentTarget;
  const itemId = objectEl.dataset.id;
  const item = state.items.find((it) => it.id === itemId);
  if (!item) return;

  const action = evt.target.dataset.action || "move";
  const now = Date.now();
  const isDoubleClick =
    state.lastClick.id === itemId &&
    now - state.lastClick.time < 320 &&
    action !== "scale";

  state.lastClick.id = itemId;
  state.lastClick.time = now;

  if (state.editingId === itemId) {
    return;
  }

  if (state.editingId && state.editingId !== itemId) {
    stopInlineEditing(true);
  }

  selectItem(itemId);

  if (item.type === "tag") {
    if (isDoubleClick) {
      startInlineEditing(itemId);
      return;
    }

    if (action !== "scale") {
      return;
    }

    const startPoint = getLocalPoint(evt);
    const startItem = deepClone(item);
    const layout = getItemLayout(item);

    state.dragging = {
      action,
      itemId,
      startPoint,
      startItem,
      stageScale: getScale(),
      startAngle: Math.atan2(startPoint.y - startItem.y, startPoint.x - startItem.x),
      layout,
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    return;
  }

  if (item.locked) {
    return;
  }

  if (isDoubleClick) {
    startInlineEditing(itemId);
    return;
  }

  if (action === "edit") return;

  const startPoint = getLocalPoint(evt);
  const startItem = deepClone(item);
  const stageScale = getScale();
  const layout = getItemLayout(item);

  state.dragging = {
    action,
    itemId,
    startPoint,
    startItem,
    stageScale,
    startAngle: Math.atan2(startPoint.y - startItem.y, startPoint.x - startItem.x),
    layout,
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp, { once: true });
}

  function rotateVector(dx, dy, angleDeg) {
    const angle = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return {
      localX: dx * cos + dy * sin,
      localY: -dx * sin + dy * cos,
    };
  }

function onPointerMove(evt) {
  const drag = state.dragging;
  if (!drag) return;

  const item = state.items.find((it) => it.id === drag.itemId);
  if (!item) return;

  const point = getLocalPoint(evt);
  const dx = point.x - drag.startPoint.x;
  const dy = point.y - drag.startPoint.y;
  const projected = rotateVector(dx, dy, drag.startItem.rotation);

  if (drag.action === "move") {
    if (item.type === "tag") {
      return;
    }

    item.x = drag.startItem.x + dx;
    item.y = drag.startItem.y + dy;
  }

  if (drag.action === "resize-right") {
    if (item.type === "tag") return;

    item.width = clamp(drag.startItem.width + projected.localX * 2, 160, 1100);
  }

  if (drag.action === "resize-left") {
    if (item.type === "tag") return;

    const nextWidth = clamp(drag.startItem.width - projected.localX * 2, 160, 1100);
    const deltaWidth = nextWidth - drag.startItem.width;
    const angle = (drag.startItem.rotation * Math.PI) / 180;

    item.width = nextWidth;
    item.x = drag.startItem.x - Math.cos(angle) * (deltaWidth / 2);
    item.y = drag.startItem.y - Math.sin(angle) * (deltaWidth / 2);
  }

    if (drag.action === "scale") {
      const sizeDelta = (projected.localX - projected.localY) * 0.22;
      item.fontSize = clamp(drag.startItem.fontSize + sizeDelta, 20, 200);
    }

  if (drag.action === "rotate") {
    if (item.type === "tag") return;

    const currentAngle = Math.atan2(
      point.y - drag.startItem.y,
      point.x - drag.startItem.x
    );
    const deltaAngle = ((currentAngle - drag.startAngle) * 180) / Math.PI;
    item.rotation = snapAngle(drag.startItem.rotation + deltaAngle);
  }

  render();
}

  function snapAngle(angle) {
    const snaps = [-90, -75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75, 90];
    for (const snap of snaps) {
      if (Math.abs(angle - snap) < 4) return snap;
    }
    return angle;
  }

  function onPointerUp() {
    state.dragging = null;
    window.removeEventListener("pointermove", onPointerMove);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clampItemInsideStageByDom(item) {
    if (item.type === "tag") return false;

    const objectEl = dom.objectsLayer.querySelector(`.canvas-object[data-id="${item.id}"]`);
    if (!objectEl) return false;

    const stageRect = dom.stage.getBoundingClientRect();
    const objectRect = objectEl.getBoundingClientRect();
    const scale = getScale();

    let changed = false;

    if (objectRect.left < stageRect.left) {
      item.x += (stageRect.left - objectRect.left) / scale;
      changed = true;
    }

    if (objectRect.right > stageRect.right) {
      item.x -= (objectRect.right - stageRect.right) / scale;
      changed = true;
    }

    if (objectRect.top < stageRect.top) {
      item.y += (stageRect.top - objectRect.top) / scale;
      changed = true;
    }

    if (objectRect.bottom > stageRect.bottom) {
      item.y -= (objectRect.bottom - stageRect.bottom) / scale;
      changed = true;
    }

    return changed;
  }

  function renderToolbar() {
    const item = getSelectedItem();
    setToolbarVisibility(item);
  }

  function renderMiniToolbar() {
  const item = getSelectedItem();

  if (!item || !dom.miniToolbar) {
    dom.miniToolbar.classList.add("hidden");
    dom.miniToolbar.setAttribute("aria-hidden", "true");
    return;
  }

  const objectEl = dom.objectsLayer.querySelector(`.canvas-object[data-id="${item.id}"]`);
  if (!objectEl) {
    dom.miniToolbar.classList.add("hidden");
    dom.miniToolbar.setAttribute("aria-hidden", "true");
    return;
  }

  const isLocked = !!item.locked;
  const isMain = item.type === "main";
  const isTag = item.type === "tag";

  const showLock = isMain;
  const showCopy = isMain && !isLocked;
  const showDelete = isMain && !isLocked;

  dom.miniLockBtn.classList.toggle("hidden", !showLock);
  dom.miniLockBtn.classList.toggle("is-active", isLocked);
  dom.miniLockBtn.setAttribute("aria-label", isLocked ? "Unlock" : "Lock");
  dom.miniLockBtn.title = isLocked ? "Unlock" : "Lock";

  dom.miniCopyBtn.classList.toggle("hidden", !showCopy);
  dom.miniDeleteBtn.classList.toggle("hidden", !showDelete);

  if (!showLock && !showCopy && !showDelete) {
    dom.miniToolbar.classList.add("hidden");
    dom.miniToolbar.setAttribute("aria-hidden", "true");
    return;
  }

  const stageRect = dom.stage.getBoundingClientRect();
  const objectRect = objectEl.getBoundingClientRect();

  const centerX = objectRect.left - stageRect.left + objectRect.width / 2;
  let topY = objectRect.top - stageRect.top - 12;

  const toolbarHeight = 48;
  if (topY < toolbarHeight) {
    topY = objectRect.bottom - stageRect.top + 12;
    dom.miniToolbar.style.transform = "translate(-50%, 0)";
  } else {
    dom.miniToolbar.style.transform = "translate(-50%, -100%)";
  }

  const minX = 70;
  const maxX = stageRect.width - 70;
  const clampedX = clamp(centerX, minX, maxX);

  dom.miniToolbar.style.left = `${clampedX}px`;
  dom.miniToolbar.style.top = `${topY}px`;
  dom.miniToolbar.classList.remove("hidden");
  dom.miniToolbar.setAttribute("aria-hidden", "false");
}

  function render() {
    const tag = state.items.find((it) => it.type === "tag");
    if (tag) {
      lockTagToArtwork(tag);
    }
    syncOverlayScale();
    renderScene();
    renderObjects();
    renderToolbar();
    renderMiniToolbar();
  }
  function openHelp() {
    if (!dom.helpPanel || !dom.helpBtn) return;
    dom.helpPanel.classList.remove("hidden");
    dom.helpBtn.setAttribute("aria-expanded", "true");
  }

  function closeHelp() {
    if (!dom.helpPanel || !dom.helpBtn) return;
    dom.helpPanel.classList.add("hidden");
    dom.helpBtn.setAttribute("aria-expanded", "false");
  }

  function toggleHelp() {
    if (!dom.helpPanel) return;
    const isHidden = dom.helpPanel.classList.contains("hidden");
    if (isHidden) {
      openHelp();
    } else {
      closeHelp();
    }
  }

  function bindHelp() {
    if (dom.helpBtn) {
      dom.helpBtn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        toggleHelp();
      });
    }

    if (dom.closeHelpBtn) {
      dom.closeHelpBtn.addEventListener("click", () => {
        closeHelp();
      });
    }

    if (dom.helpPanel) {
      dom.helpPanel.addEventListener("click", (evt) => {
        evt.stopPropagation();
      });
    }

    document.addEventListener("click", () => {
      closeHelp();
    });

    window.addEventListener("keydown", (evt) => {
      if (evt.key === "Escape") {
        closeHelp();
      }
    });
  }

  function bindToolbar() {
    dom.toolbarFontSize.addEventListener("input", () => {
      const item = getSelectedItem();
      if (!item) return;

      if (state.editingId === item.id) {
        syncEditingTextFromDom();
      }

      const min = item.type === "tag" ? 8 : 30;
      const max = item.type === "tag" ? 80 : 260;

      item.fontSize = clamp(Number(dom.toolbarFontSize.value), min, max);
      render();
    });

    dom.toolbarBend.addEventListener("input", () => {
      const item = getSelectedItem();
      if (!item || item.type !== "main") return;

      if (state.editingId === item.id) {
        syncEditingTextFromDom();
      }

      item.bend = clamp(Number(dom.toolbarBend.value), -200, 200);
      render();
    });

    dom.toolbarLetterSpacing.addEventListener("input", () => {
      const item = getSelectedItem();
      if (!item || item.type !== "main") return;

      if (state.editingId === item.id) {
        syncEditingTextFromDom();
      }

      item.letterSpacing = Number(dom.toolbarLetterSpacing.value);
      dom.toolbarLetterSpacingValue.textContent = Math.round(item.letterSpacing);
      render();
    });

    dom.toolbarTagLetterSpacing.addEventListener("input", () => {
      const item = getSelectedItem();
      if (!item || item.type !== "tag") return;

      if (state.editingId === item.id) {
        syncEditingTextFromDom();
      }

      item.letterSpacing = Number(dom.toolbarTagLetterSpacing.value);
      dom.toolbarTagLetterSpacingValue.textContent = Math.round(item.letterSpacing);
      render();
    });

    dom.toolbarTagLineHeight.addEventListener("input", () => {
      const item = getSelectedItem();
      if (!item || item.type !== "tag") return;

      if (state.editingId === item.id) {
        syncEditingTextFromDom();
      }

      item.lineHeight = Number(dom.toolbarTagLineHeight.value);
      dom.toolbarTagLineHeightValue.textContent = item.lineHeight.toFixed(2);
      render();
    });

    dom.duplicateBtn.addEventListener("click", duplicateSelected);
    dom.deleteBtn.addEventListener("click", deleteSelected);
    dom.closeToolbarBtn.addEventListener("click", deselect);
    dom.bringForwardBtn.addEventListener("click", bringSelectedForward);
    dom.sendBackwardBtn.addEventListener("click", sendSelectedBackward);
    dom.bringToFrontBtn.addEventListener("click", bringSelectedToFront);
    dom.sendToBackBtn.addEventListener("click", sendSelectedToBack);
  }

  function bindMiniToolbar() {
    dom.miniLockBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      toggleLockSelected();
    });

    dom.miniCopyBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      duplicateSelected();
    });

    dom.miniDeleteBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      deleteSelected();
    });

    dom.miniToolbar.addEventListener("pointerdown", (evt) => {
      evt.stopPropagation();
    });
  }

  function bindTopActions() {
    const addButtons = [dom.sidebarAddTextBtn];
    const resetButtons = [dom.sidebarResetBtn];
    const pngButtons = [dom.exportPngBtn];
    const pdfButtons = [dom.exportPdfBtn];

    addButtons.forEach((btn) => btn && btn.addEventListener("click", addText));
    resetButtons.forEach((btn) => btn && btn.addEventListener("click", resetToClassic));
    pngButtons.forEach((btn) => btn && btn.addEventListener("click", exportPNG));
    pdfButtons.forEach((btn) => btn && btn.addEventListener("click", exportPDF));
  }

function bindStage() {
  dom.stage.addEventListener("pointerdown", (evt) => {
    const clickedInsideObject = evt.target.closest(".canvas-object");
    const clickedMiniToolbar = evt.target.closest(".mini-object-toolbar");
    const clickedSelectionToolbar = evt.target.closest(".selection-toolbar");
    const clickedHelp = evt.target.closest(".help-popover") || evt.target.closest(".help-btn");

    if (
      !clickedInsideObject &&
      !clickedMiniToolbar &&
      !clickedSelectionToolbar &&
      !clickedHelp
    ) {
      deselect();
    }
  });

  window.addEventListener("keydown", (evt) => {
    const item = getSelectedItem();
    if (!item) return;

    if (item.locked) {
      if (evt.key === "Escape") {
        deselect();
      }
      return;
    }

    if (state.editingId) {
      if (evt.key === "Escape") {
        evt.preventDefault();
        stopInlineEditing(true);
      }
      return;
    }

    if ((evt.key === "Backspace" || evt.key === "Delete") && item.type === "main") {
      evt.preventDefault();
      deleteSelected();
    }

    if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === "d" && item.type === "main") {
      evt.preventDefault();
      duplicateSelected();
    }

    if (evt.key === "Escape") {
      deselect();
    }
  });
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load file: ${url}`);
  }
  return await response.text();
}

async function fetchFontAsDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font: ${url}`);
  }

  const blob = await response.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseSvgRoot(svgText) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  return doc.documentElement;
}

async function loadArtworkIntoScene() {
  if (!dom.artworkLayer) {
    throw new Error("artworkLayer element was not found in the DOM.");
  }

  const cardSvgRaw = await fetchText("images/Card.svg");
  const svgRoot = parseSvgRoot(cardSvgRaw);

  dom.artworkLayer.innerHTML = svgRoot.innerHTML;
}

async function injectSceneStylesAndFonts() {
  if (!dom.sceneDefs) {
    throw new Error("sceneDefs element was not found in the DOM.");
  }

  const mainFontDataUrl = await fetchFontAsDataUrl("fonts/Mansalva-Regular.ttf");
  const tagFontDataUrl = await fetchFontAsDataUrl("fonts/RockSalt-Regular.ttf");

  dom.sceneDefs.innerHTML = `
    
    <!-- POLKA DOT PATTERN -->
    <pattern id="polkaFill" patternUnits="userSpaceOnUse" width="26" height="26">
      <rect width="26" height="26" fill="#36E1B3"></rect>

      <!-- irregular dots -->
      <circle cx="5" cy="6" r="2.4" fill="#fdf7f7"></circle>
      <circle cx="15" cy="4" r="1" fill="#fdf7f7"></circle>
      <circle cx="11" cy="13" r="2.6" fill="#f8f2f2"></circle>
      <circle cx="3" cy="17" r="1.3" fill="#fdf7f7"></circle>
      <circle cx="18" cy="16" r="2.2" fill="#fdf7f7"></circle>
    </pattern>

    <style>
      @font-face {
        font-family: 'CardMain';
        src: url('${mainFontDataUrl}') format('truetype');
      }

      @font-face {
        font-family: 'CardTag';
        src: url('${tagFontDataUrl}') format('truetype');
      }

      .scene-main-text {
        fill: url(#polkaFill);
        stroke: #443259;
        stroke-width: 10px;
        paint-order: stroke fill;
        font-family: 'CardMain', Arial, sans-serif;
        text-anchor: middle;
        dominant-baseline: middle;
      }

      .scene-tag-text {
        fill: #7c4765;
        font-family: 'CardTag', Arial, sans-serif;
        text-anchor: middle;
      }
    </style>
  `;
}

function getSvgViewBox(svgEl) {
  const viewBox = svgEl.getAttribute("viewBox");

  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    return {
      minX: parts[0],
      minY: parts[1],
      width: parts[2],
      height: parts[3],
    };
  }

  const width = Number(svgEl.getAttribute("width")) || ART_BOUNDS.width;
  const height = Number(svgEl.getAttribute("height")) || ART_BOUNDS.height;

  return {
    minX: 0,
    minY: 0,
    width,
    height,
  };
}

async function loadArtworkInline() {
  // 1. Load SVG file as text
  const svgText = await fetchText("images/Card.svg");

  // 2. Parse it into a DOM element
  const svgDoc = parseSvgRoot(svgText);

  // 3. Take everything inside the SVG (not the <svg> itself)
  const innerContent = svgDoc.innerHTML;

  // 4. Inject into your main SVG
  const artworkLayer = document.getElementById("artworkLayer");
  artworkLayer.innerHTML = innerContent;
}

function buildMainSceneMarkup(item) {
  const text = normalizeEditableText(item.text);
  const width = Math.max(160, item.width || 300);
  const fontSize = Math.max(1, item.fontSize || 80);
  const bend = item.bend || 0;
  const letterSpacing = item.letterSpacing || 0;
  const rotation = item.rotation || 0;

  const topPad = fontSize * 0.78 + Math.max(0, bend * 0.55);
  const bottomPad = fontSize * 0.72 + Math.max(0, -bend * 0.55);
  const height = topPad + bottomPad;

  const baseline = topPad - height / 2;
  const controlY = baseline - bend;

  const paddingX = 22;
  const startX = -width / 2 + paddingX;
  const endX = width / 2 - paddingX;

  const pathId = `scene-path-${item.id}`;

  return `
    <g
      class="scene-item scene-main-item"
      data-id="${item.id}"
      transform="translate(${item.x} ${item.y}) rotate(${rotation})"
    >
      <defs>
        <path
          id="${pathId}"
          d="M ${startX} ${baseline} Q 0 ${controlY} ${endX} ${baseline}"
        />
      </defs>

      <text
        class="scene-main-text"
        font-size="${fontSize}"
        letter-spacing="${letterSpacing}"
      >
        <textPath href="#${pathId}" startOffset="50%" text-anchor="middle">
          ${escapeXml(text)}
        </textPath>
      </text>
    </g>
  `;
}

function buildTagSceneMarkup(item) {
  const rawText = (item.text || "").trim();
  const lines = rawText ? rawText.split("\n") : [""];

  const fontSize = Math.max(1, item.fontSize || 15);
  const lineHeightValue = item.lineHeight || 1.05;
  const lineHeightPx = lineHeightValue * fontSize;
  const letterSpacing = item.letterSpacing || 0;
  const rotation = item.rotation || 0;

  const totalHeight = (lines.length - 1) * lineHeightPx;
  const startY = -totalHeight / 2;

  const tspans = lines
    .map((line, index) => {
      const y = startY + index * lineHeightPx;
      return `<tspan x="0" y="${y}">${escapeXml(line || " ")}</tspan>`;
    })
    .join("");

  return `
    <g
      class="scene-item scene-tag-item"
      data-id="${item.id}"
      transform="translate(${item.x} ${item.y}) rotate(${rotation})"
    >
      <text
        class="scene-tag-text"
        font-size="${fontSize}"
        letter-spacing="${letterSpacing}"
        text-anchor="middle"
        dominant-baseline="middle"
      >
        ${tspans}
      </text>
    </g>
  `;
}

function serializeSceneSvg() {
  if (!dom.scene) {
    throw new Error("cardScene SVG was not found.");
  }

  const clone = dom.scene.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(DESIGN_WIDTH));
  clone.setAttribute("height", String(DESIGN_HEIGHT));
  clone.setAttribute("viewBox", `0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`);

  return new XMLSerializer().serializeToString(clone);
}

async function renderSceneToCanvas(scale = 2) {
  const svgText = serializeSceneSvg();
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load serialized SVG into image."));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = DESIGN_WIDTH * scale;
    canvas.height = DESIGN_HEIGHT * scale;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function exportPNG() {
  const previousSelected = state.selectedId;

  if (state.editingId) {
    stopInlineEditing(true);
  }

  dom.stage.classList.add("export-clean");
  state.selectedId = null;
  render();

  try {
    await waitForFonts();
    const canvas = await renderSceneToCanvas(2);
    const url = canvas.toDataURL("image/png");
    downloadDataUrl(url, "mable-valentine.png");
  } finally {
    dom.stage.classList.remove("export-clean");
    state.selectedId = previousSelected;
    render();
  }
}

async function exportPDF() {
  const previousSelected = state.selectedId;

  if (state.editingId) {
    stopInlineEditing(true);
  }

  dom.stage.classList.add("export-clean");
  state.selectedId = null;
  render();

  try {
    await waitForFonts();
    const canvas = await renderSceneToCanvas(2);
    const img = canvas.toDataURL("image/png");

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(img, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save("mable-valentine.pdf");
  } finally {
    dom.stage.classList.remove("export-clean");
    state.selectedId = previousSelected;
    render();
  }
}

  function downloadDataUrl(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function waitForFonts() {
    if (document.fonts && document.fonts.ready) {
      return document.fonts.ready;
    }
    return Promise.resolve();
  }

async function init() {
  bindTopActions();
  bindToolbar();
  bindMiniToolbar();
  bindStage();
  bindHelp();

  window.addEventListener("resize", syncOverlayScale);

  await loadArtworkIntoScene();
  await injectSceneStylesAndFonts();

  resetToClassic(false);
  await waitForFonts();
  render();
}

  init();
})();

function scaleApp() {
  const baseWidth = 1440;
  const scale = Math.min(window.innerWidth / baseWidth, 1);

  const app = document.querySelector(".app-shell");
  if (!app) return;

  app.style.transform = `scale(${scale})`;
}

function checkScreenSize() {
  const warning = document.querySelector(".screen-warning");
  if (!warning) return;

  if (window.innerWidth < 1400) {
    warning.style.display = "flex";
  } else {
    warning.style.display = "none";
  }
}

function handleViewportChange() {
  scaleApp();
  checkScreenSize();
}

window.addEventListener("resize", handleViewportChange);
window.addEventListener("load", handleViewportChange);