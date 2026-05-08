const API_URL = "/api/memo";
let currentFolder = "";

function folderClass(folder) {
  const map = {
    "IDEA": "folder-idea",
    "MEMO": "folder-memo",
    "TO DO": "folder-todo",
    "SCHEDULE": "folder-schedule",
    "ARCHIVE": "folder-archive",
  };
  return map[folder] || "";
}

function renderMemoContent(text, memoId) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("[x] ")) {
      return '<div class="memo-line-check checked">' +
        '<input type="checkbox" checked data-memo-id="' + memoId + '" data-line="' + i + '">' +
        '<span>' + escapeHtml(line.slice(4)) + '</span></div>';
    }
    if (line.startsWith("[] ")) {
      return '<div class="memo-line-check">' +
        '<input type="checkbox" data-memo-id="' + memoId + '" data-line="' + i + '">' +
        '<span>' + escapeHtml(line.slice(3)) + '</span></div>';
    }
    if (line.startsWith("- ") || line.startsWith("• ")) {
      return '<div class="memo-line-bullet"><span>' + escapeHtml(line.slice(2)) + '</span></div>';
    }
    if (line.trim() === "") return "";
    return '<div class="memo-line-text">' + escapeHtml(line) + '</div>';
  }).join("");
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// === タブ切り替え ===
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".folder-icon").forEach((f) => f.classList.remove("active"));
    tab.classList.add("active");
    currentFolder = tab.dataset.folder;
    loadMemos();
  });
});

// === サイドバーフォルダ ===
document.querySelectorAll(".folder-icon").forEach((folder) => {
  folder.addEventListener("click", () => {
    const f = folder.dataset.folder;
    if (currentFolder === f) {
      currentFolder = "";
      folder.classList.remove("active");
      document.querySelectorAll(".tab").forEach((t) => {
        t.classList.toggle("active", t.dataset.folder === "");
      });
    } else {
      currentFolder = f;
      document.querySelectorAll(".folder-icon").forEach((fi) => fi.classList.remove("active"));
      document.querySelectorAll(".tab").forEach((t) => {
        t.classList.toggle("active", t.dataset.folder === f);
      });
      folder.classList.add("active");
    }
    loadMemos();
  });

  // PC: ドロップ先
  folder.addEventListener("dragover", (e) => {
    e.preventDefault();
    folder.classList.add("drag-over");
  });
  folder.addEventListener("dragleave", () => {
    folder.classList.remove("drag-over");
  });
  folder.addEventListener("drop", async (e) => {
    e.preventDefault();
    folder.classList.remove("drag-over");
    const memoId = e.dataTransfer.getData("text/plain");
    const targetFolder = folder.dataset.folder;
    if (memoId && targetFolder) {
      await updateMemoFolder(memoId, targetFolder);
      await loadMemos();
    }
  });
});

// === 書式ボタン ===
document.getElementById("btnCheckbox").addEventListener("click", () => {
  const input = document.getElementById("memoInput");
  const pos = input.selectionStart;
  const val = input.value;
  const before = val.substring(0, pos);
  const after = val.substring(pos);
  const prefix = pos === 0 || before.endsWith("\n") ? "[] " : "\n[] ";
  input.value = before + prefix + after;
  input.focus();
  const newPos = pos + prefix.length;
  input.setSelectionRange(newPos, newPos);
  autoResize(input);
});

document.getElementById("btnBullet").addEventListener("click", () => {
  const input = document.getElementById("memoInput");
  const pos = input.selectionStart;
  const val = input.value;
  const before = val.substring(0, pos);
  const after = val.substring(pos);
  const prefix = pos === 0 || before.endsWith("\n") ? "- " : "\n- ";
  input.value = before + prefix + after;
  input.focus();
  const newPos = pos + prefix.length;
  input.setSelectionRange(newPos, newPos);
  autoResize(input);
});

// === テキストエリア自動リサイズ ===
const memoInput = document.getElementById("memoInput");
memoInput.addEventListener("input", () => autoResize(memoInput));

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 100) + "px";
}

// === メモ送信 ===
document.getElementById("sendBtn").addEventListener("click", sendMemo);
memoInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    sendMemo();
  }
});

async function sendMemo() {
  const input = document.getElementById("memoInput");
  const folder = document.getElementById("folderSelect").value;
  const memo = input.value.trim();
  if (!memo) return;

  input.value = "";
  input.style.height = "auto";
  document.getElementById("sendBtn").disabled = true;

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo, folder }),
    });
    await loadMemos();
  } catch (err) {
    console.error("送信エラー:", err);
  } finally {
    document.getElementById("sendBtn").disabled = false;
    input.focus();
  }
}

// === フォルダ移動 ===
async function updateMemoFolder(memoId, newFolder) {
  try {
    await fetch(API_URL, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: memoId, folder: newFolder }),
    });
  } catch (err) {
    console.error("フォルダ移動エラー:", err);
  }
}

// === 長押しでフォルダ移動メニュー（スマホ対応） ===
function showMoveMenu(memoId, currentMemoFolder) {
  // 既存メニューがあれば削除
  const old = document.getElementById("moveMenu");
  if (old) old.remove();

  const folders = ["IDEA", "MEMO", "TO DO", "SCHEDULE", "ARCHIVE"];
  const menu = document.createElement("div");
  menu.id = "moveMenu";
  menu.className = "move-menu";
  menu.innerHTML = '<div class="move-menu-title">移動先を選択</div>' +
    folders.map((f) => {
      const active = f === currentMemoFolder ? " active" : "";
      return '<button class="move-menu-btn' + active + '" data-folder="' + f + '">' +
        (f === "ARCHIVE" ? "🗑️ ARCHIVE" : f) + '</button>';
    }).join("") +
    '<button class="move-menu-cancel">キャンセル</button>';

  document.body.appendChild(menu);

  // フォルダ選択
  menu.querySelectorAll(".move-menu-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetFolder = btn.dataset.folder;
      if (targetFolder !== currentMemoFolder) {
        await updateMemoFolder(memoId, targetFolder);
        await loadMemos();
      }
      menu.remove();
    });
  });

  // キャンセル
  menu.querySelector(".move-menu-cancel").addEventListener("click", () => {
    menu.remove();
  });

  // 背景タップで閉じる
  menu.addEventListener("click", (e) => {
    if (e.target === menu) menu.remove();
  });
}

// === チェックボックス切り替え ===
async function toggleCheckInMemo(memoId, lineIndex) {
  try {
    const res = await fetch(API_URL + "?single=" + memoId);
    const memos = await res.json();
    const memo = memos.find((m) => m.id === memoId);
    if (!memo) return;

    const lines = memo.memo.split("\n");
    if (lines[lineIndex] && lines[lineIndex].startsWith("[] ")) {
      lines[lineIndex] = "[x] " + lines[lineIndex].slice(3);
    } else if (lines[lineIndex] && lines[lineIndex].startsWith("[x] ")) {
      lines[lineIndex] = "[] " + lines[lineIndex].slice(4);
    }

    await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: memoId, text: lines.join("\n") }),
    });
    await loadMemos();
  } catch (err) {
    console.error("チェック更新エラー:", err);
  }
}

// === メモ一覧読み込み ===
async function loadMemos() {
  const list = document.getElementById("memoList");
  list.innerHTML = "<div style='text-align:center;color:#aaa;padding:20px;'>読み込み中...</div>";

  try {
    const params = currentFolder ? "?folder=" + encodeURIComponent(currentFolder) : "";
    const res = await fetch(API_URL + params);
    let memos = await res.json();

    if (!currentFolder) {
      memos = memos.filter((m) => m.folder !== "ARCHIVE");
    }

    if (memos.length === 0) {
      list.innerHTML = "<div style='text-align:center;color:#aaa;padding:20px;'>メモがありません</div>";
      return;
    }

    const sorted = memos.reverse();

    list.innerHTML = sorted
      .map((m) => {
        const date = new Date(m.created);
        const time = date.toLocaleString("ja-JP", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const cssClass = folderClass(m.folder);
        const content = renderMemoContent(m.memo, m.id);

        return '<div class="memo-item ' + cssClass + '" draggable="true" data-id="' + m.id + '" data-folder="' + m.folder + '">' +
          '<div class="memo-folder">' + m.folder + '</div>' +
          '<div class="memo-content">' + content + '</div>' +
          '<div class="memo-time">' + time + '</div>' +
          '</div>';
      })
      .join("");

    // PC: ドラッグ
    list.querySelectorAll(".memo-item").forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", item.dataset.id);
        item.classList.add("dragging");
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
      });

      // スマホ: 長押し
      let pressTimer;
      item.addEventListener("touchstart", (e) => {
        pressTimer = setTimeout(() => {
          showMoveMenu(item.dataset.id, item.dataset.folder);
        }, 500);
      });
      item.addEventListener("touchend", () => {
        clearTimeout(pressTimer);
      });
      item.addEventListener("touchmove", () => {
        clearTimeout(pressTimer);
      });
    });

    // チェックボックス
    list.querySelectorAll(".memo-line-check input").forEach((cb) => {
      cb.addEventListener("change", () => {
        const memoId = cb.dataset.memoId;
        const lineIndex = parseInt(cb.dataset.line, 10);
        toggleCheckInMemo(memoId, lineIndex);
      });
    });

    list.scrollTop = list.scrollHeight;
  } catch (err) {
    list.innerHTML = "<div style='text-align:center;color:#aaa;padding:20px;'>読み込みエラー</div>";
    console.error("読み込みエラー:", err);
  }
}

loadMemos();
